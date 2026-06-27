# Multi-Subdomain Email Design

## Overview

This project currently supports exact-match email domains from `src/config/domains.ts`. The current production Cloudflare Email Routing setup has been expanded so that these root domains remain active:

- `bukanrst.online`
- `digitalinid.cloud`

In addition, Cloudflare Email Routing subdomains have been explicitly enabled for a fixed pool of email-receiving subdomains under each root domain.

The product goal is to support both root-domain addresses and subdomain-based addresses while exposing the final selectable domains directly in the UI.

## Goals

- Keep root-domain addresses valid and usable.
- Support a fixed pool of explicitly enabled Cloudflare email subdomains.
- Show the final supported inbox domains directly in a single UI selector.
- Ensure backend validation accepts only configured root domains and configured active subdomains.
- Avoid schema changes in D1 unless they are strictly necessary.

## Non-Goals

- Support arbitrary wildcard subdomains that have not been provisioned in Cloudflare.
- Automatically create or remove Cloudflare Email Routing subdomains from the application.
- Redesign the overall email storage model.

## Confirmed Cloudflare Setup

Cloudflare Email Routing is enabled for all configured root domains, with catch-all routing already configured to the Worker.

The following subdomains have also been explicitly enabled in Cloudflare Email Routing.

### `bukanrst.online`

- `k9m2x.bukanrst.online`
- `q3n8v.bukanrst.online`
- `t6p1z.bukanrst.online`
- `u7w4a.bukanrst.online`
- `w4r8y.bukanrst.online`

### `digitalinid.cloud`

- `a8v2k.digitalinid.cloud`
- `b2t9j.digitalinid.cloud`
- `m3q7w.digitalinid.cloud`
- `r8x4p.digitalinid.cloud`
- `z5n1c.digitalinid.cloud`

### `halimwin.my.id`

- `a7k3m.halimwin.my.id`
- `x9p2n.halimwin.my.id`
- `b4q8r.halimwin.my.id`
- `t6y1z.halimwin.my.id`
- `c5w0d.halimwin.my.id`

### `bukanrst.my.id`

- `h2j9s.bukanrst.my.id`
- `m3v7k.bukanrst.my.id`
- `f8l1p.bukanrst.my.id`
- `g6u4e.bukanrst.my.id`
- `d0r5o.bukanrst.my.id`

These lists are the authoritative pool of supported subdomains for the application unless they are updated in both Cloudflare and the codebase.

## User Experience

### Domain Selection

The main UI domain selector should display the full set of final receiving domains in one flat list.

That list includes both:

- root domains
- configured subdomains

Example order:

- `bukanrst.online`
- `k9m2x.bukanrst.online`
- `q3n8v.bukanrst.online`
- `t6p1z.bukanrst.online`
- `u7w4a.bukanrst.online`
- `w4r8y.bukanrst.online`
- `digitalinid.cloud`
- `a8v2k.digitalinid.cloud`
- `b2t9j.digitalinid.cloud`
- `m3q7w.digitalinid.cloud`
- `r8x4p.digitalinid.cloud`
- `z5n1c.digitalinid.cloud`
- `halimwin.my.id`
- `a7k3m.halimwin.my.id`
- `x9p2n.halimwin.my.id`
- `b4q8r.halimwin.my.id`
- `t6y1z.halimwin.my.id`
- `c5w0d.halimwin.my.id`
- `bukanrst.my.id`
- `h2j9s.bukanrst.my.id`
- `m3v7k.bukanrst.my.id`
- `f8l1p.bukanrst.my.id`
- `g6u4e.bukanrst.my.id`
- `d0r5o.bukanrst.my.id`

The selector should not split these into separate controls or require the user to switch between root and subdomain modes.

### Final Address Preview

The final address preview must always show the real address that will be queried by the API and used for inbox lookups.

Examples:

- `abcde@bukanrst.online`
- `abcde@digitalinid.cloud`
- `abcde@u7w4a.bukanrst.online`
- `abcde@a8v2k.digitalinid.cloud`
- `abcde@halimwin.my.id`
- `abcde@a7k3m.halimwin.my.id`
- `abcde@bukanrst.my.id`
- `abcde@h2j9s.bukanrst.my.id`

### Selector Behavior

The selected option in the dropdown is the actual domain used to build the final inbox address.

Behavior:

- user enters the local part
- user selects one final domain from the dropdown
- application builds `<local>@<selected-domain>`
- preview updates immediately to the final inbox address

