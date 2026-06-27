# Fork Expansion Plan — my-future-vaultmail-here (v2, Oracle-revised)

**Created:** 2026-06-26
**Revised:** 2026-06-26 (Oracle architecture review)
**Status:** ✅ COMPLETE — all 11 phases executed, 175 tests pass, lint+build clean
**Base:** v2/vaultmail (inherit .git history)
**Goal:** Feature-expansion fork with v1 IMAP port, security hardening, tests, Zod, multi-subdomain, CI/CD, component refactoring.

**Fork identity decisions:**
- Package name: `dispomail` (keep for now, rename later is trivial)
- Default domain: **No hardcoded fallback**. Require admin-configured domains in MongoDB.
- Git: Copy v2's `.git` to inherit history, then branch.

**Oracle revision summary:**
- Reordered phases: Vitest first (was Phase 3), then domain-fallback removal, webhook auth, Zod, multi-subdomain, admin refactor BEFORE IMAP port, then IMAP, then remaining refactor.
- Removed runtime `SEED_DOMAINS` fallback from `lib/domain-config.ts`; seed data becomes an explicit `scripts/seed-domains.ts` script + docs fixture.
- Webhook auth now fail-closed in production; opt-in bypass for dev only.
- `SUPPORTED_DOMAIN_SET` is now async/computed from MongoDB, not module-level.
- Constrained `ldeleteOlderThanIsoDate` (no `fieldPath` param; fixed `value.receivedAt`).
- Added IMAP runtime hardening: `runtime = 'nodejs'`, socket timeouts, max-fetch guard.
- Added IMAP parsing/dedup tests.
- Added FormData-aware Zod handling for webhook (separate from JSON branch).
- Added admin UI migration for structured domain config (root + subdomain pools).
- Added Worker secret deployment docs.

---

## Phase 0: Initialize Fork

**Files:** None modified — scaffolding only.

- [ ] **0.1** Copy v2/vaultmail contents into my-future-vaultmail-here/ (preserving .git, dotfiles, all subdirectories)
  ```bash
  rsync -a v2/vaultmail/ my-future-vaultmail-here/
  cd my-future-vaultmail-here && git log --oneline -5  # verify .git came along
  ```

- [ ] **0.2** Create initial branch for fork work
  ```bash
  git checkout -b fork/init
  ```

- [ ] **0.3** Update CLAUDE.md to reflect fork identity (not v2 copy)
  - Title: "My Vaultmail Fork"
  - Note: fork of v2 with expanded features (IMAP, multi-subdomain, tests, Zod, webhook auth)
  - Keep working rules (small edits, lint+build+test verification)

- [ ] **0.4** Update AGENTS.md to reflect fork lineage and planned additions
  - Overview mentions fork lineage + new modules (tests, Zod schemas, domain-config, IMAP)
  - WHERE TO LOOK table updated

- [ ] **0.5** Commit Phase 0
  ```bash
  git add -A && git commit -m "chore: initialize fork from v2"
  ```

---

## Phase 1: Add Vitest + Test lib/ (MOVED FIRST — was Phase 3)

**Files:**
- Modify: `package.json` (add vitest devDep)
- Add: `vitest.config.ts`
- Add: `lib/__tests__/utils.test.ts`
- Add: `lib/__tests__/storage-keys.test.ts`
- Add: `lib/__tests__/i18n.test.ts`

**Oracle note:** Install Vitest BEFORE writing any test stubs. Don't write TODO tests against a non-existent framework.

- [ ] **1.1** Install vitest
  ```bash
  npm install -D vitest @vitest/coverage-v8
  ```

- [ ] **1.2** Add test scripts to package.json
  ```json
  "test": "vitest run",
  "test:watch": "vitest"
  ```

- [ ] **1.3** Create `vitest.config.ts`
  ```typescript
  import { defineConfig } from 'vitest/config';
  import path from 'node:path';
  
  export default defineConfig({
    resolve: { alias: { '@': path.resolve(__dirname) } },
    test: { environment: 'node', include: ['**/__tests__/**/*.test.ts'] }
  });
  ```

- [ ] **1.4** Write tests for `lib/utils.ts`
  - `extractEmail()` — valid, invalid, mixed case, no email
  - `getSenderInfo()` — "Name <email>", bare email, quoted name, no email

