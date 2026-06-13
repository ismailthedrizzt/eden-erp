# Backup HSTS Ops Limitation Report

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

## Backup

- Önceki stabilization proof DB backup ve document storage backup alabildi.
- Standart `/opt/eden-erp/backups` path bu auditte `missing`.
- Fallback path `/home/edengrup-app1/eden-erp-backups` daha önce 600 permission ile kullanıldı.
- Hiç backup alınamıyor durumu yok; bu P1 ops standardization borcu.

## Reverse Proxy / SSL / Headers

- Public HTTPS `/login`: 200.
- Public FastAPI `/api/v1/health`: 401; public business API auth'suz açılmıyor.
- HTTP/2 public response var.
- HSTS header mevcut: `strict-transport-security: max-age=31536000; includeSubDomains`.

## Release Etkisi

Backup standart path ownership düzeltilmeden release promotion yapılmamalı. HSTS güncel kanıtla P1 olmaktan çıktı, izleme maddesi olarak kalır.