There is no hidden subdomain randomization step once the selector is shown. The UI should remain stable and explicit about the final domain being used.

## Configuration Model

The current `DOMAINS` config should evolve from a flat list of exact-match domains into a structure that can express:

- master domain metadata
- whether root mode is allowed
- active subdomain pool

Conceptually, each master domain needs:

- `domain`: the master domain shown in the UI
- `owner`: existing metadata can remain
- `allowRoot`: whether `<local>@<domain>` is valid
- `subdomains`: the allowed subdomain labels for that master domain

This keeps the backend validation rules and the UI's final-domain selector derivation in one source of truth.

The UI can derive the flat final-domain list from this config by expanding each master domain into:

- the root domain itself when `allowRoot` is true
- each configured subdomain under that master domain

## Backend Validation

The application currently validates domains by exact match against `DOMAINS_SET`. That is no longer sufficient.

The new validation rules should be:

1. Accept exact root-domain addresses when `allowRoot` is enabled for the selected master domain.
2. Accept subdomain addresses only when the full domain matches one of the configured active subdomains.
3. Reject domains that merely look similar, such as:
   - `fakebukanrst.online`
   - `u7w4a.fakebukanrst.online`
   - `random.unconfigured.digitalinid.cloud`

Validation should remain strict and configuration-driven. The code should not accept arbitrary nested subdomains just because they end with the same suffix.

## API Behavior

### `/domains`

The `/domains` endpoint may remain useful for API consumers and continue to represent master domains, not the expanded set of final receiving domains.

The endpoint response should make it clear that:

- these are supported master domains
- final receiving domains may be either the root domain or one configured subdomain beneath the master domain

The UI does not need to depend on `/domains` for its final dropdown as long as the bootstrap config already contains the full domain structure.

### Email and Attachment Endpoints

Endpoints that accept an email address should work with both:

- root-domain addresses
- configured subdomain addresses

No route shape changes are required as long as validation is updated correctly.

## Data Model

No D1 schema change is required.

Rationale:

- email addresses are already stored as full strings
- root and subdomain addresses both fit naturally into the existing `to_address` field
- attachment and lookup logic can continue to use the full email address as the key input

## Error Handling

When an email address is rejected because of domain validation, the response should continue to explain that the domain is unsupported.

The error payload should help the client understand the allowed top-level choices without claiming that arbitrary subdomains are supported.

The safest minimal behavior is:

- continue returning supported master domains
- optionally expand later with a richer explanation if the UI needs it

## Testing

At minimum, verification should cover:

### Valid root domains

- `name@bukanrst.online`
- `name@digitalinid.cloud`
- `name@halimwin.my.id`
- `name@bukanrst.my.id`

### Valid configured subdomains

- `name@u7w4a.bukanrst.online`
- `name@k9m2x.bukanrst.online`
- `name@a8v2k.digitalinid.cloud`
- `name@z5n1c.digitalinid.cloud`
- `name@a7k3m.halimwin.my.id`
- `name@x9p2n.halimwin.my.id`
- `name@h2j9s.bukanrst.my.id`
- `name@d0r5o.bukanrst.my.id`

### Invalid unconfigured domains

- `name@unknown.bukanrst.online`
- `name@unknown.digitalinid.cloud`
- `name@unknown.halimwin.my.id`
- `name@unknown.bukanrst.my.id`
- `name@fakebukanrst.online`
- `name@random.fake.digitalinid.cloud`

### UI behavior

- domain selector shows root domains and configured subdomains in one flat list
- preview always reflects the actual final address
- selecting any option uses that exact domain directly in the generated address

## Implementation Notes

- Prefer one canonical configuration source for root domains and subdomain pools.
- Keep changes minimal and local to existing domain validation and client preview logic.
- Do not add backward-compatibility paths for unconfigured wildcard subdomains.
- Do not change storage schema unless later work proves it necessary.

## Recommended Rollout

1. Update domain configuration structure.
2. Update backend validation to accept root domains and configured subdomains.
3. Update UI to expand the config into a flat dropdown of final domains and remove any separate mode switch.
4. Verify API requests against both root and subdomain addresses.
5. Run project checks and targeted manual tests with known enabled subdomains.

## Open Decisions Resolved

- Root domains remain active: yes.
- UI domain selector shows final selectable domains directly: yes.
- Subdomain support is limited to the explicitly provisioned Cloudflare pool: yes.