- [ ] **1.5** Write tests for `lib/storage-keys.ts`
  - `inboxKey()` lowercases address
  - `inboxPattern()` returns `inbox:*`
  - `domainExpirationKey()` lowercases domain

- [ ] **1.6** Write tests for `lib/i18n.ts`
  - `getTranslations('en')` returns English
  - `getTranslations('id')` returns Indonesian
  - `getTranslations('fr')` falls back to English
  - `getRetentionOptions()` returns 5 options with correct values

- [ ] **1.7** Run: `npm test` — all pass
- [ ] **1.8** Commit: `feat: add vitest with lib/ test coverage`

---

## Phase 2: Remove Hardcoded Domain Fallback (WAS PHASE 1)

**Files:**
- Modify: `lib/config.ts`
- Modify: `lib/domains.ts`
- Modify: `components/home-page.tsx`
- Modify: `components/inbox-interface.tsx`
- Modify: `app/api/domains/route.ts`
- Add: `lib/__tests__/domains.test.ts`

**Oracle note:** `components/inbox-interface.tsx` currently initializes from `getDefaultEmailDomain()` and falls back to `DEFAULT_DOMAIN_FALLBACK` when `/api/domains` returns empty. Those paths must become "disable generation and show 'Configure domains in admin'" — not silent defaults.

- [ ] **2.1** Modify `lib/config.ts`
  - Remove `DEFAULT_DOMAIN_FALLBACK` export
  - Remove `DEFAULT_DOMAIN` export
  - Keep `DEFAULT_EMAIL = ''` and `getDefaultEmailDomain` (return `''`)
  - `DEFAULT_DOMAINS: string[] = []` remains as empty default

- [ ] **2.2** Modify `lib/domains.ts`
  - Remove import of `DEFAULT_DOMAIN_FALLBACK`
  - Rename `getDomainsWithFallback()` → `getDomains()` (no fallback; returns `[]` when empty)
  - Update all callers (search: `getDomainsWithFallback`)

- [ ] **2.3** Modify `components/home-page.tsx` and `components/inbox-interface.tsx`
  - Handle empty domains list: disable address generation, show "Configure domains in admin" message
  - Do NOT crash if no domains configured
  - Do NOT silently fall back to any hardcoded domain

- [ ] **2.4** Modify `app/api/domains/route.ts`
  - Return `{ domains: [] }` when none configured (not an error, not a fallback)

- [ ] **2.5** Write tests for `lib/domains.ts` (now that Vitest exists from Phase 1)
  - `normalizeDomains()` dedupes, lowercases, filters empty
  - `parseDomains()` handles string-JSON, array, object, null
  - `getDomains()` returns `[]` when storage empty

- [ ] **2.6** Verify: `npm run lint && npm test && npm run build`
- [ ] **2.7** Commit: `feat: require admin-configured domains, remove hardcoded fallback`

---

## Phase 3: Webhook Auth Secret (FAIL-CLOSED)

**Files:**
- Modify: `app/api/webhook/route.ts`
- Modify: `worker/src/index.js`
- Modify: `.env.example`
- Modify: `README.md` (document WEBHOOK_SECRET requirement)
- Add: `lib/webhook-auth.ts`
- Add: `lib/__tests__/webhook-auth.test.ts`

**Oracle note:** Original plan failed open (returned `true` if `WEBHOOK_SECRET` unset). This is a security hole — anyone could POST to `/api/webhook` and trigger Telegram spam. Fail CLOSED in production. Allow opt-in bypass only via explicit `ALLOW_UNAUTHENTICATED_WEBHOOK=true` for local dev.

- [ ] **3.1** Create `lib/webhook-auth.ts`
  ```typescript
  export const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';
  
  export const validateWebhookSecret = (request: Request): boolean => {
    const secret = process.env.WEBHOOK_SECRET?.trim();
    // Fail closed: if no secret is configured, reject unless explicit dev bypass
    if (!secret) {
      if (process.env.ALLOW_UNAUTHENTICATED_WEBHOOK === 'true') {
        return true; // Dev/preview only — must be explicit
      }
      console.error('WEBHOOK_SECRET is not set; webhook rejected. Set ALLOW_UNAUTHENTICATED_WEBHOOK=true for local dev.');
      return false;
    }
    const provided = request.headers.get(WEBHOOK_SECRET_HEADER)?.trim();
    return Boolean(provided) && provided === secret;
  };
  ```

