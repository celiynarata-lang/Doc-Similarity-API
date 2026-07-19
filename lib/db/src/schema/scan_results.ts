import { pgTable, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { transactions } from "./transactions";
import { documents } from "./documents";

export const scan_results = pgTable("scan_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  transaction_id: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id),
  document_id: uuid("document_id")
    .notNull()
    .references(() => documents.id),
  originality_score: integer("originality_score").notNull(),
  local_overlap_percent: integer("local_overlap_percent").notNull(),
  web_match_percent: integer("web_match_percent").notNull(),
  details: jsonb("details"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type ScanResult = typeof scan_results.$inferSelect;
export type InsertScanResult = typeof scan_results.$inferInsert;
