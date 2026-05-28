# Productization Readiness Report

## 1. Executive Summary

Gate result: **READY_WITH_P1_DEBT**

Eden ERP has crossed the architecture gate for moving from migration foundation into product hardening. The core direction is now consistent:

- Next.js is frontend/BFF/proxy/UI adapter.
- FastAPI is canonical core backend.
- Python worker is the target for outbox/background work.
- Supabase/PostgreSQL remains data/auth/storage platform.
- OpenAPI is backend contract source of truth.

No P0 productization blocker was found in the final verification pass. The main remaining risk is P1: temporary TS fallbacks still exist for several migrated route groups until staging verification and frontend E2E smoke flows remove them.

## 2. Architecture Status

| layer | status | notes |
| --- | --- | --- |
| Next frontend/BFF | partial/ready with debt | Frontend builds. Next routes are inventoried and classified. Proxy-only violations are checked. Temporary fallbacks remain as P1 debt. |
| FastAPI backend | ready with P1 hardening | Domain endpoints exist for core company, branch, partner, representative, ownership, accounting cari MVP, process, audit, outbox, policy, integrity, readiness and projection areas. |
| Python worker | partial | Outbox worker command and system dispatch endpoint exist; production supervision and alerting remain P1/P2. |
| DB/Supabase | partial | Index plan, safe migration and pooling config exist. Staging EXPLAIN and production rollout remain P1. |
| OpenAPI contract | ready | Schema export and generated TS type drift checks work. Manual DTO bridge cleanup remains P1/P2. |
| Domain services | partial/ready with debt | Core modules have Python services; accounting cari accounts/transactions and HR employee/employment lifecycle now have Python MVP services. Deeper organization/facility flows remain P1/P2. |

## 3. Module Readiness

| module | readiness | notes |
| --- | --- | --- |
| Companies | ready with P1 debt | List/detail/card CRUD and official changes are Python-backed; TS fallbacks remain until staging verification. |
| Partners / Ownership | partial/product hardening started | Partner card CRUD and ownership transaction creation are Python-backed. UI now surfaces card-vs-rights, current ownership and correct ownership actions. Workflow detail/approve/reject/cancel/reverse routes remain P1. |
| Representatives | partial/product hardening started | Card CRUD and authority transaction endpoint exist. UI now surfaces card-vs-authority, current authority, scope/limit/signature state and correct authority actions. Scope E2E and fallback cleanup remain P1. |
| Branches | partial/product hardening started | Opening/closing, list/detail/PATCH are Python-backed. UI now separates branch/company/facility/organization concepts, blocks free create, shows organization/facility/authority readiness and routes lifecycle changes to Branch Opening/Closing. Staging E2E and fallback removal remain P1. |
| Accounting | partial/product foundation started | Cari Kartlar and Cari Hareketler CRUD/list/summary are Python-backed with proxy-only Next routes. Full yevmiye, e-fatura, bank API and automatic reconciliation remain P2. |
| HR | partial/product foundation started | Calisanlar, istihdam lifecycle, SGK manuel takip, assignment change, employee documents and summary endpoints are Python-backed with proxy-only Next routes. Bordro, izin, puantaj and real SGK integration remain P2. |
| Organization | partial | Organization links are visible from branch detail; full Teşkilat/Kadro product hardening remains a later productization step. |
| Facilities | partial | Facility/location links are visible from branch detail; full Tesisler/Lokasyonlar product hardening and multi-branch relation decision remain P1/P2. |
| Process | partial | Python process/task/approval MVP exists. TS fallback and UI hardening remain P1. |
| Audit | ready with P1 debt | Audit Admin UI, masked detail drawer, record timeline and compliance filter presets exist. Export, immutable storage and full coverage DB tests remain P1/P2. |
| Outbox | partial | Python domain/worker exists. Production worker deployment and backlog alerts remain P1. |
| Action Center | partial | Python MVP exists. Full source coverage and UI hardening remain P1/P2. |
| Setup / Readiness / Licensing | ready with P1 debt | Python readiness endpoints exist; Step 8 adds Kurulum Merkezi product cards, module/feature FastAPI contracts, feature_disabled enforcement and ModuleUnavailableState defaults. DB-backed tenant module settings and feature flag persistence remain P1. |
| Action Guide | partial | Canonical eligibility is Python; intent resolver remains TS P2. |

