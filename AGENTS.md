# AGENTS.md — My Vaultmail Fork

**Generated:** 2026-06-26
**Role:** Feature-expansion fork of v2/vaultmail. Active development target.

## OVERVIEW

Next.js 16 App Router + React 19 + TypeScript on Vercel. MongoDB for storage. Cloudflare Worker (`worker/`) ingests inbound email and posts to `/api/webhook` (shared-secret auth). Package name `dispomail` (intentional). Adds: Vitest tests, Zod at API boundaries, multi-subdomain domain config, IMAP fetch (ported from v1), fail-closed webhook auth, CI/CD.

See `docs/plans/2026-06-26-fork-expansion.md` for the full implementation plan.

## STRUCTURE

```
v2/vaultmail/
├── app/                # Next.js App Router: pages + API routes
│   ├── api/            # Route handlers (see app/api/AGENTS.md)
│   ├── [address]/      # Dynamic inbox page by email address
│   ├── admin/          # Admin dashboard page
│   ├── 2fa-gen/ tools/ gmail-dot/ refund-calculator/ token-generator/ day-counter/ url-codec/ email-breach/  # Standalone tool pages
│   ├── api-access/     # Developer API docs page
│   ├── layout.tsx      # Root layout: dark theme, Toaster, Adsense
│   └── page.tsx        # Home page (homepage-lock aware)
├── components/         # React components (see components/AGENTS.md)
├── lib/                # Shared logic (see lib/AGENTS.md)
├── worker/             # Cloudflare Worker (see worker/AGENTS.md)
├── docs/
│   ├── migration/      # Domain inventory, dispoflare → vaultmail
│   └── superpowers/
│       ├── specs/      # Multi-subdomain email design
│       └── plans/      # Implementation plans (TDD checkboxes)
├── public/             # Static assets, _headers, favicon.svg
├── scripts/            # docker-build.sh
├── bindings.d.ts       # Cloudflare Worker Env interface (legacy, mostly unused)
├── flake.nix           # Nix dev shell (nodejs, bun, cacert)
├── .env.example        # VAULTMAIL_DOMAINS, WEBHOOK_URL, FORWARD_DOMAINS, FORWARD_EMAIL
├── Dockerfile          # node:20-alpine multi-stage
├── CLAUDE.md           # Worktree-local guidance (do not remove)
└── README.md           # Deployment notes (Vercel + MongoDB, NOT Cloudflare Pages)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API route | `app/api/<name>/route.ts` | Export `GET`/`POST` named functions |
| Add page | `app/<route>/page.tsx` | App Router convention |
| Shared helper | `lib/*.ts` | Import via `@/lib/<name>` (tsconfig `@/*` → `./*`) |
| UI component | `components/*.tsx` | Page-level components; primitives in `components/ui/` |
| Storage access | `lib/storage.ts` | Redis-like API over MongoDB (`get`/`set`/`lpush`/`lrange`/`expire`) |
| Settings keys | `lib/admin-auth.ts` | `settings:*` constants, `ADMIN_SESSION_PREFIX` |
| Domain config | `lib/config.ts` + `lib/domains.ts` | No hardcoded fallback; admin-configured via MongoDB `settings:domains` / `settings:domains-config` |
| i18n | `lib/i18n.ts` | `en`/`id` locales; `getTranslations(locale)` |
| Email ingest | `worker/src/index.js` → `app/api/webhook/route.ts` | PostalMime parse → POST webhook |
| Homepage lock | `lib/homepage-lock.ts` + `app/api/homepage-auth/route.ts` | SHA256 password, rate-limited |
| Admin auth | `lib/admin-auth.ts` + `app/api/admin/auth/route.ts` | Cookie `vaultmail_admin_session`, session in `kv_store` |
| Domain expiration | `lib/domain-expiration.ts` + `app/api/cron/domain-expiration/route.ts` | WHOIS lookup, cron-secret header |

## CONVENTIONS (PROJECT-SPECIFIC)

- **Import alias**: `@/*` maps to project root. Use `@/lib/...`, `@/components/...`.
- **Storage abstraction**: `lib/storage.ts` exposes Redis-like API (`get`/`set`/`del`/`exists`/`expire`/`lpush`/`lrange`/`llen`/`keys`) over MongoDB collections `kv_store`, `list_meta`, `list_items`. Never call MongoDB directly outside `lib/storage.ts`.
- **Graceful degradation**: `withDb<T>(fallback, action)` returns fallback if `MONGODB_URI` unset. New code should follow this pattern, not throw.
- **Settings parse pattern**: Each settings module defines `parseXxxSettings(value: unknown): XxxSettings | null` handling string-JSON, object, null. Follow for new settings.
- **Key naming**: `withPrefix()` is a no-op identity; keys are bare. Use `inbox:<address>`, `settings:<name>`, `domain:expiration:<domain>`, `admin:session:<token>`.
- **Admin route guard**: All `/api/admin/*` routes check `isAdminSessionValid(token)` from cookie `vaultmail_admin_session` before processing.
- **Rate limiting**: `lib/auth-rate-limit.ts` — 3 attempts / 5-min lockout by IP. Use for any auth endpoint.
- **Route files**: `app/api/<name>/route.ts` exporting `GET`/`POST`/etc. Set `export const dynamic = 'force-dynamic'` for routes reading storage.
- **No Zod**: Validation is manual type guards + `JSON.parse` with try/catch. No schema library.
- **i18n**: Single-file `lib/i18n.ts` with hardcoded `translations` object. Add keys to both `en` and `id`.
- **Components**: Page-level components in `components/*-page.tsx`. Primitives in `components/ui/`. Use `cn()` from `lib/utils.ts` for classNames.
- **Build**: `npm run build` wipes `.next/` then runs `next build` (turbopack, required for Netlify).
- **Lint only**: No test framework. `npm run lint` + `npm run build` are the only gates.

## ANTI-PATTERNS (THIS VERSION)

- Do NOT use `--webpack` flag for production build — turbopack is required for Netlify compat (webpack has middleware bug on Netlify).
- Do NOT add `.design/` or other upstream extras back — see `CLAUDE.md`.
- Do NOT throw when `MONGODB_URI` is missing — use `withDb()` fallback pattern.
- Do NOT use `@ts-ignore` / `as any`. Strict mode is on (`tsconfig.json` `"strict": true`).
- Do NOT introduce Zod or other validation libs without discussion — current pattern is manual parsing.
- Do NOT rename package `dispomail` to `vaultmail`. Intentional.
- Do NOT deploy as Cloudflare Pages. Target is Netlify + MongoDB.

## UNIQUE STYLES

- **Two-factor page lives at `/2fa-gen`** (not `/two-factor`). Route folder matches.
- **`app/[address]/page.tsx`** is a dynamic catch-all for inbox-by-address deep links.
- **Tools are flat route folders**: `gmail-dot/`, `refund-calculator/`, `token-generator/`, `day-counter/`, `url-codec/`, `email-breach/` — each with a single `page.tsx` and a matching `components/<name>-page.tsx`.
- **`bindings.d.ts`** declares a Cloudflare `Env` interface (KV, R2, Durable Objects) but the worker uses plain JS and runtime env vars. The file is legacy scaffolding; do not rely on it for the worker.
- **Homepage lock**: Optional password gate on `/` controlled by admin settings. Cookie `vaultmail_homepage_auth` holds the SHA256 hash.

## COMMANDS

```bash
npm install
npm run dev      # next dev (turbopack)
npm run build    # clears .next then next build --webpack
npm run lint     # eslint (flat config)
npm run start    # next start (production)

# Worker (from worker/)
cd worker && npm install && npm run deploy   # wrangler deploy

# Docker
bash scripts/docker-build.sh
```

## NOTES

- MongoDB collections: `kv_store` (key-value with TTL), `list_meta` (list metadata with TTL), `list_items` (list entries, sorted by `createdAt` desc).
- Email flow: Cloudflare Email Routing → Worker (`postal-mime` parse) → `POST /api/webhook` → `storage.lpush(inboxKey(to), emailData)` + `storage.expire(key, retention)`.
- Retention is global (single `settings:retention` key), not per-address. Default 86400s (24h).
- Telegram notifications optional: configure `settings:telegram` via admin UI.
- Domain expiration cron: `GET /api/cron/domain-expiration` with header `x-cron-secret: <CRON_SECRET>`. Caches WHOIS results 24h.
- `ATTACHMENT_MAX_BYTES` env (default 2_000_000). Oversized attachments stored with `omitted: true`.
- v2 dropped v1's `lib/imap-fetch.ts`, `ldeleteByIds`/`ldeleteOlderThanIsoDate`/`lclear`, admin inbox-maintenance, admin IMAP settings. **Fork re-adds** IMAP fetch (Phase 8, runtime-hardened), `ldeleteByIds`/`ldeleteOlderThanIsoDate` (constrained, no `fieldPath` param).
