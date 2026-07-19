import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { transactions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const midtransClient = require("midtrans-client");

const router: IRouter = Router();

function getMidtransSnap() {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return new midtransClient.Snap({
    isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
  }) as {
    createTransaction: (params: unknown) => Promise<{ token: string; redirect_url: string }>;
    transaction: {
      notification: (body: unknown) => Promise<{
        order_id: string;
        transaction_status: string;
        fraud_status?: string;
        transaction_id?: string;
      }>;
    };
  };
}

// POST /api/payment/create-transaction
router.post(
  "/payment/create-transaction",
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email) {
        res.status(400).json({ error: "email is required" });
        return;
      }

      const orderId = `SCAN-${randomUUID()}`;
      const amount = parseInt(process.env.PRICE_PER_SCAN ?? "15000", 10);

      const snap = getMidtransSnap();

      const snapResponse = await snap.createTransaction({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        customer_details: {
          email,
        },
      });

      // Insert transaction after successful Midtrans call
      await db.insert(transactions).values({
        order_id: orderId,
        user_email: email,
        amount,
        status: "pending",
      });

      res.json({
        orderId,
        snapToken: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
      });
    } catch (err) {
      logger.error({ err }, "create-transaction error");
      res.status(500).json({ error: "Failed to create transaction" });
    }
  },
);

// POST /api/payment/notification
router.post("/payment/notification", async (req: Request, res: Response) => {
  try {
    const snap = getMidtransSnap();
    const notification = await snap.transaction.notification(req.body);

    const {
      order_id,
      transaction_status,
      fraud_status,
      transaction_id: midtransTransactionId,
    } = notification;

    let newStatus: string | null = null;
    let paidAt: Date | null = null;

    if (
      (transaction_status === "settlement" ||
        transaction_status === "capture") &&
      fraud_status === "accept"
    ) {
      newStatus = "paid";
      paidAt = new Date();
    } else if (
      transaction_status === "deny" ||
      transaction_status === "cancel"
    ) {
      newStatus = "failed";
    } else if (transaction_status === "expire") {
      newStatus = "expired";
    }

    if (newStatus) {
      if (paidAt) {
        await db
          .update(transactions)
          .set({
            status: newStatus,
            midtrans_transaction_id: midtransTransactionId ?? null,
            paid_at: paidAt,
          })
          .where(eq(transactions.order_id, order_id));
      } else {
        await db
          .update(transactions)
          .set({
            status: newStatus,
            midtrans_transaction_id: midtransTransactionId ?? null,
          })
          .where(eq(transactions.order_id, order_id));
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error({ err }, "payment notification error");
    res.status(500).json({ error: "Failed to process notification" });
  }
});

// GET /api/payment/status/:orderId
router.get(
  "/payment/status/:orderId",
  async (req: Request, res: Response) => {
    try {
      const orderId = String(req.params.orderId);
      const [tx] = await db
        .select({ status: transactions.status })
        .from(transactions)
        .where(eq(transactions.order_id, orderId))
        .limit(1);

      if (!tx) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      res.json({ status: tx.status });
    } catch (err) {
      logger.error({ err }, "payment status error");
      res.status(500).json({ error: "Failed to get transaction status" });
    }
  },
);

export default router;
