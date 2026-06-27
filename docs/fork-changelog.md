# Fork Changelog

**Fork:** my-future-vaultmail-here
**Base:** v2/vaultmail (inherited .git history)
**Created:** 2026-06-26

---

## Phase 0: Initialize Fork
- rsync v2/vaultmail → my-future-vaultmail-here/ (preserved .git, all dotfiles)
- Branch `fork/init` from main
- Updated CLAUDE.md for fork identity (Vitest, Zod, IMAP, webhook auth)
- Updated AGENTS.md: fork lineage, re-adds IMAP/ldelete methods
- Added subdirectory AGENTS.md files (app/api, lib, components, worker)

## Phase 1: Add Vitest + Test Coverage
- Installed vitest + @vitest/coverage-v8
- Added `test`/`test:watch` scripts to package.json
- Created `vitest.config.ts` (node env, @/ alias)
- `lib/__tests__/utils.test.ts` — 17 tests (cn, extractEmail, getSenderInfo)
- `lib/__tests__/storage-keys.test.ts` — 9 tests (withPrefix, inboxKey, inboxPattern, domainExpirationKey)
- `lib/__tests__/i18n.test.ts` — 9 tests (SUPPORTED_LOCALES, getTranslations, getRetentionOptions)
- **35 tests pass**

## Phase 2: Remove Hardcoded Domain Fallback
- `lib/config.ts`: removed `DEFAULT_DOMAIN_FALLBACK`, `DEFAULT_DOMAIN` exports
- `lib/domains.ts`: renamed `getDomainsWithFallback` → `getDomains` (returns [] when empty, no fallback)
- `app/api/domains/route.ts`: uses `getDomains()`, added `dynamic='force-dynamic'`
- `components/inbox-interface.tsx`: removed `DEFAULT_DOMAIN_FALLBACK` import, empty domain list handling
- `lib/__tests__/domains.test.ts` — 19 tests
- **54 tests pass**

## Phase 3: Webhook Auth Secret (Fail-Closed)
- `lib/webhook-auth.ts`: `validateWebhookSecret()` — fail-closed in production
  - Returns false if `WEBHOOK_SECRET` unset (no fail-open)
  - `ALLOW_UNAUTHENTICATED_WEBHOOK=true` bypasses for local dev ONLY
  - Secret takes precedence over bypass when both set
- `app/api/webhook/route.ts`: auth check at top of POST, 401 if invalid
- `worker/src/index.js`: sends `x-webhook-secret` header from `env.WEBHOOK_SECRET`
- `.env.example`: documented `WEBHOOK_SECRET` (required) and `ALLOW_UNAUTHENTICATED_WEBHOOK` (dev only)
- `lib/__tests__/webhook-auth.test.ts` — 12 tests
- **66 tests pass**

## Phase 4: Zod Validation at API Boundaries (FormData-Aware)
- Installed zod
- `lib/schemas/webhook.ts`: `webhookJsonSchema` (JSON branch only; FormData stays manual per Oracle)
- `lib/schemas/settings.ts`: `settingsPostSchema` (retentionSeconds)
- `lib/schemas/admin-auth.ts`: adminLogin, domainsPost, retentionPost, brandingPost, homepageLockPost, telegramPost schemas
- `lib/schemas/homepage-auth.ts`: `homepageAuthSchema`
- Refactored 9 route.ts files to use `schema.safeParse()` with 400 + error.format() on failure
- **66 tests pass, build clean**

## Phase 5: Multi-Subdomain Domain Config (Async, No Seed Fallback)
- `lib/domain-config.ts`: `MasterDomainConfig` type, `expandDomains()`, `isDomainInConfig()` (pure helpers, no runtime seed)
- `lib/domain-config.seed.ts`: `SEED_DOMAINS` fixture (6 domains from migration inventory, NOT runtime fallback)
- `scripts/seed-domains.ts`: explicit admin-run seed script (`npx tsx scripts/seed-domains.ts`)
- `lib/admin-auth.ts`: added `DOMAINS_CONFIG_SETTINGS_KEY` for structured config
- `lib/domains.ts`: async `getMasterDomains()`, `getDomains()` expands master config, `isAddressSupported()` async check
  - Falls back to flat `DOMAINS_SETTINGS_KEY` for legacy compat
  - NO module-level `SUPPORTED_DOMAIN_SET` (Oracle: admin changes must take effect without restart)
- `app/api/domains/route.ts`: returns `{ domains: expanded, masterDomains }`
- `app/api/webhook/route.ts`: async `isAddressSupported()` validation, reject 400 if unsupported
- `tsconfig.json`: exclude `scripts/` from Next.js build
- `lib/__tests__/domain-config.test.ts` — 17 tests
- `lib/__tests__/domains.test.ts` — expanded to 30 tests
- **90 tests pass, build clean**

