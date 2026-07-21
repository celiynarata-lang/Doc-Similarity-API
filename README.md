# AJOR.Scan — Layanan Cek Kemiripan Dokumen (Berbayar)

Project ini adalah layanan cek kemiripan/orisinalitas dokumen (mirip Turnitin) berbasis web, dengan alur:
preview gratis → pembayaran Midtrans → scan penuh (database lokal + web search via Anthropic) → hasil + riwayat.

## Struktur Folder

- `artifacts/api-server/` — backend Express + PostgreSQL (Drizzle), integrasi Midtrans & Anthropic
- `artifacts/web-app/` — frontend React (Vite) untuk landing page dan halaman scan
- `lib/db/` — schema Drizzle (PostgreSQL) untuk `transactions`, `documents`, `scan_results`
- `lib/api-spec/` — OpenAPI spec (`openapi.yaml`) sebagai kontrak API
- `lib/api-client-react/` — React Query hooks & types hasil codegen dari OpenAPI

## Prasyarat

- Node.js (disarankan versi terbaru LTS yang kompatibel dengan workspace)
- pnpm
- PostgreSQL

## Instalasi

```bash
pnpm install
```

## Environment Variables

### Backend (`artifacts/api-server`)

Salin env template:

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Lalu isi nilainya sesuai environment Anda.

### Frontend (`artifacts/web-app`)

Frontend memuat Midtrans Snap script dari `VITE_MIDTRANS_CLIENT_KEY`.
Pastikan env tersebut tersedia saat build/serve.

Catatan: `vite.config.ts` mewajibkan `PORT` dan `BASE_PATH` untuk dev server.

## Menjalankan Lokal (Dev)

1) Jalankan PostgreSQL dan set `DATABASE_URL` di env backend.

2) Jalankan API server:

```bash
pnpm --filter @workspace/api-server run dev
```

3) Jalankan web app:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/web-app run dev
```

Catatan: web-app memanggil API lewat path relatif `/api/*`. Pada deployment biasanya ini ditangani reverse-proxy (agar `/api` mengarah ke backend). Untuk dev lokal, pastikan setup networking/proxy Anda membuat `/api` mengarah ke API server.

## Typecheck

```bash
pnpm run typecheck
```

