# Worker Ops Limitation Report

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

## Bulgular

- Worker dosyaları mevcut: outbox, email, reminder, reporting, automation, webhook.
- PM2 process manager'da çalışan processler: eden-app online, eden-fastapi online.
- Dedicated worker process görünmüyor.
- Outbox backlog: pending 4.
- Oldest pending outbox event: 2026-05-25 16:23:30 UTC.
- Latest pending outbox event: 2026-06-05 16:57:53 UTC.
- Heartbeat/DLQ/manual retry proof yok.

## Field Test Etkisi

Core synchronous CRUD/lifecycle akışları çalışabilir; async notification/outbox side effect'leri gecikebilir. Eğer kritik official operation completion worker'a bağlıysa P0'a dönebilir; mevcut kanıtla P1.

## Ops Evidence

```text
OPS_STARTED:20260606_154609
┌────┬─────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name            │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ eden-app        │ default     │ N/A     │ fork    │ 2277342  │ 5h     │ 375  │ online    │ 0%       │ 72.0mb   │ edengru… │ disabled │
│ 3  │ eden-fastapi    │ default     │ 0.1.0   │ fork    │ 2277376  │ 5h     │ 50   │ online    │ 0%       │ 156.5mb  │ edengru… │ disabled │
└────┴─────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
OUTBOX_TABLE_CHECK
pending|4|2026-05-25 16:23:30.747513+00|2026-06-05 16:57:53.79611+00
BACKUP_PATH_CHECK
missing
HTTP/2 200 
server: nginx
date: Sat, 06 Jun 2026 15:46:10 GMT
content-type: text/html; charset=utf-8
content-length: 24406
vary: Accept-Encoding
cache-control: no-store, max-age=0
content-security-policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'
cross-origin-opener-policy: same-origin
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-frame-options: DENY
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
x-powered-by: Next.js
etag: "e8g4lf0i8xis2"
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
x-permitted-cross-domain-policies: master-only
referrer-policy: same-origin
alt-svc: h3=":443"; ma=86400

PUBLIC_LOGIN:200
PUBLIC_FASTAPI_HEALTH:401

```
