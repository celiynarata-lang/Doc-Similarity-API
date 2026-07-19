import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { transactions } from "./transactions";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  transaction_id: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  content_hash: text("content_hash").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