## 4. Security Status

| area | status | notes |
| --- | --- | --- |
| Auth | ready with hardening debt | Supabase JWT verification infrastructure exists. JWKS rotation/runtime hardening remains P1. |
| Tenant context | ready with hardening debt | Tenant membership and context resolution exist; final membership schema alignment remains P1. |
| Permission loading | partial | DB-backed loader/fallback exists; production role/permission data hardening remains P1. |
| Scope | partial/ready | Company scope and branch-derived scope checks exist; organization/facility scope completeness remains P1/P2. |
| Internal endpoints | ready with config dependency | Internal token guard exists for system endpoints. Production env must configure secrets. |
| Secret exposure | ready | `env:safety` and boundary checks guard public secret exposure. |

P0 security blockers: none found in code/docs verification.

## 5. Performance Status

| area | status | notes |
| --- | --- | --- |
| DB pooling | ready | SQLAlchemy pool config and docs exist. |
| Slow request/query logging | ready | Request timing and DB slow query hooks exist. |
| Metrics/health | ready | Metrics, deep health and performance smoke endpoints exist. |
| Index plan | partial | Safe index migration and index plan exist; staging EXPLAIN remains P1. |
| Load testing | partial | Load test scenarios exist; staging integration remains P2. |
| Projections | ready with debt | Performance budgets and max page size exist; DB view/index optimization remains P1/P2. |
| Worker | partial | Batch/lock/retry config exists; production deployment and alerting remain P1. |
| Retention | planned | Data retention and volume plan exists; archive jobs remain P2. |

## 6. Remaining P0 / P1 / P2

### P0 Productization Blockers

None identified in the final gate.

### P1 Must Fix Before First Customer

| item | current state | target state | removal condition |
| --- | --- | --- | --- |
| Temporary TS fallbacks | 74 fallback routes reported by `migration:status`; 56 route fallback warnings from `boundaries:check`. | Migrated route groups become `proxy_to_fastapi`. | FastAPI staging verification + frontend E2E smoke pass. |
| Ownership workflow subroutes | `[id]/**` approve/reject/cancel/reverse/history/impact remain TS/deprecated wrappers. | Python endpoint or replacement operation flow. | Python tests + staging ownership workflow smoke pass. |
| Process/audit/action-center fallbacks | Python MVP exists; TS fallback remains. | Next routes proxy-only. | Admin/process/action-center staging smoke pass. |
| Auth/tenant production hardening | JWT/tenant/permission infrastructure exists. | Final membership schema, JWKS support and denial audit. | Production-like auth integration test pass. |
| Staging DB performance verification | Index plan exists. | EXPLAIN and load smoke recorded. | Staging query plan and p95 budget pass. |
| Worker deployment | Worker command exists. | Supervised worker with metrics/alerts. | Deployment health, backlog and retry alerts pass. |

### P2 After Pilot

- Full Action Guide Python intent resolver.
- Generated OpenAPI client adoption across all frontend services.
- Full accounting package beyond cari MVP and HR features beyond employee/employment lifecycle MVP.
- Organization/facility full product flows.
- Audit export permission/endpoint and full DB-backed audit coverage tests.
- Redis/cache introduction if measurements justify it.
- OpenTelemetry/Sentry/Grafana production integration.

## 7. Recommended Next Productization Sequence

