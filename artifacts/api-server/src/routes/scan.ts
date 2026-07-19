import { Router, type IRouter, type Request, type Response } from "express";
import { createHash } from "crypto";
import { db } from "@workspace/db";
import { transactions, documents, scan_results } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── Shingling helpers ────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function makeShingles(words: string[], k = 6): Set<string> {
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(" "));
  }
  return shingles;
}

function computeContainment(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const s of setA) {
    if (setB.has(s)) shared++;
  }
  return (shared / Math.min(setA.size, setB.size)) * 100;
}

interface LocalMatch {
  documentId: string;
  title: string;
  containment: number;
  sharedCount: number;
}

function computeLocalOverlap(
  newWords: string[],
  newShingles: Set<string>,
  matchedShingleSets: Set<string>[],
): number {
  if (newWords.length === 0 || matchedShingleSets.length === 0) return 0;

  // Collect all shingles that matched at least one stored document
  const matchedShingles = new Set<string>();
  for (const stored of matchedShingleSets) {
    for (const s of newShingles) {
      if (stored.has(s)) matchedShingles.add(s);
    }
  }

  if (matchedShingles.size === 0) return 0;

  // Count words in new doc that appear in at least one matched shingle
  const matchedWords = new Set<string>();
  for (const shingle of matchedShingles) {
    for (const word of shingle.split(" ")) {
      matchedWords.add(word);
    }
  }

  let matchedWordCount = 0;
  for (const word of newWords) {
    if (matchedWords.has(word)) matchedWordCount++;
  }

  return Math.round((matchedWordCount / newWords.length) * 100);
}

// ── Anthropic web search helpers ─────────────────────────────────────────────

interface WebSearchResult {
  matched: boolean;
  source_url: string | null;
  source_title: string | null;
  confidence: number;
  note: string;
  sentence: string;
}

async function checkSentenceOnline(
  sentence: string,
): Promise<WebSearchResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      matched: false,
      source_url: null,
      source_title: null,
      confidence: 0,
      note: "ANTHROPIC_API_KEY not set",
      sentence,
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system:
          'You are a plagiarism-detection assistant with web search access. Search the web to check if this sentence already exists online. Respond with ONLY a JSON object: {"matched": boolean, "source_url": string|null, "source_title": string|null, "confidence": number 0-100, "note": string}',
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          },
        ],
        messages: [
          {
            role: "user",
            content: sentence,
          },
        ],
      }),
    });

    if (!response.ok) {
      logger.error(
        { status: response.status },
        "Anthropic API returned non-ok status",
      );
      return {
        matched: false,
        source_url: null,
        source_title: null,
        confidence: 0,
        note: `API error ${response.status}`,
        sentence,
      };
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    // Find the text block in response (after tool use)
    const textBlock = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    // Extract JSON from the text
    const jsonMatch = textBlock.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        matched: false,
        source_url: null,
        source_title: null,
        confidence: 0,
        note: "Could not parse response",
        sentence,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      matched?: boolean;
      source_url?: string | null;
      source_title?: string | null;
      confidence?: number;
      note?: string;
    };

    return {
      matched: parsed.matched ?? false,
      source_url: parsed.source_url ?? null,
      source_title: parsed.source_title ?? null,
      confidence: parsed.confidence ?? 0,
      note: parsed.note ?? "",
      sentence,
    };
  } catch (err) {
    logger.error({ err }, "Anthropic web search failed");
    return {
      matched: false,
      source_url: null,
      source_title: null,
      confidence: 0,
      note: "Request failed",
      sentence,
    };
  }
}

function extractCandidateSentences(content: string, max = 5): string[] {
  // Split by sentence-ending punctuation
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      const words = tokenize(s);
      return words.length >= 7;
    });

  // Sort by length descending, take top max
  sentences.sort((a, b) => b.length - a.length);
  return sentences.slice(0, max);
}

// ── POST /api/scan ────────────────────────────────────────────────────────────

router.post("/scan", async (req: Request, res: Response) => {
  try {
    const { orderId, title, content } = req.body as {
      orderId?: string;
      title?: string;
      content?: string;
    };

    if (!orderId || !title || !content) {
      res.status(400).json({ error: "orderId, title, and content are required" });
      return;
    }

    // 1. Verify transaction is paid
    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.order_id, orderId))
      .limit(1);

    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    if (tx.status !== "paid") {
      res.status(402).json({
        error: "Payment required. Transaction status: " + tx.status,
      });
      return;
    }

    // 2. Load existing documents (limit 2000, ordered by created_at asc)
    const existingDocs = await db
      .select()
      .from(documents)
      .orderBy(asc(documents.created_at))
      .limit(2000);

    // 3. Shingling comparison
    const newWords = tokenize(content);
    const newShingles = makeShingles(newWords);

    const localMatches: LocalMatch[] = [];
    const matchedShingleSetsForOverlap: Set<string>[] = [];

    for (const doc of existingDocs) {
      const docWords = tokenize(doc.content);
      const docShingles = makeShingles(docWords);
      const containment = computeContainment(newShingles, docShingles);

      let shared = 0;
      for (const s of newShingles) {
        if (docShingles.has(s)) shared++;
      }

      if (containment > 0) {
        localMatches.push({
          documentId: doc.id,
          title: doc.title,
          containment: Math.round(containment),
          sharedCount: shared,
        });
        matchedShingleSetsForOverlap.push(docShingles);
      }
    }

    // Sort by containment desc
    localMatches.sort((a, b) => b.containment - a.containment);

    // 4. Compute local overlap percent
    const localOverlapPercent = computeLocalOverlap(
      newWords,
      newShingles,
      matchedShingleSetsForOverlap,
    );

    // 5. Web search via Anthropic for top 5 longest sentences
    const candidateSentences = extractCandidateSentences(content, 5);
    const webResults: WebSearchResult[] = await Promise.all(
      candidateSentences.map((s) => checkSentenceOnline(s)),
    );

    // 6. Compute webMatchPercent
    const totalWords = newWords.length;
    let webMatchedWordCount = 0;

    for (const result of webResults) {
      if (result.matched) {
        const sentenceWords = tokenize(result.sentence);
        webMatchedWordCount += sentenceWords.length;
      }
    }

    const webMatchPercent =
      totalWords > 0
        ? Math.round((webMatchedWordCount / totalWords) * 100)
        : 0;

    // 7. Compute originality score
    const rawScore = 100 - Math.max(localOverlapPercent, webMatchPercent);
    const originalityScore = Math.max(0, Math.min(100, rawScore));

    // 8. Save document to DB
    const contentHash = createHash("sha256")
      .update(content.toLowerCase().trim())
      .digest("hex");

    const [insertedDoc] = await db
      .insert(documents)
      .values({
        transaction_id: tx.id,
        title,
        content,
        content_hash: contentHash,
      })
      .returning();

    // 9. Save scan result
    await db.insert(scan_results).values({
      transaction_id: tx.id,
      document_id: insertedDoc.id,
      originality_score: originalityScore,
      local_overlap_percent: localOverlapPercent,
      web_match_percent: webMatchPercent,
      details: {
        localMatches: localMatches.slice(0, 20), // store top 20 for details
        webResults,
        candidateSentences,
      },
    });

    res.json({
      documentId: insertedDoc.id,
      originalityScore,
      localOverlapPercent,
      webMatchPercent,
      localMatches,
      webResults,
    });
  } catch (err) {
    logger.error({ err }, "scan error");
    res.status(500).json({ error: "Scan failed" });
  }
});

export default router;
