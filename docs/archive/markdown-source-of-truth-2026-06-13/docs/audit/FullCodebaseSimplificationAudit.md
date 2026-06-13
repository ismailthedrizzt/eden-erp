# Full Codebase Simplification Audit

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

## Executive Summary

Bu audit yeni özellik veya refactor değildir. Kod silinmedi. Amaç, field test başlamadan önce sadeleşme borcunu görünür hale getirmektir.

## Gate Durumu

| Komut | Sonuç | Not |
| --- | --- | --- |
| npm run typecheck | PASS | Shared + targeted TS temiz. |
| npm run build | PASS | Next production build tamamlandı. |
| npm run release:check | PASS | 146 registry route, 146 page route. |
| npm run env:safety | PASS | Release env safety temiz. |
| npm run db:target:check | PASS | app1db release DB olarak sınıflandı. |
| npm run migration:status | PASS | 521 route, 422 explicit header, 99 missing, P0 missing 0, temporary fallback 0, migrate_to_fastapi 82. |
| npm run boundaries:check | PASS_WITH_WARNINGS | Critical error 0, warning 162. |
| npm run openapi:drift | PASS | OpenAPI refresh/generate sonrası diff yok. |
| backend ruff | PASS | All checks passed. |
| backend mypy | PASS | 476 source file temiz. |
| backend pytest app/tests | PASS | 229 passed, 4 warnings. |
| pm2 list | PASS_WITH_LIMITATION | eden-app ve eden-fastapi online; dedicated worker yok. |
| outbox backlog query | PASS_WITH_LIMITATION | pending 4; oldest 2026-05-25. |
| curl public headers/login/API | PASS | /login 200; public API auth required 401; HSTS present. |

## Ana Bulgular

- Açık doğrulanmış P0 bulunmadı.
- Backend ve frontend gate'leri temiz kaldı.
- Resmi boundary sonucu 162 warning; critical error 0.
- migration:status 99 route için header eksik gösteriyor; P0 missing 0.
- Keyword taraması 6.755 hit üretti. Bu hitlerin çoğu dokümantasyon, migration header veya plan metni; aksiyon alınabilir kümeler aşağıdaki envanterlerde sınıflandırıldı.
- Supabase/Vercel ilgili 415 hit bulundu; canonical runtime olarak değil, legacy/docs/script residue olarak değerlendirilmeli.
- Alias/duplicate route adayı 43.
- Dedicated worker process yok; outbox pending 4.
- Backup fallback dizini çalışıyor fakat standart `/opt/eden-erp/backups` yok.
- HSTS güncel public header'da mevcut.

## Karar

Açık P0 olmadığı için cleanup fix prompt'a geçilebilir. İlk düzeltme sprinti P1 ops + authenticated security negative tests olmalıdır; field test bu P1 kanıtları alındıktan sonra başlatılmalıdır.
