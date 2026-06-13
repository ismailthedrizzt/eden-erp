# Python Migration Roadmap

<!-- source-of-truth-standard: contract overrides markdown -->

Bu roadmap FastAPI core backend gecisi icin ilk tasima sirasini belirler.

## P0

1. **Branch opening/closing** - in progress / first FastAPI implementation landed
   - Target: `backend/app/domains/branches`, `organization`, `facilities`
   - Reason: En yeni cross-domain mutation zinciri ve transaction boundary pilotu.
   - Implemented: `POST /api/v1/companies/{company_id}/branch-openings`, `POST /api/v1/companies/{company_id}/branch-closings`, precheck endpointleri ve Next BFF proxy.
   - Follow-up: TS legacy fallback'i kaldir, JWT/scope hardening ve DB integration testlerini ekle.

2. **Company official changes** - in progress / FastAPI implementation landed for title, address, public registration, NACE and activity subject
   - Target: `backend/app/domains/company`
   - Reason: Unvan, adres, kamu/tescil, NACE ve faaliyet konusu degisiklikleri resmi alanlari kontrol eder.
   - Implemented: `POST /api/v1/companies/{company_id}/official-changes/title-change`, `address-change`, `public-registration-update`, `nace-change`, `activity-subject-change` ve ilgili precheck endpointleri.
   - Follow-up: TS legacy fallback'i kaldir, public table sync integration testlerini ve Python company PATCH guard'ini ekle.

3. **Capital increase** - in progress / FastAPI implementation landed
   - Target: `backend/app/domains/company`, `ownership`
   - Reason: Sirket sermayesi, ownership dagilimi ve lifecycle event zinciri atomic olmali.
   - Implemented: `POST /api/v1/companies/{company_id}/capital-increases`, precheck endpointi, current ownership endpointleri ve Next BFF proxy.
   - Follow-up: TS legacy fallback'i kaldir, DB integration testleri ve OpenAPI-generated client ekle.

4. **Representative authority transactions** - in progress / FastAPI authority transaction endpoint landed
   - Target: `backend/app/domains/representatives`
   - Reason: Scope, limit, authority status ve branch/facility/organization iliskileri core domain kuralidir.
   - Implemented: `POST /api/v1/representatives/{representative_id}/authority-transactions`, current-authority endpointi, scope validation service ve Next PATCH BFF proxy.
   - Follow-up: representative list/detail projection optimizasyonu, Python permission/JWT hardening ve TS legacy fallback removal.

5. **Ownership transactions** - in progress / FastAPI transaction endpoint landed
   - Target: `backend/app/domains/ownership`
   - Reason: Pay/oy/kar/sermaye haklari main partner card editinden ayrilmalidir.
   - Implemented: `POST /api/v1/ownership/transactions`, current ownership service, partner PATCH ownership-field guard ve Next ownership transaction BFF proxy.
   - Follow-up: `app/api/ownership-transactions/[id]/**` approve/reject/reverse fallbacklerini FastAPI'ye tasi, partner list/detail projectionlarini proxy yap ve DB integration testleri ekle.

## P1

6. **Process Engine** - in progress / FastAPI MVP landed
   - Process instance/task/approval/event engine Python'a tasinir.
   - Implemented: `/api/v1/processes`, `/api/v1/tasks`, `/api/v1/approvals` endpointleri, Python process registry ve Next BFF proxy.

7. **Outbox Dispatcher** - in progress / Python worker MVP landed
   - Dispatcher ve handler runner Python worker olur.
   - Implemented: `backend/app/domains/outbox`, `python -m app.workers.outbox_worker --once`, `/api/v1/system/outbox/dispatch` ve Next cron proxy.

8. **Audit Log** - in progress / FastAPI read/write MVP landed
   - Audit write/read service Python'a tasinir.
   - Implemented: `/api/v1/audit`, by-record/by-operation/by-process endpointleri ve Python masking service.

9. **Policy Engine**
   - Permission, scope, record status ve module readiness enforcement Python'a tasinir.
   - Implemented: Python permission registry, policy engine, scope policy ve `/api/v1/policy/*` endpointleri eklendi.

10. **Integrity Checks**
   - Cross-domain blocking/warning precheck katmani Python'a tasinir.
   - Implemented: Python integrity registry/checker ve `/api/v1/integrity/*` endpointleri eklendi; branch/capital/representative/ownership operasyonlari guard kullanmaya basladi.

## P2

