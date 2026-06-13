# Final Security Gate Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

| Alan | Durum | Evidence | Açık risk | Karar etkisi |
| --- | --- | --- | --- | --- |
| Login | partial | /login HTTP 200; manuel OTP/login flow test yok. | Login gerçek kullanıcı akışı kanıtı yok. | P1 |
| App session cookie | partial | Auth strategy dokümante; env:safety PASS. | Cookie attributes manuel/browser doğrulanmadı. | P1 |
| APP_SESSION_SECRET | compliant | env:safety PASS. | Yok. | None |
| EDEN_LOGIN_DISABLED | compliant | env:safety PASS. | Yok. | None |
| Supabase fallback | compliant | Cleanup fazı sonrası canonical değil; env:safety PASS. | Legacy path yanlış açılırsa release fail etmeli. | None |
| FastAPI trusted proxy secret | compliant_with_manual_gap | env:safety PASS. | Direct FastAPI negative test yapılmadı. | P1 |
| Tenant / scope | not_tested | Field test register gerçek bulgu içermiyor. | Tenant/company/branch leak doğrulanmadı. | P1, P0 olasılığı |
| Permissions | not_tested | Manual permission matrix çalışmadı. | Lifecycle, audit, export, document permission bypass olasılığı. | P1, P0 olasılığı |
| Documents media | not_tested | Genel FastAPI health PASS. | Media route auth/scope negative test eksik. | P1, P0 olasılığı |
| Env public secret | compliant | env:safety PASS. | Yok. | None |
| Release DB seed/reset | compliant | db:target:check PASS. | Yok. | None |

## P0 Tetikleyicileri

Auth bypass, tenant/scope data leak, secret exposure, release DB reset/seed riski, media route auth bypass, operation-controlled field bypass veya kullanıcıya stack trace görünmesi bulunursa karar doğrudan NOT_READY olur.
