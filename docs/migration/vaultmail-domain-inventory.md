# Vaultmail Migration Inventory

## Purpose

This file captures the only legacy inputs that must survive the replacement of the current `dispoflare` repository with `jawkills/vaultmail`.

## Domains to preserve

- `bukanrst.online`
- `digitalinid.cloud`
- `halimwin.my.id`
- `bukanrst.my.id`
- `antek2asing.web.id`
- `akupunjing.my.id`

## Reference subdomain pools

- `bukanrst.online`: `k9m2x`, `q3n8v`, `t6p1z`, `u7w4a`, `w4r8y`
- `digitalinid.cloud`: `a8v2k`, `b2t9j`, `m3q7w`, `r8x4p`, `z5n1c`
- `halimwin.my.id`: `a7k3m`, `x9p2n`, `b4q8r`, `t6y1z`, `c5w0d`
- `bukanrst.my.id`: `h2j9s`, `m3v7k`, `f8l1p`, `g6u4e`, `d0r5o`
- `antek2asing.web.id`: none
- `akupunjing.my.id`: none

## Deployment direction

- Main app target: Vercel
- Database target: MongoDB
- Inbound email path: Cloudflare Email Routing -> worker forwarder -> Vercel webhook

## Notes

- Existing `dispoflare` data will not be migrated.
- Existing `dispoflare` configuration will not be migrated.
- These values are reference inputs for the `vaultmail` setup only.
