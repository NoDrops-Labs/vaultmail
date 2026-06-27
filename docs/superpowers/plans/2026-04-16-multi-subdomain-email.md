# Multi-Subdomain Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add support for root-domain and configured subdomain email addresses while exposing the full set of final selectable inbox domains directly in the temp-mail UI.

**Architecture:** Replace the flat domain allowlist with a single configuration object that describes each master domain, whether root addresses are allowed, and which Cloudflare-enabled subdomains are valid. Reuse that configuration in backend validation, API/domain docs, and the temp-mail UI so the client can expand it into a flat list of final selectable domains, with each dropdown option mapping directly to the actual inbox domain used for polling.

**Tech Stack:** TypeScript, Hono, Zod OpenAPI, Cloudflare Workers, Bun, Biome

---

## File Map

- Modify: `src/config/domains.ts`
  Central source of truth for master domains, root-mode availability, and enabled subdomain pools.
- Modify: `src/utils/validation.ts`
  Domain validation logic for exact root domains and configured subdomains.
- Modify: `src/routes/emailRoutes.ts`
  `/domains` route should return master domains while keeping cache headers correct.
- Modify: `src/routes/uiRoutes.ts`
  Pass richer domain configuration into the temp-mail page while preserving current route shape.
- Modify: `src/schemas/emails/index.ts`
  Update OpenAPI examples and supported-domain notes to reflect master domains instead of exact-match only domains.
- Modify: `src/schemas/emails/routeDefinitions.ts`
  Update route descriptions so they describe master domains and configured subdomains accurately.
- Modify: `src/utils/docs.ts`
  Update generated OpenAPI intro text for the new domain model.
- Modify: `src/tempmail/page.tsx`
  Pass richer UI configuration to the client bootstrap while keeping rendered sections simple.
- Modify: `src/tempmail/client.ts`
  Expand the config into a flat final-domain dropdown and build the final address directly from the selected option.
- Modify: `src/tempmail/sections.tsx`
  Remove the root/subdomain switch UI and keep a single domain selector.
- Modify: `src/tempmail/styles.ts`
  Remove obsolete mode-switch styling and keep the selector layout clean.

## Task 1: Restructure Domain Configuration

**Files:**
- Modify: `src/config/domains.ts`

- [ ] **Step 1: Write the failing type-level usage first**

Define the target config shape directly in `src/config/domains.ts` by replacing the old flat array with this structure:

```ts
export const DOMAINS = [
	{
		owner: "HALIM WINANDAR",
		domain: "bukanrst.online",
		allowRoot: true,
		subdomains: ["k9m2x", "q3n8v", "t6p1z", "u7w4a", "w4r8y"],
	},
	{
		owner: "HALIM WINANDAR",
		domain: "digitalinid.cloud",
		allowRoot: true,
		subdomains: ["a8v2k", "b2t9j", "m3q7w", "r8x4p", "z5n1c"],
	},
	{
		owner: "HALIM WINANDAR",
		domain: "halimwin.my.id",
		allowRoot: true,
		subdomains: ["a7k3m", "x9p2n", "b4q8r", "t6y1z", "c5w0d"],
	},
	{
		owner: "HALIM WINANDAR",
		domain: "bukanrst.my.id",
		allowRoot: true,
		subdomains: ["h2j9s", "m3v7k", "f8l1p", "g6u4e", "d0r5o"],
	},
] satisfies {
	owner: string;
	domain: string;
	allowRoot: boolean;
	subdomains: string[];
}[];
```

- [ ] **Step 2: Add derived exports that the rest of the code can use**

Add these exports below the new `DOMAINS` definition:

```ts
export const MASTER_DOMAINS = DOMAINS.map((entry) => entry.domain);

export const MASTER_DOMAIN_SET = new Set(MASTER_DOMAINS);

export const SUPPORTED_EMAIL_DOMAINS = DOMAINS.flatMap((entry) => {
	const subdomainDomains = entry.subdomains.map((label) => `${label}.${entry.domain}`);
	return entry.allowRoot ? [entry.domain, ...subdomainDomains] : subdomainDomains;
});

export const SUPPORTED_EMAIL_DOMAIN_SET = new Set(SUPPORTED_EMAIL_DOMAINS);
```