- [ ] **3.2** Modify `app/api/webhook/route.ts`
  - Import `validateWebhookSecret`
  - At top of `POST`: `if (!validateWebhookSecret(req)) return new NextResponse('Unauthorized', { status: 401 });`

- [ ] **3.3** Modify `worker/src/index.js`
  - Read `env.WEBHOOK_SECRET`
  - If set, add `x-webhook-secret` header to webhook POST fetch
  - If unset, log warning (worker will get 401 from app)

- [ ] **3.4** Update `.env.example`
  ```
  WEBHOOK_SECRET=  # required for production; shared secret between worker and app
  ALLOW_UNAUTHENTICATED_WEBHOOK=  # set to 'true' ONLY for local dev
  ```

- [ ] **3.5** Update `README.md` deployment section
  - Document that `WEBHOOK_SECRET` must be set in both Vercel and Cloudflare Worker env
  - Document `ALLOW_UNAUTHENTICATED_WEBHOOK` for dev only

- [ ] **3.6** Write tests for `lib/webhook-auth.ts`
  - Valid secret → returns true
  - Invalid secret → returns false
  - No secret configured, no bypass → returns false (fail-closed)
  - No secret configured, bypass=true → returns true
  - Empty header → returns false

- [ ] **3.7** Verify: `npm run lint && npm test && npm run build`
- [ ] **3.8** Commit: `feat: secure webhook with fail-closed shared secret`

---

## Phase 4: Zod Validation at API Boundaries (FORMDATA-AWARE)

**Files:**
- Modify: `package.json` (add zod dep)
- Add: `lib/schemas/webhook.ts`
- Add: `lib/schemas/settings.ts`
- Add: `lib/schemas/admin-auth.ts`
- Add: `lib/schemas/homepage-auth.ts`
- Modify: `app/api/webhook/route.ts` (JSON branch only; FormData stays manual)
- Modify: `app/api/settings/route.ts`
- Modify: `app/api/admin/auth/route.ts`
- Modify: `app/api/admin/domains/route.ts`
- Modify: `app/api/admin/retention/route.ts`
- Modify: `app/api/admin/branding/route.ts`
- Modify: `app/api/admin/homepage-lock/route.ts`
- Modify: `app/api/admin/telegram/route.ts`
- Modify: `app/api/homepage-auth/route.ts`

**Oracle note:** `app/api/webhook/route.ts` supports BOTH JSON and multipart/form-data. A single `safeParse(await req.json())` would break FormData ingestion. Apply Zod to the JSON branch only; keep FormData parsing manual but type-safe via a shared helper.

- [ ] **4.1** Install zod
  ```bash
  npm install zod
  ```

- [ ] **4.2** Create `lib/schemas/webhook.ts`
  - Schema for JSON POST body: `from`, `to`, `subject`, `text`, `html`, `attachments` array
  - Export inferred type: `WebhookJsonPayload`

- [ ] **4.3** Create `lib/schemas/settings.ts`
  - Retention: `{ seconds: number }`
  - Branding: `{ appName?: string }`

- [ ] **4.4** Create `lib/schemas/admin-auth.ts`
  - Login: `{ password: string }`
  - Domains (structured): `{ domains: MasterDomainConfig[] }` (uses type from Phase 5 — forward-reference or define here)
  - Homepage lock: `{ enabled: boolean, passwordHash?: string }`
  - Telegram: `{ enabled, botToken, chatId, allowedDomains? }`

- [ ] **4.5** Create `lib/schemas/homepage-auth.ts`
  - `{ password: string }`

- [ ] **4.6** Refactor each `route.ts` to use `schema.safeParse(await req.json())`
  - On parse fail: return 400 with `error.format()`
  - On parse success: use `data` as typed payload
  - **For webhook FormData branch:** keep manual parsing but type the result with a shared `WebhookPayload` type

- [ ] **4.7** Verify: `npm run lint && npm test && npm run build`
- [ ] **4.8** Commit: `feat: add zod validation at API boundaries (FormData-aware)`

