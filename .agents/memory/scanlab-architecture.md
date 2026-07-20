---
name: Scan.Lab Architecture
description: Key decisions and gotchas for the Scan.Lab plagiarism-checker project
---

## Project layout
- `artifacts/api-server` — Express API, port from env (defaults 3000/8080 after build)
- `artifacts/web-app` — React/Vite SPA at previewPath `/`
- `lib/db` — shared Drizzle schema + pool (`@workspace/db`)
- `lib/api-spec/openapi.yaml` — single source of truth; regenerate with `pnpm --filter @workspace/api-spec run codegen`
- `lib/api-client-react/src/generated/` — DO NOT hand-edit; always regenerate

## Critical decisions

### Midtrans Snap in index.html
Script tag must use Vite's `%VITE_MIDTRANS_CLIENT_KEY%` substitution syntax:
```html
<script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="%VITE_MIDTRANS_CLIENT_KEY%"></script>
```
Secret `VITE_MIDTRANS_CLIENT_KEY` must be set; workflow restart required after adding it.
CSP errors in the Replit dev preview are expected and harmless — Midtrans inline scripts are blocked by Replit's iframe CSP but work fine in production.

### Sequential scan loop (important)
`onScanBerbayarSubmit` uses a `for` loop with `mutateAsync`, NOT `Promise.all`.
Reason: each document must be persisted to DB before the next one is scanned, so doc N+1 can detect overlap with doc N via shingling.

### Confidence score is already 0-100
`webResults[].confidence` is an integer 0-100 from the Anthropic response. Do NOT multiply by 100 when displaying.

### OpenAPI inline body → TS2308 collision
Any inline `requestBody` schema in openapi.yaml causes orval to generate a name collision (`PaymentNotificationBody` appeared twice). Fix: always use a named `$ref` for every request body, even simple ones. See `NotificationPayload` schema as the pattern.

### useGetScanHistory signature
`useGetScanHistory(params: GetScanHistoryParams, options?)` — first arg IS the params object `{ email: string }`, not a wrapper. This differs from query hooks with no required params.

### @radix-ui/react-icons not installed
The scaffold ui/toast.tsx imports `Cross2Icon` from `@radix-ui/react-icons` which is not in the workspace. Replace with `X` from `lucide-react`. Do not install `@radix-ui/react-icons` — lucide-react covers everything needed.

### Anthropic model for web search
Model must be `claude-sonnet-5` with beta header `anthropic-beta: web-search-2025-03-05` and tool `{ type: "web_search_20250305", name: "web_search" }`. 400 errors during testing were due to insufficient credits, not code bugs.