- [ ] **Step 3: Run TypeScript to verify old imports now fail where expected**

Run: `bun run tsc`

Expected: FAIL with import/type errors in files that still reference `DOMAINS_SET`.

- [ ] **Step 4: Keep the new config as the canonical source of truth**

Do not add compatibility aliases like `DOMAINS_SET`. The point of this step is to force downstream updates to use the new names and remove exact-match assumptions.

- [ ] **Step 5: Commit**

```bash
git add src/config/domains.ts
git commit -m "feat: expand domain config for subdomain pools"
```

## Task 2: Update Backend Validation for Root and Configured Subdomains

**Files:**
- Modify: `src/utils/validation.ts`
- Modify: `src/routes/emailRoutes.ts`
- Modify: `src/routes/attachmentRoutes.ts`

- [ ] **Step 1: Replace exact-match validation with config-backed validation**

Update `src/utils/validation.ts` to use the new derived exports:

```ts
import { MASTER_DOMAINS, SUPPORTED_EMAIL_DOMAIN_SET } from "@/config/domains";
import { ERR } from "@/utils/http";
import { getDomain } from "@/utils/mail";

export function validateEmailDomain(emailAddress: string) {
	const domain = getDomain(emailAddress);
	if (!SUPPORTED_EMAIL_DOMAIN_SET.has(domain)) {
		return {
			valid: false,
			error: ERR("Domain not supported", "DomainError", {
				supported_domains: MASTER_DOMAINS,
			}),
		};
	}

	return { valid: true };
}
```

- [ ] **Step 2: Update `/domains` response to return master domains only**

In `src/routes/emailRoutes.ts`, replace the old imports and response values:

```ts
import { MASTER_DOMAINS } from "@/config/domains";
```

and:

```ts
c.header("ETag", `"domains-${MASTER_DOMAINS.length}"`);
return c.json(OK(MASTER_DOMAINS));
```

- [ ] **Step 3: Keep attachment routes using the shared validator without extra branching**

Do not add new attachment-specific domain logic. `src/routes/attachmentRoutes.ts` should continue to call `validateEmailDomain(emailAddress)` and therefore inherit subdomain support automatically.

- [ ] **Step 4: Run TypeScript to verify validation wiring compiles**

Run: `bun run tsc`

Expected: FAIL only in remaining docs/schema/UI files that still import `DOMAINS_SET` or assume flat domains.

- [ ] **Step 5: Commit**

```bash
git add src/utils/validation.ts src/routes/emailRoutes.ts src/routes/attachmentRoutes.ts
git commit -m "fix: validate configured root and subdomain emails"
```

## Task 3: Update Schemas and Generated API Documentation

**Files:**
- Modify: `src/schemas/emails/index.ts`
- Modify: `src/schemas/emails/routeDefinitions.ts`
- Modify: `src/utils/docs.ts`

- [ ] **Step 1: Update schema examples to use master-domain exports**

In `src/schemas/emails/index.ts`, replace the old import:

```ts
import { MASTER_DOMAINS } from "@/config/domains";
```

Then update examples in `domainsSuccessResponseSchema` and `domainErrorResponseSchema`:

```ts
example: MASTER_DOMAINS,
```

This keeps the docs aligned with the UI-facing `/domains` behavior.

- [ ] **Step 2: Clarify route descriptions for supported domains**

In `src/schemas/emails/routeDefinitions.ts`, replace text that implies exact-match domain-only support with text like this:

```ts
description: "Domain not supported - returns supported master domains"
```

and for the domains route:

```ts
description: "List of selectable master email domains"
summary: "Get master domains"
description: "Retrieve the master domains used by the temp-mail UI. Final receiving addresses may use either the root domain or a configured subdomain under one of these master domains."
```

- [ ] **Step 3: Update top-level generated API docs**

In `src/utils/docs.ts`, replace the old import:

```ts
import { MASTER_DOMAINS } from "@/config/domains";
```

Then adjust the supported domains section to say:

