# Dispoflare Migration Inventory

## Purpose

This file captures the only legacy inputs that must be referenced during the replacement of `temp-mail` with `jawkills/dispoflare`.

## Domains to preserve

- `bukanrst.online`
- `digitalinid.cloud`
- `halimwin.my.id`
- `bukanrst.my.id`
- `antek2asing.web.id`
- `akupunjing.my.id`

## Legacy subdomain pools

- `bukanrst.online`: `k9m2x`, `q3n8v`, `t6p1z`, `u7w4a`, `w4r8y`
- `digitalinid.cloud`: `a8v2k`, `b2t9j`, `m3q7w`, `r8x4p`, `z5n1c`
- `halimwin.my.id`: `a7k3m`, `x9p2n`, `b4q8r`, `t6y1z`, `c5w0d`
- `bukanrst.my.id`: `h2j9s`, `m3v7k`, `f8l1p`, `g6u4e`, `d0r5o`
- `antek2asing.web.id`: none
- `akupunjing.my.id`: none

## Legacy Wrangler references

- Worker name: `temp-mail`
- D1 database name: `temp-mail-d1`
- D1 database id: `3b09eefc-0fee-4793-a990-4ba4422943c2`
- Cron schedule: `0 */2 * * *`

## Notes

- Old email data will not be migrated.
- Old API compatibility will not be preserved.
- These values are reference inputs for the new `dispoflare` setup only.
