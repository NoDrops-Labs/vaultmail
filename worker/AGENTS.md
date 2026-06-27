# AGENTS.md — v2/vaultmail/worker

**Generated:** 2026-06-26
**Role:** Cloudflare Worker for inbound email ingestion. Separate package, deploys via Wrangler.

## STRUCTURE

```
worker/
├── package.json       # name: dispomail-worker, dep: postal-mime, devDep: wrangler
├── wrangler.toml      # name=dispomail-forwarder, main=src/index.js
└── src/
    └── index.js       # Email handler: parse → forward → webhook
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Modify email parsing/forwarding | `src/index.js` |
| Change worker name | `wrangler.toml` `name` field |
| Add dependencies | `package.json` (worker-scoped, not shared with app) |

## CONVENTIONS

- **Runtime**: Cloudflare Workers (JS, not TS). `compatibility_date = "2023-12-01"`.
- **Entry**: Default export `{ async email(message, env, ctx) }` — Cloudflare Email Worker signature.
- **Parsing**: `postal-mime` parses raw email (`message.raw` → `ArrayBuffer` → `parse()`).
- **Forwarding**: `message.forward(forwardEmail)` if `FORWARD_DOMAINS` matches recipient domain AND `FORWARD_EMAIL` set.
- **Webhook**: `fetch(env.WEBHOOK_URL, { method: 'POST', body: JSON.stringify({...}) })`. Attachments base64-encoded.
- **Error handling**: `try/catch` → `message.setReject()` on failure. Log via `console.error`.
- **Env vars**: `WEBHOOK_URL` (required), `FORWARD_DOMAINS` (comma-separated), `FORWARD_EMAIL` (optional).
- **Deploy**: `npm run deploy` → `wrangler deploy`. Secrets set via Cloudflare dashboard or `wrangler secret put`.

## ANTI-PATTERNS

- Do NOT convert to TypeScript without updating `wrangler.toml` and build step. Currently plain JS.
- Do NOT use Node.js APIs. Cloudflare Workers runtime only (Web APIs: `fetch`, `btoa`, `Response`).
- Do NOT add `bindings.d.ts` types — that file lives in the parent app and is for the Next.js side, not this worker.
- Do NOT share `node_modules` with parent app. Worker has its own `package.json` and `package-lock.json`.

## NOTES

- Worker name: `dispomail-forwarder` (in `wrangler.toml`). Cloudflare Email Routing catch-all routes to this worker.
- `bindings.d.ts` in parent `v2/vaultmail/` declares a Cloudflare `Env` interface but is legacy scaffolding — this worker does not use it. Env vars are plain strings.
- Attachment content base64-encoded via manual `Uint8Array` → `btoa()` loop (no Node `Buffer` in Workers runtime).
- Sender parsing has elaborate fallback chain: `sender.value[0]` → `from.value[0]` → `from.text` → domain-derived name → raw `message.from`.
- GitHub Actions workflow `.github/workflows/worker-deploy.yml` deploys on push to `worker/` changes.
