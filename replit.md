# Layanan Cek Kemiripan Dokumen

API backend berbayar untuk layanan pengecekan kemiripan/plagiarisme dokumen, mengintegrasikan Midtrans payment gateway dan Anthropic AI web search.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — jalankan API server (port dari env PORT, default 3000)
- `pnpm run typecheck` — typecheck seluruh workspace
- `pnpm run build` — typecheck + build semua package
- `pnpm --filter @workspace/api-spec run codegen` — regenerasi API hooks dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `MIDTRANS_SERVER_KEY` — Midtrans server key
- `MIDTRANS_CLIENT_KEY` — Midtrans client key
- `MIDTRANS_IS_PRODUCTION` — "true" untuk production, "false" untuk sandbox
- `ANTHROPIC_API_KEY` — Anthropic API key untuk web search plagiarism check
- `PRICE_PER_SCAN` — harga per scan dalam Rupiah (default: 15000)
- `FRONTEND_URL` — URL frontend untuk CORS (contoh: https://myapp.com)
- `PORT` — port server (default: 3000)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Payment: Midtrans Snap (`midtrans-client`)
- AI: Anthropic API (claude-sonnet-5) dengan web_search tool
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/api-server/src/routes/payment.ts` — endpoint payment (create-transaction, notification, status)
- `artifacts/api-server/src/routes/scan.ts` — endpoint scan kemiripan dokumen
- `artifacts/api-server/src/lib/migrate.ts` — migration script (CREATE TABLE IF NOT EXISTS), dijalankan otomatis saat server start
- `lib/db/src/schema/` — Drizzle schema untuk 3 tabel

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | /health | Health check |
| GET | /api/healthz | Health check (legacy) |
| POST | /api/payment/create-transaction | Buat transaksi Midtrans baru |
| POST | /api/payment/notification | Webhook notifikasi Midtrans |
| GET | /api/payment/status/:orderId | Cek status transaksi |
| POST | /api/scan | Scan kemiripan dokumen |

## Database Tables

- `transactions` — menyimpan data transaksi pembayaran
- `documents` — menyimpan dokumen yang di-scan (dipakai sebagai corpus lokal)
- `scan_results` — menyimpan hasil scan per transaksi

## Architecture decisions

- Migration dijalankan dengan raw SQL (`CREATE TABLE IF NOT EXISTS`) via pg Pool saat server startup — lebih simpel dari Drizzle push untuk deployment
- Shingling 6-kata dengan metric containment (bukan Jaccard) karena lebih sensitif terhadap dokumen pendek
- Anthropic web search dipanggil untuk maks 5 kalimat terpanjang (min 7 kata) untuk menghemat API cost
- CORS dikonfigurasi dari `FRONTEND_URL` env var; jika tidak di-set, mengizinkan semua origin

## User preferences

_Populate as you build._

## Gotchas

- Pastikan run `pnpm --filter @workspace/api-server run dev` (bukan root-level `pnpm dev`)
- Migration otomatis dijalankan saat startup, tidak perlu manual SQL
- Midtrans notification endpoint harus bisa diakses dari internet (perlu public URL)
- Model Anthropic di scan.ts: `claude-sonnet-5`