11. **Next proxy consolidation and OpenAPI client adoption** - in progress / migration bridge landed
   - Next API routes now carry migration status headers and use `lib/backend/fastApiProxy.ts` for FastAPI-backed endpoint groups.
   - Generated OpenAPI types live under `lib/generated/backend-client/types.ts`; `lib/generated/backend-client/client.ts` is the hand-written adapter.
   - Follow-up: remove TS fallbacks after staging FastAPI validation and move service wrappers to generated contracts.

12. **Company / Partner / Representative Card CRUD** - in progress / FastAPI card endpoints landed
   - Target: `backend/app/domains/company`, `partners`, `representatives`, shared `policies/field_control.py` and `delete_guards.py`.
   - Implemented: draft create, card PATCH and safe draft DELETE endpoints for company, partner and representative cards.
   - Rule: card CRUD cannot mutate official, ownership or authority fields; those remain operation/wizard endpoints.
   - Follow-up: identity sync hardening, document storage adapter migration and legacy TS fallback removal.

13. **Python Auth / JWT / Tenant Context Hardening** - in progress / security boundary landed
   - Target: `backend/app/core/security.py`, `backend/app/policies/access_context.py`, `scope_policy.py`, `lib/backend/fastApiProxy.ts`.
   - Implemented: Supabase JWT HS256 verification, tenant membership resolution, DB-backed permission loading, company scope loading, internal token guard and Next proxy token forwarding.
   - Rule: production FastAPI does not trust `X-User-Id` or permissions headers without JWT and validated tenant context.
   - Follow-up: JWKS crypto runtime dependency, auth denial audit events and e2e Supabase session tests.

14. **Observability / Logging / Metrics** - in progress / foundation landed
   - Target: `backend/app/core/{logging,middleware,metrics,sanitization,error_tracking}.py`, `database.py`, system endpoints and Next proxy headers.
   - Implemented: request/correlation ID middleware, structured log context, normalized error responses with IDs, in-memory metrics, DB slow query hooks, system metrics/deep health endpoints and operation/outbox/audit/projection log points.
   - Follow-up: OpenTelemetry, Sentry production integration, Prometheus/Grafana deployment and cross-runtime trace dashboards.

15. **Deployment / CI-CD / Environment Strategy** - in progress / platform deployment contract landed
   - Target: `.github/workflows/ci.yml`, Dockerfiles, env examples and deployment docs.
   - Implemented: Next/FastAPI/worker topology docs, CI jobs, Docker/compose skeleton, env examples, smoke-test and env-safety scripts.
   - Follow-up: provider-specific deploy hooks, production secret manager wiring and staging smoke/load automation.

16. **Python Migration Final Consolidation / TS Backend Removal** - in progress / boundary enforcement landed
   - Target: `scripts/check-backend-migration-status.js`, `scripts/check-import-boundaries.js`, `RemainingTsBackendInventory.md` and `TsBackendRemovalReport.md`.
   - Implemented: proxy-only boundary checks, generated TS backend inventory, CI import-boundary check and final rule that new domain logic belongs in FastAPI/Python.
   - Follow-up: remove P1 temporary TS fallbacks after FastAPI staging verification and convert migrated routes to `proxy_to_fastapi`.

11. **Setup Readiness**
    - Module readiness Python startup/request guard olarak uygulanir.
    - Implemented: `/api/v1/setup/readiness` ve module readiness endpointleri eklendi.

12. **Action Center** - initial FastAPI read adapter landed
    - Unified pending work source Python API ve projection service'e tasinir.
    - Implemented: `/api/v1/action-center`, counts, summary ve by-record minimal process task/approval adapter.

13. **Projection services**
    - Read model query helpers Python'a veya DB view contract'a tasinir.
    - Implemented: company, branch, partner, representative ve current ownership projection endpointleri Python'a tasinmaya basladi.

14. **Action Guide backend resolver**
    - Deterministic resolver ve eligibility Python'a tasinir; Next UI sadece client olur.
    - Implemented: Python action eligibility service ve `/api/v1/action-eligibility/evaluate` endpointi eklendi; tam intent resolver P2 olarak kalir.

## Migration Rule

Her hedef icin once FastAPI endpoint + OpenAPI contract eklenir, sonra Next route
`proxy_to_fastapi` veya `proxy_to_fastapi_with_legacy_fallback` statulu
proxy/adaptor'a cevrilir, son olarak TS business logic silinir veya
`deprecated_wrapper` olarak planli sureyle tutulur. Step 11 ile P0/P1 route
gruplarinin migration status sozlugu bu yeni proxy ayrimina gore
standardize edilmistir.