---

## Phase 5: Multi-Subdomain Domain Config (ASYNC, NO SEED FALLBACK)

**Files:**
- Add: `lib/domain-config.ts` (types + pure helpers only — no runtime fallback)
- Add: `scripts/seed-domains.ts` (explicit admin-run seed script)
- Modify: `lib/domains.ts` (async domain resolution from MongoDB)
- Modify: `lib/admin-auth.ts` (add `DOMAINS_CONFIG_SETTINGS_KEY` for structured config)
- Modify: `app/api/domains/route.ts` (return expanded final domains)
- Modify: `app/api/webhook/route.ts` (async domain validation)
- Modify: `components/home-page.tsx` (flat selector from expanded list)
- Modify: `components/settings-dialog.tsx` (structured domain admin UI)
- Add: `lib/__tests__/domain-config.test.ts`

**Oracle notes:**
- Original plan had module-level `SUPPORTED_DOMAIN_SET` — admin changes wouldn't affect webhook validation without restart. Must be async/computed from MongoDB on each request.
- `SEED_DOMAINS` as runtime fallback contradicts "no hardcoded fallback" decision. Move seed data to explicit `scripts/seed-domains.ts` + docs fixture.
- `settings-dialog.tsx` has client-side "custom domains" concept that conflicts with strict admin-configured receiving domains — must update.

- [ ] **5.1** Create `lib/domain-config.ts` — types and pure helpers ONLY
  ```typescript
  export type MasterDomainConfig = {
    owner: string;
    domain: string;
    allowRoot: boolean;
    subdomains: string[];
  };
  
  export const expandDomains = (config: MasterDomainConfig[]): string[] =>
    config.flatMap(entry => {
      const subs = entry.subdomains.map(label => `${label}.${entry.domain}`);
      return entry.allowRoot ? [entry.domain, ...subs] : subs;
    });
  
  export const isDomainInConfig = (domain: string, config: MasterDomainConfig[]): boolean => {
    const expanded = new Set(expandDomains(config).map(d => d.toLowerCase()));
    return expanded.has(domain.toLowerCase().trim());
  };
  ```

- [ ] **5.2** Add `DOMAINS_CONFIG_SETTINGS_KEY = withPrefix('settings:domains-config')` to `lib/admin-auth.ts`
  - Keep existing `DOMAINS_SETTINGS_KEY` for backward compat (flat list) during migration

- [ ] **5.3** Modify `lib/domains.ts`
  - `getDomains()` reads structured config from `DOMAINS_CONFIG_SETTINGS_KEY`, falls back to flat `DOMAINS_SETTINGS_KEY` for legacy, returns `expandDomains(config)` or `[]` if neither set
  - `getMasterDomains()` returns the structured config from storage
  - `isAddressSupported(email)` async — reads config, calls `isDomainInConfig`
  - NO module-level `SUPPORTED_DOMAIN_SET` — always reads from storage

- [ ] **5.4** Create `scripts/seed-domains.ts` — explicit seed script (NOT runtime fallback)
  ```typescript
  // Run: npx tsx scripts/seed-domains.ts
  // Seeds the structured domain config into MongoDB
  import { SEED_DOMAINS } from '@/domain-config.seed';
  // ... connect to MongoDB, upsert settings:domains-config
  ```
  - Seed data sourced from `docs/migration/vaultmail-domain-inventory.md`
  - Include all 6 domains (4 with subdomain pools, 2 without)

- [ ] **5.5** Add `lib/domain-config.seed.ts` — seed data fixture (not imported by runtime code)
  - All 6 preserved domains with their subdomain pools

- [ ] **5.6** Modify `app/api/webhook/route.ts`
  - After extracting `cleanTo`, call `await isAddressSupported(cleanTo)` 
  - Reject with 400 if domain unsupported

- [ ] **5.7** Modify `app/api/domains/route.ts`
  - GET returns `{ domains: expandDomains(config), masterDomains: config }`

- [ ] **5.8** Modify `components/home-page.tsx` and `components/inbox-interface.tsx`
  - Domain selector uses flat expanded list from API
  - Remove any root/subdomain mode switch

