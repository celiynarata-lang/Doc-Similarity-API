import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  order_id: text("order_id").unique().notNull(),
  user_email: text("user_email").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  midtrans_transaction_id: text("midtrans_transaction_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  paid_at: timestamp("paid_at"),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
