import { Router, type IRouter, type Request, type Response } from "express";
import { createHash } from "crypto";
import { db } from "@workspace/db";
import { transactions, documents, scan_results } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  compareAgainstStored,
  computeLocalOverlap,
} from "../lib/similarity";

const router: IRouter = Router();

// ── Candidate sentences for web search ───────────────────────────────────────

function tokenizeWords(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
}

function extractCandidateSentences(content: string, max = 5): string[] {
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => tokenizeWords(s).length >= 7);
  sentences.sort((a, b) => b.length - a.length);
  return sentences.slice(0, max);
}

// ── Anthropic web search ──────────────────────────────────────────────────────

interface WebSearchResult {
  matched: boolean;
  source_url: string | null;
  source_title: string | null;
  confidence: number;
  note: string;
  sentence: string;
}

async function checkSentenceOnline(sentence: string): Promise<WebSearchResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { matched: false, source_url: null, source_title: null, confidence: 0, note: "ANTHROPIC_API_KEY not set", sentence };
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
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system:
          'You are a plagiarism-detection assistant with web search access. Search the web to check if this sentence already exists online. Respond with ONLY a JSON object: {"matched": boolean, "source_url": string|null, "source_title": string|null, "confidence": number 0-100, "note": string}',
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: sentence }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error({ status: response.status, body: errorBody }, "Anthropic API returned non-ok status");
      return { matched: false, source_url: null, source_title: null, confidence: 0, note: `API error ${response.status}`, sentence };
    }

    const data = (await response.json()) as { content: Array<{ type: string; text?: string }> };
    const textBlock = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    const jsonMatch = textBlock.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { matched: false, source_url: null, source_title: null, confidence: 0, note: "Could not parse response", sentence };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      matched?: boolean; source_url?: string | null; source_title?: string | null; confidence?: number; note?: string;
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
    return { matched: false, source_url: null, source_title: null, confidence: 0, note: "Request failed", sentence };
  }
}

// ── POST /api/scan ─────────────────────────────────────────────────────────────

router.post("/scan", async (req: Request, res: Response) => {
  try {
    const { orderId, title, content } = req.body as { orderId?: string; title?: string; content?: string };

    if (!orderId || !title || !content) {
      res.status(400).json({ error: "orderId, title, and content are required" });
      return;
    }

    // 1. Verify transaction is paid and has remaining credits
    const [tx] = await db.select().from(transactions).where(eq(transactions.order_id, orderId)).limit(1);
    if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
    if (tx.status !== "paid") { res.status(402).json({ error: "Payment required. Transaction status: " + tx.status }); return; }
    if (tx.scan_credits_remaining <= 0) {
      res.status(402).json({ error: "Kredit scan habis, silakan beli paket baru" });
      return;
    }

    // 2. Load existing documents
    const existingDocs = await db
      .select({ id: documents.id, title: documents.title, content: documents.content })
      .from(documents)
      .orderBy(asc(documents.created_at))
      .limit(2000);

    // 3. Local shingling comparison
    const { newWords, newShingles, localMatches, matchedShingleSets } =
      compareAgainstStored(content, existingDocs);

    // 4. Local overlap percent
    const localOverlapPercent = computeLocalOverlap(newWords, newShingles, matchedShingleSets);

    // 5. Web search via Anthropic
    const candidateSentences = extractCandidateSentences(content, 5);
    const webResults: WebSearchResult[] = await Promise.all(
      candidateSentences.map((s) => checkSentenceOnline(s)),
    );

    // 6. Web match percent
    const totalWords = newWords.length;
    let webMatchedWordCount = 0;
    for (const result of webResults) {
      if (result.matched) {
        webMatchedWordCount += tokenizeWords(result.sentence).length;
      }
    }
    const webMatchPercent = totalWords > 0 ? Math.round((webMatchedWordCount / totalWords) * 100) : 0;

    // 7. Originality score
    const originalityScore = Math.max(0, Math.min(100, 100 - Math.max(localOverlapPercent, webMatchPercent)));

    // 8. Decrement scan credits atomically
    await db
      .update(transactions)
      .set({ scan_credits_remaining: sql`${transactions.scan_credits_remaining} - 1` })
      .where(eq(transactions.order_id, orderId));

    // 9. Save document
    const contentHash = createHash("sha256").update(content.toLowerCase().trim()).digest("hex");
    const [insertedDoc] = await db.insert(documents).values({ transaction_id: tx.id, title, content, content_hash: contentHash }).returning();

    // 10. Save scan result
    await db.insert(scan_results).values({
      transaction_id: tx.id,
      document_id: insertedDoc.id,
      originality_score: originalityScore,
      local_overlap_percent: localOverlapPercent,
      web_match_percent: webMatchPercent,
      details: { localMatches: localMatches.slice(0, 20), webResults, candidateSentences },
    });

    res.json({ documentId: insertedDoc.id, originalityScore, localOverlapPercent, webMatchPercent, localMatches, webResults });
  } catch (err) {
    logger.error({ err }, "scan error");
    res.status(500).json({ error: "Scan failed" });
  }
});

export default router;