- [ ] **5.9** Modify `components/settings-dialog.tsx`
  - Replace flat custom-domain input with structured admin UI (master domain + subdomain pool + allowRoot toggle)
  - Or: defer detailed UI to Phase 7 (admin refactor) and keep basic list here

- [ ] **5.10** Write tests for `lib/domain-config.ts`
  - `expandDomains()` with allowRoot true/false
  - `isDomainInConfig()` for root, subdomain, unknown, case-insensitive

- [ ] **5.11** Verify: `npm run lint && npm test && npm run build`
- [ ] **5.12** Commit: `feat: multi-subdomain domain config with async validation`

---

## Phase 6: CI/CD Pipeline

**Files:**
- Add: `.github/workflows/ci.yml`
- Modify: `.github/workflows/worker-deploy.yml` (add lint step for worker)

**Oracle note:** Phase 6 CI depends on `npm test` existing (Phase 1). Order is now correct: Phase 1 → Phase 6.

- [ ] **6.1** Create `.github/workflows/ci.yml`
  ```yaml
  name: CI
  on:
    push: { branches: [main, 'fork/**'] }
    pull_request:
  jobs:
    lint-test-build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20, cache: npm }
        - run: npm ci
        - run: npm run lint
        - run: npm test
        - run: npm run build
  ```

- [ ] **6.2** Update `.github/workflows/worker-deploy.yml`
  - Add a lint step for the worker package (or at minimum verify wrangler.toml syntax)

- [ ] **6.3** Commit: `ci: add lint+test+build workflow`

---

## Phase 7: Admin Dashboard Refactor (BEFORE IMAP PORT)

**Files:**
- Add: `components/admin/` directory
  - `stats-section.tsx`
  - `branding-section.tsx`
  - `domains-section.tsx` (structured, from Phase 5)
  - `retention-section.tsx`
  - `telegram-section.tsx`
  - `homepage-lock-section.tsx`
- Modify: `components/admin-dashboard.tsx` (slim to orchestrator)

**Oracle note:** Refactor admin dashboard BEFORE porting IMAP. Adding IMAP settings to the 778-line file and then extracting it creates avoidable churn. Refactor first, then add IMAP as a clean `components/admin/imap-section.tsx`.

- [ ] **7.1** Create `components/admin/` directory
- [ ] **7.2** Extract `StatsSection` from admin-dashboard.tsx
- [ ] **7.3** Extract `BrandingSection`
- [ ] **7.4** Extract `DomainsSection` (structured, using Phase 5 config)
- [ ] **7.5** Extract `RetentionSection`
- [ ] **7.6** Extract `TelegramSection`
- [ ] **7.7** Extract `HomepageLockSection`
- [ ] **7.8** Slim `admin-dashboard.tsx` to orchestrator (state, fetch, compose)
- [ ] **7.9** Verify: `npm run lint && npm run build`
- [ ] **7.10** Commit: `refactor: split admin-dashboard into section components`

---

## Phase 8: Port IMAP Fetch from v1 (RUNTIME-HARDENED)

**Files:**
- Copy: `v1/vaultmail/lib/imap-fetch.ts` → `lib/imap-fetch.ts` (with hardening)
- Add: `app/api/admin/imap/route.ts`
- Add: `components/admin/imap-section.tsx`
- Add: `lib/schemas/imap.ts`
- Add: `lib/__tests__/imap-fetch.test.ts`
- Modify: `lib/admin-auth.ts` (add `IMAP_SETTINGS_KEY`)
- Modify: `lib/storage.ts` (add back `ldeleteByIds`, `ldeleteOlderThanIsoDate` — constrained)
- Modify: `app/api/inbox/route.ts` (add IMAP fetch path)
- Modify: `app/api/admin/imap/route.ts` (use Zod schema)

**Oracle notes:**
- Port v1's raw TLS IMAP client as-is per user request, but add: `export const runtime = 'nodejs'` on routes using it, socket timeouts, command timeouts, max-fetch guard.
- `ldeleteOlderThanIsoDate` must NOT have `fieldPath` param — constrain to `value.receivedAt` to avoid Mongo leak through storage API.
- Add tests for IMAP parsing/dedup/recipient-matching (unit-testable pure functions).
- Do NOT import `imap-fetch` into client components — server-only module.

