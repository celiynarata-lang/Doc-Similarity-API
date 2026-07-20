import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { documents, scan_results, transactions } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /api/scan/history?email=xxx
router.get("/scan/history", async (req: Request, res: Response) => {
  try {
    const { email } = req.query as { email?: string };

    if (!email || email.trim().length === 0) {
      res.status(400).json({ error: "email query parameter is required" });
      return;
    }

    const rows = await db
      .select({
        documentTitle: documents.title,
        originalityScore: scan_results.originality_score,
        scanDate: scan_results.created_at,
      })
      .from(scan_results)
      .innerJoin(documents, eq(scan_results.document_id, documents.id))
      .innerJoin(transactions, eq(scan_results.transaction_id, transactions.id))
      .where(eq(transactions.user_email, email.trim()))
      .orderBy(desc(scan_results.created_at));

    const result = rows.map((r) => ({
      documentTitle: r.documentTitle,
      originalityScore: r.originalityScore,
      scanDate: r.scanDate.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    logger.error({ err }, "scan history error");
    res.status(500).json({ error: "Failed to get scan history" });
  }
});

export default router;
