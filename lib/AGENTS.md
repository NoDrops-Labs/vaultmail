# AGENTS.md — v2/vaultmail/lib

**Generated:** 2026-06-26
**Role:** Shared logic layer. Imported by `app/` and `components/` via `@/lib/*`.

## STRUCTURE

```
lib/
├── storage.ts            # MongoDB-backed Redis-like API (KV + lists + TTL)
├── storage-keys.ts       # Key builders: inboxKey, inboxPattern, domainExpirationKey, withPrefix
├── admin-auth.ts         # Session cookie name, settings key constants, isAdminSessionValid()
├── auth-rate-limit.ts    # IP-based rate limiter (3 attempts / 5-min lockout)
├── homepage-lock.ts      # Homepage password gate settings + SHA256 hashing
├── domains.ts            # Domain list normalization, parsing, MongoDB-backed getter
├── domain-expiration.ts  # WHOIS lookup + 24h cache via whois-search.vercel.app
├── branding.ts           # DEFAULT_APP_NAME constant, normalizeAppName()
├── branding-settings.ts  # Dynamic app name from storage
├── config.ts             # No hardcoded fallback; getDefaultEmailDomain() returns ''
├── i18n.ts               # SUPPORTED_LOCALES=['en','id'], translations, getTranslations()
└── utils.ts              # cn() classNames, extractEmail(), getSenderInfo()
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Add storage operation | `storage.ts` (extend `storage` object) |
| Add settings namespace | `admin-auth.ts` (add `XXX_SETTINGS_KEY = withPrefix('settings:xxx')`) + new `lib/xxx-settings.ts` |
| Add i18n key | `i18n.ts` (add to BOTH `en` and `id` objects) |
| Parse sender/from header | `utils.ts` `getSenderInfo()` |
| Add domain validation | `domains.ts` |
| Add rate-limited endpoint | `auth-rate-limit.ts` `checkRateLimit` / `registerRateLimitFailure` |

## CONVENTIONS

- **Storage API** (`storage.ts`): Redis-like over MongoDB. Methods: `get`, `set` (with `{ ex: seconds }`), `del`, `exists`, `expire`, `lpush`, `lrange`, `llen`, `keys` (glob pattern). Collections: `kv_store`, `list_meta`, `list_items`.
- **Graceful fallback**: `withDb<T>(fallback, action)` returns `fallback` if `MONGODB_URI` unset. Module-level `warnedMissingMongo` flag prevents spam. Follow for new storage-dependent modules.
- **Settings module pattern**: 
  1. Define `type XxxSettings` 
  2. `parseXxxSettings(value: unknown): XxxSettings | null` (handles string-JSON, object, null) 
  3. `getXxxSettings()` async getter reading from storage with default fallback.
- **Key naming**: `withPrefix(key)` is identity (no-op). Use colon-separated: `inbox:<addr>`, `settings:<name>`, `domain:expiration:<domain>`, `admin:session:<token>`, `<prefix>:lockout:<ip>`, `<prefix>:attempts:<ip>`.
- **i18n**: `as const` assertion on `SUPPORTED_LOCALES`, `Locale` type derived via `(typeof SUPPORTED_LOCALES)[number]`. `getRetentionOptions(locale)` returns `[{label, value}]`.
- **No classes**: All modules export functions/constants. No OOP.
- **No Zod**: Manual `typeof`/`Array.isArray`/`JSON.parse` with try/catch.

## ANTI-PATTERNS

- Do NOT throw on missing `MONGODB_URI`. Use `withDb()` fallback.
- Do NOT add `@ts-ignore` or `as any`. Strict mode.
- Do NOT introduce Zod / Joi / yup. Manual parsing is the established pattern.
- Do NOT call `MongoClient` directly outside `storage.ts`. All DB access goes through `storage.*`.
- Do NOT use `withPrefix()` for namespacing — it's a no-op. Keys are bare strings.
- Do NOT add `imap-fetch.ts` or v1 storage methods (`ldeleteByIds`, `ldeleteOlderThanIsoDate`, `lclear`). Intentionally dropped in v2.

## NOTES

- `storage.ts` uses a lazy singleton `clientPromise`. First call connects, reused thereafter.
- `list_items` sorted by `createdAt: -1, _id: -1` (LIFO). `lpush` inserts new item + updates `list_meta`.
- TTL cleanup is lazy: `cleanupExpiredList` runs on read. Orphaned items possible if meta deleted but items not.
- `auth-rate-limit.ts` reads `x-forwarded-for` (first IP), `x-real-ip`, `cf-connecting-ip` in that order.
- `domain-expiration.ts` calls external `https://whois-search.vercel.app/api/lookup?query=<domain>`. 24h cache.
- `homepage-lock.ts` uses unsalted SHA256 for password hashing (known weakness; do not copy pattern for new auth).