- [ ] **8.1** Copy `lib/imap-fetch.ts` from v1
  - Add socket timeout (`socket.setTimeout()`) 
  - Add command timeout wrapper around `runImapCommand`
  - Enforce `maxFetch` cap (already in v1, verify)
  - Keep raw TLS approach (no `imapflow`)

- [ ] **8.2** Add `IMAP_SETTINGS_KEY` to `lib/admin-auth.ts`

- [ ] **8.3** Port storage methods from v1 into v2's `storage.ts`
  - `ldeleteByIds(key, ids)` — wrap in `withDb(0, ...)` 
  - `ldeleteOlderThanIsoDate(key, isoDate)` — NO `fieldPath` param, fixed to `value.receivedAt`, wrap in `withDb(0, ...)`
  - `cleanupEmptyListMeta(key)` — wrap in `withDb(undefined, ...)`
  - Adapt signatures to v2's `db: Db` param style

- [ ] **8.4** Create `app/api/admin/imap/route.ts`
  - GET: return IMAP settings (mask password)
  - POST: validate with Zod schema, save to `IMAP_SETTINGS_KEY`
  - Add `export const runtime = 'nodejs'` (IMAP uses Node `tls` module)
  - Admin auth guard

- [ ] **8.5** Create `lib/schemas/imap.ts`
  - Zod schema for IMAP settings: `enabled, host, port, user, password, tls, rejectUnauthorized, maxFetch`

- [ ] **8.6** Replace `app/api/inbox/route.ts` with v1's 180-line version
  - Adapt to v2's storage signature (`db: Db` param)
  - Add `export const runtime = 'nodejs'`
  - Keep DELETE handler
  - Keep IMAP fetch path with dedup via `sourceId`
  - Keep `?resync=1` support
  - Keep webhook-stored emails working alongside IMAP

- [ ] **8.7** Create `components/admin/imap-section.tsx`
  - Port IMAP settings UI from v1's admin-dashboard.tsx
  - Fields: enabled, host, port, user, password, tls, rejectUnauthorized, maxFetch, domainFilter
  - Fits cleanly into refactored admin dashboard (Phase 7)

- [ ] **8.8** Write tests for `lib/imap-fetch.ts` pure functions
  - `parseHeaders()` — multi-line headers, folded headers
  - `decodeMimeEncodedWords()` — B/Q encoding, charset fallback
  - `decodeQuotedPrintable()` — soft breaks, hex escapes
  - `extractEmailAddresses()` — dedup, case-insensitive
  - `buildInboxPreview()` — truncation, tag stripping
  - (Skip `fetchFromImap` / `testImapConnection` — require live socket; cover with integration test later)

- [ ] **8.9** Write tests for new storage methods
  - `ldeleteByIds` — deletes matching, returns count
  - `ldeleteOlderThanIsoDate` — deletes older, returns count
  - Both wrapped in `withDb` (test with mocked storage)

- [ ] **8.10** Update `lib/AGENTS.md` to document IMAP module
- [ ] **8.11** Update `app/api/AGENTS.md` to document inbox IMAP path
- [ ] **8.12** Verify: `npm run lint && npm test && npm run build`
- [ ] **8.13** Commit: `feat: port IMAP fetch from v1 with runtime hardening and tests`

---

## Phase 9: Inbox Interface Refactor

**Files:**
- Add: `components/inbox/` directory
  - `email-list.tsx`
  - `email-viewer.tsx`
  - `domain-selector.tsx`
  - `history-dropdown.tsx`
- Modify: `components/inbox-interface.tsx` (slim to orchestrator)

- [ ] **9.1** Create `components/inbox/` directory
- [ ] **9.2** Extract `EmailList` from inbox-interface.tsx
- [ ] **9.3** Extract `EmailViewer` (with iframe rendering) from inbox-interface.tsx
- [ ] **9.4** Extract `DomainSelector` from inbox-interface.tsx
- [ ] **9.5** Extract `HistoryDropdown` from inbox-interface.tsx
- [ ] **9.6** Slim `inbox-interface.tsx` to orchestrator (state, fetch, compose)
- [ ] **9.7** Verify: `npm run lint && npm run build`
- [ ] **9.8** Commit: `refactor: split inbox-interface into focused components`

---

## Phase 10: Documentation & Cleanup

