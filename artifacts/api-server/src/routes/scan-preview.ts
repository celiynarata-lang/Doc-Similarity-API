import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { documents } from "@workspace/db";
import { asc } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  tokenize,
  countSentences,
  compareAgainstStored,
  computeLocalOverlap,
} from "../lib/similarity";

const router: IRouter = Router();

// POST /api/scan/preview
// Free preview — no payment check, no web search, no document save
router.post("/scan/preview", async (req: Request, res: Response) => {
  try {
    const { content } = req.body as { content?: string };

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const words = tokenize(content);
    const wordCount = words.length;
    const sentenceCount = countSentences(content);

    // Load existing documents for comparison (limit 2000)
    const existingDocs = await db
      .select({ id: documents.id, title: documents.title, content: documents.content })
      .from(documents)
      .orderBy(asc(documents.created_at))
      .limit(2000);

    const { newWords, newShingles, matchedShingleSets } = compareAgainstStored(
      content,
      existingDocs,
    );

    const localOverlapPercent = computeLocalOverlap(
      newWords,
      newShingles,
      matchedShingleSets,
    );

    res.json({ wordCount, sentenceCount, localOverlapPercent });
  } catch (err) {
    logger.error({ err }, "scan preview error");
    res.status(500).json({ error: "Preview failed" });
  }
});

export default router;
