# Final Architecture Compliance Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

| Başlık | Durum | Evidence | Risk | Required fix |
| --- | --- | --- | --- | --- |
| Next.js / FastAPI ayrımı | partial | migration:status PASS; 421 proxy_to_fastapi, 82 migrate_to_fastapi; boundaries 162 warning. | Next route'larında backend borcu kalabilir. | Boundary warning burn-down ve route coverage planı. |
| CRUD / Wizard ayrımı | partial | Önceki audit ve field-test planı ayrımı tanımladı; manuel doğrulama yok. | Resmi/lifecycle alan bypass riski sahada doğrulanmadı. | Core wizard field test. |
| Ekle = Taslak | partial | İlke dokümante edildi; şirket/ortak/temsilci/çalışan akışları manuel test edilmedi. | Kullanıcı akışı sapabilir. | Field test adımları 2,4,6,10. |
| Kart vs Transaction | partial | Ortaklık/temsil/lifecycle separation tasarımı var; field test kanıtı yok. | Finansal/hukuki veri bütünlüğü riski. | Operation smoke ve audit check. |
| Document Management | partial | Document rework dokümante edildi; media health değil ama genel API health PASS. | Dedup/media scope manuel doğrulanmadı. | Belge upload, duplicate reuse, media access field test. |
| Auth modeli | compliant_with_manual_gap | env:safety PASS; middleware Supabase fallback cleanup daha önce yapıldı; /login HTTP 200. | Tenant/scope kaçak manuel test edilmedi. | Auth/scope negative smoke. |
| Local DB modeli | compliant | db:target:check PASS; DATABASE_URL server-side release DB. | Backup proof eksik. | Backup dry-run ve restore plan doğrulaması. |
| Release registry | compliant | release:check PASS, 146 route. | A/B/C kapsamıyla tekrar hizalama gerekir. | RC scope'a göre registry review. |
| Action Center | partial | Kapsam dokümante; field test yok. | Teknik event/iş görevi ayrımı sahada doğrulanmadı. | Core Action Center scenario. |
| Audit | partial | Audit kapsamı dokümante; backend lint borcu var. | Kritik işlem audit eksik kalabilir. | Lifecycle audit field test. |

## Sonraki Aşamaya Etki

Architecture direction doğru; ancak route boundary warningleri ve manuel field test eksikliği nedeniyle release candidate öncesi P1 stabilization gerekir.