1. Companies page product hardening. **Started:** product readiness panel, field-control UX, real-data scenarios and E2E checklist are now documented for `Sirketlerimiz`.
2. Partners/Ownership product hardening. **Started:** partner detail now separates card status from current ownership, shows share/vote/profit/capital/privilege/control signals and routes users to Initial Partnership Entry, Share Transfer, Ownership Exit or Rights Change instead of card PATCH.
3. Representatives authority product hardening. **Started:** representative detail now separates card status from authority status, shows current authority scope/limit/signature signals and routes users to Representation Start, Scope Change, Limit Change, Suspension/Renewal or Termination instead of card PATCH.
4. Branches product hardening. **Started:** branch detail now separates branch/company/facility/organization concepts, shows organization/facility/representative authority readiness, blocks free create and routes opening/closing through operation wizards.
5. Organization/Facilities integration.
6. Process/Action Center UI hardening.
7. Audit export, compliance report hardening and SIEM/archive planning.
8. Accounting foundation. **Started:** Cari Kartlar and Cari Hareketler MVP now have FastAPI domain services, proxy-only Next routes, product UI, migration draft and real-data/E2E docs.
9. HR foundation. **Started:** Calisanlar and Istihdam Lifecycle MVP now have FastAPI domain services, proxy-only Next routes, product UI, migration draft and real-data/E2E docs.
10. Project/task module. **Started:** Projeler, Gorevler and Kanban MVP now have
    FastAPI domain services, proxy-only Next routes, Action Center `project_task`
    source mapping, migration draft and real-data/E2E docs.

## 8. Decision

Eden ERP can move into productization/hardening with explicit P1 debt. The first customer/pilot gate should require:

- all P0 migrated route groups verified with `FASTAPI_BASE_URL` in staging,
- temporary TS fallbacks removed or explicitly disabled for production,
- production auth/JWT/tenant membership configuration verified,
- worker deployment running with backlog monitoring,
- staging smoke tests and basic load tests passing,
- DB index rollout reviewed.

## Step 5 Product Integration Update

Teşkilat/Kadro and Tesisler/Lokasyonlar product hardening has started:

- FastAPI now exposes organization unit list/create/detail/PATCH, position list/create, organization authority summary and organization impact endpoints.
- FastAPI now exposes facility list/create/detail/PATCH, facility authority summary and facility impact endpoints.
- Teşkilat/Kadro now surfaces the organization unit vs branch vs facility distinction, company/status/type/branch-link filters, hierarchy tabs, branch relation panel and organization-scope representative authority panel.
- Tesisler/Lokasyonlar now surfaces the facility vs branch distinction, facility list/detail/create/update, branch/reusable badges, facility-scope authority panel and impact panel.
- Remaining P1/P2: remove `/api/organization` legacy fallback after staging, add full deactivate lifecycle operations and validate organization/facility scoped authority fixtures.

Until those are complete, the correct label is **READY_WITH_P1_DEBT**, not full production ready.

## Step 6 Product Integration Update

Process Center and Action Center product hardening has started:

- `/app/surecler` now shows real process, task, approval, failed-operation and warning work queues instead of placeholder content.
- `/app/surecler/{id}` now shows current step, tasks, approvals, process events, source record link and operation id context.
- FastAPI Action Center now normalizes process tasks, approvals, failed/stuck operations and admin-visible outbox events into `UnifiedActionItem` output.
- Task comments now have a canonical FastAPI endpoint at `/api/v1/tasks/{task_id}/comment` with Next fallback proxy support.
- Remaining P1/P2: seeded E2E for process/task/approval data, advanced approval matrix, retry-safe operation policy and admin outbox retry UI.

## 9. Verification Snapshot

Expected final commands:

- `npm run openapi:drift`
- `npm run typecheck`
- `npm run migration:status`
- `npm run boundaries:check`
- `npm run proxy:coverage`
- `npm run ts-backend:inventory`
- `npm run build`
- `cd backend && python -m ruff check .`
- `cd backend && python -m mypy app`
- `cd backend && python -m pytest`
- `git diff --check`
