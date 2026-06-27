# My Vaultmail Fork

Fork of v2/vaultmail with expanded features: IMAP fetch (ported from v1), multi-subdomain domain config, Vitest tests, Zod validation at API boundaries, fail-closed webhook auth, CI/CD, component refactoring.

## Current Shape

- Frontend app code lives under `app/`.
- Shared UI code lives under `components/` (with `components/admin/` and `components/inbox/` subdirs after refactor).
- Shared helpers live under `lib/` (with `lib/schemas/` for Zod schemas, `lib/__tests__/` for Vitest).
- Static assets live under `public/`.
- Worker code lives under `worker/`.
- Root config files include `package.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`, `vitest.config.ts`.

## Working Rules

- Keep the import boundary minimal. Do not add back removed upstream extras such as `.design/` unless explicitly requested.
- Preserve local docs under `docs/migration/` and `docs/superpowers/`.
- Prefer small, surgical edits over broad refactors.
- Use the existing package scripts when verifying changes:
  - `npm run lint`
  - `npm test`
  - `npm run build`
- Test before commit. New routes must use Zod validation at API boundaries.
- IMAP routes must set `export const runtime = 'nodejs'` (uses Node `tls` module).
- Do not introduce `@ts-ignore` or `as any`. Strict mode is on.

## Notes

- This file is worktree-local guidance for future implementation tasks, not product documentation.
- Implementation plan: `docs/plans/2026-06-26-fork-expansion.md`.
- Fork changelog: `docs/fork-changelog.md` (created in Phase 10).