```ts
## Supported Domains
This API exposes the following master domains in the UI:
${`\n${MASTER_DOMAINS.map((domain) => `- ${domain}`).join("\n")}`}

Inbox addresses may use either the root domain or a configured subdomain under one of these master domains.
```

- [ ] **Step 4: Run TypeScript to verify docs/schema changes compile**

Run: `bun run tsc`

Expected: FAIL only in the remaining UI files that still import or consume flat domain arrays incorrectly.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/emails/index.ts src/schemas/emails/routeDefinitions.ts src/utils/docs.ts
git commit -m "docs: describe master domains and configured subdomains"
```

## Task 4: Pass Rich Domain Metadata Into the Temp-Mail UI

**Files:**
- Modify: `src/routes/uiRoutes.ts`
- Modify: `src/tempmail/page.tsx`

- [ ] **Step 1: Update the UI route to pass full domain config**

In `src/routes/uiRoutes.ts`, replace the current route handler with:

```ts
import { Hono } from "hono";
import { DOMAINS, MASTER_DOMAINS } from "@/config/domains";
import { TempMailPage } from "@/tempmail/page";

const uiRoutes = new Hono<{ Bindings: CloudflareBindings }>();

uiRoutes.get("/", (c) =>
	c.html(
		TempMailPage({
			domains: MASTER_DOMAINS,
			domainConfig: DOMAINS,
		}),
	),
);

export default uiRoutes;
```

- [ ] **Step 2: Update page props and script bootstrap**

In `src/tempmail/page.tsx`, expand the props and pass the new config to the client bootstrap:

```ts
type TempMailPageProps = {
	domains: string[];
	domainConfig: {
		owner: string;
		domain: string;
		allowRoot: boolean;
		subdomains: string[];
	}[];
};

export function TempMailPage({ domains, domainConfig }: TempMailPageProps) {
	const defaultDomain = domains[0] ?? "";
	const clientScript = createTempmailClientScript(domainConfig, defaultDomain);

	return (
		<html lang="en">
			...
			<TempMailAddressWorkflow domains={domains} defaultDomain={defaultDomain} />
			...
			<script>{raw(clientScript)}</script>
		</html>
	);
}
```

Only the client bootstrap should receive the richer config; the visible workflow component can keep the existing `domains` prop unless later implementation proves it needs more.

- [ ] **Step 3: Run TypeScript to capture the now-expected client signature error**

Run: `bun run tsc`

Expected: FAIL in `src/tempmail/client.ts` because `createTempmailClientScript` still expects `string[]`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/uiRoutes.ts src/tempmail/page.tsx
git commit -m "refactor: pass domain metadata into tempmail page"
```

## Task 5: Flatten Final Domains in the Client UI

**Files:**
- Modify: `src/tempmail/client.ts`
- Modify: `src/tempmail/sections.tsx`
- Modify: `src/tempmail/styles.ts`

- [ ] **Step 1: Change the client bootstrap signature and expand final domains**

Update the function signature at the top of `src/tempmail/client.ts`:

```ts
type TempMailDomainConfig = {
	owner: string;
	domain: string;
	allowRoot: boolean;
	subdomains: string[];
};

export function createTempmailClientScript(
	domainConfig: TempMailDomainConfig[],
	defaultDomain: string,
) {
	return `
		const DOMAIN_CONFIG = ${asJson(domainConfig)};
		const DOMAINS = DOMAIN_CONFIG.flatMap(entry => {
			const expanded = entry.subdomains.map(label => label + "." + entry.domain);
			return entry.allowRoot ? [entry.domain, ...expanded] : expanded;
		});
		const DEFAULT_DOMAIN = ${asJson(defaultDomain)};
		...
	`;
}
```

- [ ] **Step 2: Simplify final address generation to use the selected domain directly**

Replace the current multi-step domain composition logic with a direct address builder:

```js
		function buildAddress() {
			const local = sanitizeLocalPart(localPartInput.value || "");
			const selectedDomain = domainSelect.value;
			return local && selectedDomain ? local + "@" + selectedDomain : "";
		}
```

Keep all API calls using `state.address` so inbox polling always uses the real final address.

