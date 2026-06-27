# AGENTS.md — v2/vaultmail/components

**Generated:** 2026-06-26
**Role:** React UI components. Page-level features + primitives.

## STRUCTURE

```
components/
├── home-page.tsx              # Main temp-mail UI: address gen, domain select, inbox
├── inbox-interface.tsx        # Email list + viewer, attachments, OTP highlight (926 lines)
├── admin-dashboard.tsx        # Admin panel: branding, domains, retention, telegram, homepage-lock, stats (778 lines)
├── admin-login.tsx            # Admin password login form
├── homepage-lock.tsx          # Password gate UI for home page
├── settings-dialog.tsx        # Settings modal (retention, domains tabs)
├── AdsenseScript.tsx          # AdSense script injection
├── api-access-page.tsx        # Developer API docs page
├── tools-page.tsx             # Tools index page
├── two-factor-page.tsx        # 2FA OTP generator (route: /2fa-gen)
├── gmail-dot-page.tsx         # Gmail dot-trick generator
├── refund-calculator-page.tsx
├── token-generator-page.tsx
├── day-counter-page.tsx
├── url-codec-page.tsx
├── email-breach-page.tsx
└── ui/
    ├── button.tsx             # Reusable button primitive
    └── input.tsx              # Reusable input primitive
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add page component | `components/<name>-page.tsx` + `app/<route>/page.tsx` wrapper |
| Add reusable primitive | `components/ui/<name>.tsx` |
| Modify inbox UI | `inbox-interface.tsx` |
| Modify admin panel | `admin-dashboard.tsx` |
| Add tool page | `components/<name>-page.tsx` + `app/<name>/page.tsx` |

## CONVENTIONS

- **Naming**: Page components `<feature>-page.tsx` exporting `<Feature>Page`. Primitives lowercase `button.tsx`, `input.tsx`.
- **Imports**: `@/lib/*` for logic, `@/components/ui/*` for primitives, `@/components/*` for sibling components.
- **ClassNames**: `cn()` from `@/lib/utils` (clsx + tailwind-merge).
- **Icons**: `lucide-react`.
- **Animation**: `framer-motion`.
- **Toasts**: `sonner` (`toast.success()`, `toast.error()`).
- **Styling**: Tailwind utility classes. Glassmorphism aesthetic. Dark mode default (`<html className="dark">`).
- **i18n**: Components receive `t: Translations` prop from parent. Don't call `getTranslations()` directly in leaf components.
- **Client components**: Add `'use client'` directive when using hooks/refs.
- **Async page components**: `app/*/page.tsx` can be async server components; delegate interactive UI to client components.

## ANTI-PATTERNS

- Do NOT call `storage.*` or MongoDB from components. Fetch via API routes.
- Do NOT inline styles. Use Tailwind classes.
- Do NOT use `any` for props. Define interfaces.
- Do NOT add new UI primitives outside `components/ui/`. Page components stay flat in `components/`.

## NOTES

- `inbox-interface.tsx` (926 lines) and `admin-dashboard.tsx` (778 lines) are the two complexity hotspots. Justified by feature density but candidates for future extraction (EmailListItem, DomainSelector, SettingsSection).
- v2 `inbox-interface.tsx` uses `<iframe>` for HTML email rendering (v1 used direct `dangerouslySetInnerHTML`).
- v2 `admin-dashboard.tsx` dropped v1's IMAP settings and inbox maintenance sections.
- `AdsenseScript.tsx` is the only PascalCase file. Legacy.