**Files:**
- Modify: `README.md` (update for fork, document new features)
- Modify: `AGENTS.md` (reflect all new features)
- Modify: `CLAUDE.md` (new working rules)
- Modify: `lib/AGENTS.md`, `app/api/AGENTS.md`, `components/AGENTS.md` (update for new modules)
- Add: `docs/fork-changelog.md`
- Mark this plan complete

- [ ] **10.1** Update README.md
  - Document WEBHOOK_SECRET requirement (both Vercel + Worker)
  - Document multi-subdomain domain config
  - Document IMAP fetch setup
  - Document `ALLOW_UNAUTHENTICATED_WEBHOOK` for dev
  - Document seed script: `npx tsx scripts/seed-domains.ts`

- [ ] **10.2** Update AGENTS.md files
  - Root: mention tests, Zod, domain-config, IMAP, webhook auth
  - lib/: document new modules (domain-config, webhook-auth, schemas/, imap-fetch)
  - app/api/: document IMAP path in inbox, structured domains endpoint
  - components/: document admin/ and inbox/ subdirectories

- [ ] **10.3** Update CLAUDE.md
  - New working rules: test before commit, Zod for new routes, runtime='nodejs' for IMAP routes

- [ ] **10.4** Create `docs/fork-changelog.md` summarizing all changes
- [ ] **10.5** Mark all checkboxes in this plan as complete
- [ ] **10.6** Final verify: `npm run lint && npm test && npm run build`
- [ ] **10.7** Commit: `docs: update fork documentation and changelog`

---

## Verification Checklist (run at end of each phase)

- [ ] `npm run lint` passes
- [ ] `npm test` passes (after Phase 1)
- [ ] `npm run build` passes
- [ ] No `as any` / `@ts-ignore` introduced
- [ ] No new dependencies without justification
- [ ] AGENTS.md updated if architecture changed

---

## Phase Priority & Dependencies (REVISED)

```
Phase 0 (init)
  ↓
Phase 1 (vitest) ─────────────────────────┐
  ↓                                       │
Phase 2 (no fallback)                     │
  ↓                                       │
Phase 3 (webhook auth, fail-closed)       │
  ↓                                       │
Phase 4 (zod, FormData-aware)            │
  ↓                                       │
Phase 5 (multi-subdomain, async, no seed) │
  ↓                                       ↓
Phase 6 (CI)                    Phase 7 (admin refactor)
                                ↓
                                Phase 8 (IMAP port, hardened)
                                ↓
                                Phase 9 (inbox refactor)
                                ↓
                                Phase 10 (docs)
```

**Sequential after Phase 0:** 1 → 2 → 3 → 4 → 5 → (6 ∥ 7) → 8 → 9 → 10

**Why no parallelization:** Oracle flagged that Phases 1, 2, 3 share `lib/domains.ts` test stubs and webhook route files. Strict sequence avoids merge conflicts on a single-developer fork.

---

## Anti-Patterns (DO NOT)

- Do NOT skip tests because "it's just a port from v1" — test the ported code (Oracle: IMAP parsing tests are mandatory).
- Do NOT use `as any` to silence type errors during Zod migration.
- Do NOT add `imapflow` library — user confirmed port of v1's raw TLS approach.
- Do NOT remove the webhook path when adding IMAP — both must coexist.
- Do NOT hardcode domain fallback after Phase 2 — admin-config only.
- Do NOT use `SEED_DOMAINS` as runtime fallback — seed script only.
- Do NOT make webhook auth fail-open in production — fail-closed (Oracle: security hole).
- Do NOT use module-level `SUPPORTED_DOMAIN_SET` — must be async from MongoDB (Oracle: admin changes won't take effect).
- Do NOT apply Zod `safeParse` to FormData branch — JSON only (Oracle: breaks multipart ingestion).
- Do NOT add `fieldPath` param to `ldeleteOlderThanIsoDate` — constrain to `value.receivedAt` (Oracle: Mongo leak).
- Do NOT import `imap-fetch` into client components — server-only, uses Node `tls`.
- Do NOT add IMAP settings to `admin-dashboard.tsx` before refactoring it — refactor first (Phase 7), then add IMAP section (Phase 8).
- Do NOT commit without `npm run lint && npm test && npm run build` passing.
