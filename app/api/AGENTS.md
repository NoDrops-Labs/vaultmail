# AGENTS.md — v2/vaultmail/app/api

**Generated:** 2026-06-26
**Role:** Next.js App Router API routes. All backend endpoints.

## STRUCTURE

```
app/api/
├── inbox/route.ts                 # GET  ?address=  → { emails: [] }
├── webhook/route.ts               # POST (JSON or FormData) → stores email, Telegram notify
├── download/route.ts              # GET  ?address=&emailId=&type=email|attachment&index=
├── settings/route.ts              # POST retention settings (admin)
├── retention/route.ts             # GET  retention settings
├── domains/route.ts               # GET  supported domains
├── branding/route.ts              # GET  app name
├── breach-check/route.ts          # POST email breach lookup
├── homepage-auth/route.ts         # POST homepage password login (rate-limited)
├── cron/
│   └── domain-expiration/route.ts # GET  with x-cron-secret header
└── admin/                         # All require vaultmail_admin_session cookie
    ├── auth/route.ts              # POST login
    ├── branding/route.ts          # GET/POST app name
    ├── domains/route.ts           # GET/POST domain list
    ├── homepage-lock/route.ts     # GET/POST lock settings
    ├── retention/route.ts         # GET/POST retention seconds
    ├── stats/route.ts             # GET  inbox/stats counts
    └── telegram/route.ts          # GET/POST telegram notify settings
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add authenticated admin endpoint | `admin/<name>/route.ts` + guard with `isAdminSessionValid` |
| Add public endpoint | `<name>/route.ts` at top level |
| Email ingest logic | `webhook/route.ts` |
| Inbox retrieval | `inbox/route.ts` |
| Cron job | `cron/<name>/route.ts` + check `x-cron-secret` header |

## CONVENTIONS

- **Route file**: `route.ts` exporting named HTTP methods (`GET`, `POST`, `PUT`, `DELETE`).
- **Response**: `NextResponse.json(body, { status })`. For non-JSON: `new NextResponse(text, { status })`.
- **Dynamic**: Add `export const dynamic = 'force-dynamic'` to any route reading storage (avoid static caching).
- **Admin guard**: Read cookie `vaultmail_admin_session` via `cookies()` from `next/headers`, call `isAdminSessionValid(token)`, return 401 if invalid.
- **Request parsing**: `await req.json()` for JSON, `await req.formData()` for multipart. Manual type guards — no Zod.
- **Query params**: `new URL(req.url).searchParams.get('name')`.
- **Error handling**: `try/catch` with `console.error` + graceful JSON fallback (e.g. inbox returns `{ emails: [] }` on error, status 200).
- **Settings GET pattern**: `storage.get(SETTINGS_KEY)` → `parseXxxSettings()` → fallback to default.
- **Settings POST pattern**: validate body → `storage.set(SETTINGS_KEY, payload)` → return `{ success: true }`.

## ANTI-PATTERNS

- Do NOT call MongoDB directly. Use `storage.*` from `lib/storage.ts`.
- Do NOT add new auth mechanisms. Reuse `isAdminSessionValid` / `auth-rate-limit`.
- Do NOT return 500 for expected empty states (e.g. no emails). Return 200 with empty array.
- Do NOT use `NextRequest` type — use plain `Request` (current codebase convention).