- [ ] **Step 3: Remove mode-switch event wiring and helper usage**

Delete any client code that reads `input[name="domainMode"]`, computes root/subdomain modes, or binds radio change handlers. The dropdown is now the only source of domain selection.

- [ ] **Step 4: Keep the rendered dropdown stable and explicit**

When the client renders `domainSelect`, it should use the already-expanded `DOMAINS` list directly:

```js
		function renderDomains() {
			domainSelect.innerHTML = DOMAINS
				.map((domain) => '<option value="' + domain + '">@' + domain + '</option>')
				.join("");
			domainSelect.value = DEFAULT_DOMAIN;
			if (domainChips) {
				domainChips.innerHTML = DOMAINS
					.map((domain) => '<span class="domain-chip">' + escapeHtml(domain) + '</span>')
					.join("");
			}
		}
```

Set `DEFAULT_DOMAIN` to the first expanded final domain, which should remain `bukanrst.online` if the config order is unchanged.

- [ ] **Step 5: Remove the switch UI markup from the workflow section**

In `src/tempmail/sections.tsx`, delete the radio-group block entirely so the workflow keeps only the input, dropdown, and generate button inside the main shell.

- [ ] **Step 6: Remove obsolete switch styles**

In `src/tempmail/styles.ts`, delete the `.gm-mode-switch`, `.gm-mode-option`, and related radio styling rules that were only needed for the removed switch.

- [ ] **Step 7: Run TypeScript to verify the UI/client compiles**

Run: `bun run tsc`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/tempmail/client.ts src/tempmail/sections.tsx src/tempmail/styles.ts
git commit -m "feat: flatten final email domains in tempmail UI"
```

## Task 6: Verify Lint, Types, and Manual Inbox Paths

**Files:**
- No code changes required unless verification fails.

- [ ] **Step 1: Run type checking**

Run: `bun run tsc`

Expected: PASS with no type errors.

- [ ] **Step 2: Run project checks**

Run: `bun run check`

Expected: PASS with no Biome errors in modified source files.

- [ ] **Step 3: Run a manual browser verification in local or remote dev**

Run: `bun run dev`

Then verify these flows in the UI:

- domain selector shows both root domains and configured subdomains in one flat list
- preview can produce `local@bukanrst.online`
- preview can produce `local@u7w4a.bukanrst.online`
- preview can produce `local@digitalinid.cloud`
- preview can produce `local@a8v2k.digitalinid.cloud`
- preview can produce `local@halimwin.my.id`
- preview can produce `local@a7k3m.halimwin.my.id`
- preview can produce `local@bukanrst.my.id`
- preview can produce `local@h2j9s.bukanrst.my.id`
- selecting a different dropdown option immediately changes the final address preview

- [ ] **Step 4: Run live API verification for known valid and invalid addresses**

With the worker running, verify these requests return the expected status:

```bash
curl "http://127.0.0.1:8787/domains"
curl "http://127.0.0.1:8787/emails/count/test@bukanrst.online"
curl "http://127.0.0.1:8787/emails/count/test@u7w4a.bukanrst.online"
curl "http://127.0.0.1:8787/emails/count/test@a8v2k.digitalinid.cloud"
curl "http://127.0.0.1:8787/emails/count/test@halimwin.my.id"
curl "http://127.0.0.1:8787/emails/count/test@a7k3m.halimwin.my.id"
curl "http://127.0.0.1:8787/emails/count/test@bukanrst.my.id"
curl "http://127.0.0.1:8787/emails/count/test@h2j9s.bukanrst.my.id"
curl "http://127.0.0.1:8787/emails/count/test@unknown.bukanrst.online"
curl "http://127.0.0.1:8787/emails/count/test@unknown.halimwin.my.id"
```

Expected:

- `/domains` returns the configured master domains only
- known root and configured subdomain addresses return success responses from the route layer
- unknown subdomains return `404` with `DomainError`

- [ ] **Step 5: Commit verification-only follow-up if needed**

```bash
git add .
git commit -m "chore: verify multi-subdomain email support"
```

Only create this commit if verification uncovered and required a final fix.