## Phase 6: CI/CD Pipeline
- `.github/workflows/ci.yml`: runs on push (main, fork/**) and PR
- Steps: `npm ci` → `npm run lint` → `npm test` → `npm run build`
- Node 20, npm cache enabled

## Phase 7: Admin Dashboard Refactor
- `components/admin/types.ts`: shared types (AdminStats, etc.)
- `components/admin/stats-section.tsx`: StatsSection (53 lines)
- `components/admin/branding-section.tsx`: BrandingSection (53 lines)
- `components/admin/homepage-lock-section.tsx`: HomepageLockSection (85 lines)
- `components/admin/domains-section.tsx`: DomainsSection (106 lines)
- `components/admin/telegram-section.tsx`: TelegramSection (131 lines)
- `components/admin/retention-section.tsx`: RetentionSection (60 lines)
- `components/admin-dashboard.tsx`: slimmed from 778 → 460 lines (orchestrator)
- **90 tests pass, build clean**

## Phase 8: Port IMAP Fetch from v1 (Runtime-Hardened)
- `lib/imap-fetch.ts`: ported from v1 (381 lines) with hardening
  - `socket.setTimeout(30s)` + destroy-on-timeout
  - 15s command timeout in `runImapCommand` with cleanup
  - Raw `tls` approach (NO `imapflow` library)
  - Exported pure functions for testing
- `lib/admin-auth.ts`: added `IMAP_SETTINGS_KEY`
- `lib/storage.ts`: added `ldeleteByIds`, `ldeleteOlderThanIsoDate` (NO `fieldPath` param, constrained to `value.receivedAt` per Oracle), `cleanupEmptyListMeta`
  - All wrapped in `withDb()` pattern
- `lib/schemas/imap.ts`: Zod schema for IMAP settings + `action='test'` variant
- `app/api/admin/imap/route.ts`: `runtime='nodejs'`, `dynamic='force-dynamic'`, Zod validation, test connection path
- `app/api/inbox/route.ts`: replaced 22-line version with v1's 180-line version
  - `runtime='nodejs'`, `dynamic='force-dynamic'`
  - IMAP fetch path with `sourceId` dedup
  - `?resync=1` support
  - DELETE handler via `ldeleteByIds`
  - Webhook emails coexist with IMAP
- `components/admin/imap-section.tsx`: IMAP settings UI (glassmorphism, Test Connection + Save)
- `components/admin-dashboard.tsx`: wired ImapSection between DomainsSection and TelegramSection
- `components/admin/types.ts`: added ImapSettings type
- `lib/__tests__/imap-fetch.test.ts` — 71 tests (parseHeaders, decodeMime, decodeQP, extractEmails, buildPreview, stripHeaders, escapeHtml, normalizeBody, parseReceivedAt, lastUidKey)
- `lib/__tests__/storage.test.ts` — 14 tests (ldeleteByIds, ldeleteOlderThanIsoDate, cleanup, fallback)
- **175 tests pass, build clean**

## Phase 9: Inbox Interface Refactor
- `components/inbox/types.ts`: shared Email + EmailAttachment interfaces
- `components/inbox/email-list.tsx`: EmailList (140 lines) — search, filter, empty states
- `components/inbox/email-viewer.tsx`: EmailViewer (114 lines) — iframe HTML, attachments, OTP highlight
- `components/inbox/domain-selector.tsx`: DomainSelector (73 lines) — animated dropdown
- `components/inbox/history-dropdown.tsx`: HistoryDropdown (120 lines) — persistent address history
- `components/inbox-interface.tsx`: slimmed from 926 → 642 lines (orchestrator)
- **175 tests pass, build clean**

## Phase 10: Documentation & Changelog
- Updated README.md (WEBHOOK_SECRET, multi-subdomain, IMAP, seed script, dev bypass)
- Updated AGENTS.md files (root, lib, app/api, components)
- Updated CLAUDE.md (new working rules: test before commit, Zod for new routes, runtime='nodejs' for IMAP)
- Created `docs/fork-changelog.md` (this file)
- Marked all plan checkboxes complete
- **Final: 175 tests pass, lint+build clean**

---

## Summary

| Metric | v2 (base) | Fork (after Phase 10) |
|--------|-----------|----------------------|
| Test framework | None | Vitest |
| Test count | 0 | 175 |
| Validation | Manual type guards | Zod at API boundaries |
| Webhook auth | None (open) | Fail-closed shared secret |
| Domain config | Hardcoded fallback | Admin-configured, async, multi-subdomain |
| IMAP fetch | Removed | Ported from v1, runtime-hardened |
| CI/CD | Worker deploy only | lint+test+build workflow |
| admin-dashboard.tsx | 778 lines | 460 lines (6 section components) |
| inbox-interface.tsx | 926 lines | 642 lines (4 section components) |
| Storage methods | 8 (read/write only) | 10 (+ldeleteByIds, +ldeleteOlderThanIsoDate) |
