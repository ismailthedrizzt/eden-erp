# Backend Migration Reality Report

Audit date: 2026-05-31

Result: FastAPI migration is real and broad, but not yet exclusive. The canonical backend exists with routers, domains, policies, workers, OpenAPI, tests and migrations. Next API still carries a large compatibility/fallback surface.

## Backend Platform Evidence

| area | evidence | status | notes |
| --- | --- | --- | --- |
| FastAPI app | `backend/app/main.py` | implemented | App factory, `/health`, `/api/v1`, user-safe exception handlers, request/correlation IDs. |
| API router | `backend/app/api/v1/router.py` | implemented | Companies, branches, partners, representatives, accounting, HR, projects, products, after-sales, CRM, reporting, integrations, portal, audit, security, setup, tasks. |
| DB/session config | `backend/app/core/database.py` | implemented | SQLAlchemy async engine, pool settings, statement timeout support, slow-query metrics. |
| Auth/security config | `backend/app/core/security.py`, `backend/app/policies/*` | implemented | JWT, internal token, permission/policy/scope/field-control layers present. |
| OpenAPI | `backend/openapi.json`, `npm run openapi:drift` | implemented | Drift check passes. |
| Workers | `backend/app/workers/*` | partial | Outbox, email, reminder, reporting, automation, webhook worker files exist; worker README says current outbox handlers include MVP placeholders. |
| Migrations | `backend/migrations/versions/*` | implemented | Sequential migrations through integration hub. |
| Tests | `backend/app/tests/*` | implemented | 222 backend tests pass. |

## Domain Reality Matrix

| domain | expected Python module | actual files found | implemented status | endpoint coverage | tests present? | notes | priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| health | `app/api/v1/health.py` | yes | implemented | `/health`, `/api/v1/health` | yes | Deep health/admin health exists. | none |
| companies | `domains/company`, `api/v1/companies.py` | yes | implemented | list/detail/card/lifecycle/official changes/capital | yes | Next still has temporary fallbacks for many company operations. | P1 |
| branches | `domains/branches`, `api/v1/branches.py`, `api/v1/company_branches.py` | yes | implemented | branch CRUD plus opening/closing operations | yes | Free create must remain guarded by operation policy. | P1 |
| partners/ownership | `domains/partners`, `domains/ownership` | yes | implemented | partner card plus ownership transactions/current ownership | yes | Tests cover partner patch guards and ownership projections. | P1 |
| representatives | `domains/representatives` | yes | implemented | representative card plus authority/scope transactions | yes | Tests cover authority/scope validation. | P1 |
| accounting | `domains/accounting` | yes | implemented | cari, transactions, bank, reconciliation, e-docs | yes | Some legacy Next routes still marked migrate-to-FastAPI. | P1 |
| HR | `domains/hr` | yes | implemented | employees, lifecycle, leave, attendance, timesheets | yes | `/app/ik/personel` remains legacy-rich UI; `/app/ik/calisanlar` is preferred. | P1 |
| projects/tasks | `domains/projects`, `api/v1/projects.py`, `project_tasks.py` | yes | implemented | project/task CRUD, comments, attachments, transitions | yes | UI is MVP/partial in several pages. | P1 |
| product/after-sales | `domains/products`, `domains/after_sales` | yes | partial/implemented | products, assets, service requests/records, field service | yes | Many UI pages are thin wrappers/MVP. | P1 |
| CRM | `domains/crm` | yes | partial/implemented | stakeholders, leads, opportunities, pipelines | yes | UI is MVP; production visibility should wait. | P1 |
| reporting | `domains/reporting` | yes | partial/implemented | dashboards, reports, saved views, scheduled reports | yes | Advanced report pages should be staging first. | P1 |
| integrations/webhook | `domains/integrations` | yes | implemented | apps, credentials, webhooks, deliveries, inbound events | yes | Security tests exist; route surface should be staging until live smoke. | P1 |
| portal | `domains/portal` | yes | implemented MVP | dashboard, products, documents, service requests | yes | External access needs dedicated staging smoke before production. | P1 |
| audit/outbox/process | `domains/audit`, `domains/outbox`, `domains/process` | yes | implemented/partial workers | audit/process/outbox admin endpoints | yes | Temporary Next fallback remains for audit/action/process/task. | P1 |
| admin/security/setup | `domains/admin`, `domains/security`, `setup` | yes | implemented | users, roles, features, modules, setup/readiness, health | yes | Admin console pages are powerful; production visibility must be role-gated. | P1 |
| search/notifications/automation/AI | domain folders exist | yes | partial/implemented | search, notification, automation, AI assistant routes | yes | AI and automation are production-sensitive, staging first. | P1 |

## Migration State From Guard Script

| metric | value |
| --- | --- |
| Next route files | 500 |
| explicit migration headers | 295 |
| missing migration headers | 205 |
| P0 missing headers | 0 |
| temporary fallback routes | 75 |
| proxy-only boundary violations | 0 |
| client direct backend-risk files | 0 |

## Findings

- FastAPI is a functional canonical backend, not a placeholder.
- Backend quality gates pass: `python -m ruff`, `python -m mypy`, `python -m pytest`.
- Domain coverage is broad enough for staging/pilot validation.
- Next API still includes compatibility/fallback logic, especially company/action/process/audit/task/setup routes.

## Risks

- P1: fallback routes can diverge from FastAPI behavior and hide contract gaps.
- P1: worker reliability exists as MVP; worker heartbeat/admin visibility should be exercised in staging.
- P1: production readiness depends on release visibility, not just backend existence.

## Recommended Fixes

- Promote FastAPI-only route behavior for the temporary fallback list after staging verification.
- Expand worker operational tests around heartbeat, retry, DLQ and admin visibility.
- Keep OpenAPI drift as a blocking CI check.
- Generate a route-by-route FastAPI coverage dashboard from `scripts/check-backend-migration-status.js`.

## P0/P1/P2 Priority

- P0: none confirmed.
- P1: fallback removal, route header completion, worker staging validation.
- P2: direct CLI entrypoint setup for Python tools.

## Suggested Next Prompt

`Temporary Next API fallback removal planini uygula: migration:status listesindeki P1 fallback route'lari FastAPI-only proxyye indir ve staging smoke checklist'i ekle.`
