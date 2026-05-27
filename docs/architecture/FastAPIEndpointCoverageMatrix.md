# FastAPI Endpoint Coverage Matrix

This matrix verifies the productization gate for the FastAPI core backend. It is based on the current `backend/openapi.json`, migration docs, route proxy inventory and test suite.

Legend:

- `ready`: endpoint exists, OpenAPI schema is generated, tests exist, and Next BFF/proxy path is known.
- `partial`: endpoint exists but still has staging/E2E, auth hardening or fallback-removal debt.
- `legacy_fallback`: Next route still has TS fallback while FastAPI is canonical or emerging.
- `missing`: endpoint is not implemented yet.
- `productization_blocker`: must be fixed before production customer rollout.

## Company

Product hardening note:

- `Sirketlerimiz` detail now has a product readiness panel fed by the existing company detail/read model: lifecycle, opening, capital, ownership, representative, branch, public/registration and document signals are visible in one place.
- Active-card `PATCH` remains card-safe only; official fields continue to be blocked with `OPERATION_CONTROLLED_FIELDS`.
- Official operations remain FastAPI canonical while Next BFF temporary fallbacks stay P1 staging-removal debt.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Company | `/api/v1/companies` | GET | yes | yes, temporary fallback | partial | yes | yes | policy/scope partial | yes | partial | Projection list endpoint is FastAPI-backed; TS read fallback remains P1 removal. |
| Company | `/api/v1/companies` | POST | yes | yes, temporary fallback | partial | yes | yes | field-control/delete guard on domain side | yes | partial | Draft create standard is Python canonical; staging EntityForm verification remains. |
| Company | `/api/v1/companies/{company_id}` | GET | yes | yes, temporary fallback | partial | yes | yes | scope partial | yes | partial | Detail projection is Python-backed; some section adapters remain TS fallback. |
| Company | `/api/v1/companies/{company_id}` | PATCH | yes | yes, temporary fallback | partial | yes | yes | field-control guard | yes | partial | Card PATCH rejects operation-controlled fields. |
| Company | `/api/v1/companies/{company_id}` | DELETE | yes | yes, temporary fallback | partial | yes | yes | draft delete guard | yes | partial | Safe hard delete only for draft/no-reference records. |
| Company official changes | `/api/v1/companies/{company_id}/official-changes/title-change` | POST | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Python canonical, TS fallback remains until staging wizard E2E. |
| Company official changes | `/api/v1/companies/{company_id}/official-changes/address-change` | POST | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Address official change separated from card CRUD. |
| Company official changes | `/api/v1/companies/{company_id}/official-changes/public-registration-update` | POST | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Public registry update is operation endpoint. |
| Company official changes | `/api/v1/companies/{company_id}/official-changes/nace-change` | POST | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | NACE and activity subject remain distinct operations. |
| Company official changes | `/api/v1/companies/{company_id}/official-changes/activity-subject-change` | POST | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Operation-controlled fields guarded. |
| Capital | `/api/v1/companies/{company_id}/capital-increases/precheck` | GET | yes | yes, temporary fallback | partial | yes | yes | readiness/integrity yes | yes | partial | Current ownership dependency enforced. |
| Capital | `/api/v1/companies/{company_id}/capital-increases` | POST | yes | yes, temporary fallback | partial | yes | yes | readiness/integrity yes | yes | partial | Inserts capital transaction and ownership transaction records in Python. |

## Branches

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Branch | `/api/v1/branches` | GET | yes | yes, temporary fallback | partial | yes | yes | scope partial | yes | partial | Projection list endpoint is Python-backed. |
| Branch | `/api/v1/branches` | POST | yes, forbidden | partial | no | yes | yes | policy yes | partial | partial | Free branch create is rejected with branch opening wizard guidance. |
| Branch | `/api/v1/branches/{branch_id}` | GET | yes | yes, temporary fallback | partial | yes | yes | scope partial | partial | partial | Hydrated detail exists; Step 14 staging validation remains. |
| Branch | `/api/v1/branches/{branch_id}` | PATCH | yes | yes, temporary fallback | partial | yes | yes | field-control/scope partial | partial | partial | Card-safe fields only; official/address fields are blocked. |
| Branch | `/api/v1/branches/{branch_id}` | DELETE | partial | yes, temporary fallback | partial | yes | yes | delete guard partial | partial | partial | Active/closed official branch hard delete rejected. |
| Branch operation | `/api/v1/companies/{company_id}/branch-openings/precheck` | GET | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Python canonical; TS fallback P1. |
| Branch operation | `/api/v1/companies/{company_id}/branch-openings` | POST | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Organization/facility/branch mutation transaction is Python-side. |
| Branch operation | `/api/v1/companies/{company_id}/branch-closings/precheck` | GET | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Representative scope impact warning/blocking is Python-side. |
| Branch operation | `/api/v1/companies/{company_id}/branch-closings` | POST | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Closing operation remains wizard endpoint. |

## Partners / Ownership

Product hardening note:

- `Ortaklarimiz` now surfaces the card-vs-rights distinction in the product UI: partner detail shows card status, current ownership, company total share signal, privilege/control flags, delete behavior and correct ownership actions in one panel.
- Partner list columns include current share/vote/profit/capital, share units, privilege/control, last transaction and ownership warnings from the read model or available projection rows.
- FastAPI partner card PATCH remains card-safe only; share/vote/profit/capital/privilege/control fields continue to be blocked with `OPERATION_CONTROLLED_FIELDS`.
- Ownership workflow subroutes for approve/reject/cancel/reverse/history/impact remain P1 coverage debt until Python replacements or a consolidated workflow are verified.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Partner | `/api/v1/partners` | GET | yes | yes, temporary fallback | partial | yes | yes | scope partial | yes | partial | Partner projection hydrates current ownership when available. |
| Partner | `/api/v1/partners` | POST | yes | yes, temporary fallback | partial | yes | yes | field-control yes | yes | partial | Draft create does not set ownership rights. |
| Partner | `/api/v1/partners/{partner_id}` | GET | yes | yes, temporary fallback | partial | yes | yes | scope partial | yes | partial | Detail endpoint exists; TS detail fallback remains. |
| Partner | `/api/v1/partners/{partner_id}` | PATCH | yes | yes, temporary fallback | partial | yes | yes | field-control yes | yes | partial | Ownership fields rejected. |
| Partner | `/api/v1/partners/{partner_id}` | DELETE | yes | yes, temporary fallback | partial | yes | yes | draft delete guard | yes | partial | Active/transaction-history partners cannot be hard deleted. |
| Ownership | `/api/v1/companies/{company_id}/current-ownership` | GET | yes | yes, temporary fallback | partial | yes | yes | readiness partial | yes | partial | Projection endpoint and domain fallback exist. |
| Ownership | `/api/v1/ownership/current` | GET | yes | yes, temporary fallback | partial | yes | yes | readiness partial | yes | partial | Query-param form for current ownership. |
| Ownership | `/api/v1/ownership/transactions` | POST | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Creation is Python canonical. |
| Ownership | `/api/v1/ownership/initial-partnership-entry` | POST | yes | no dedicated Next proxy | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Domain operation exists; BFF direct mapping can be added if UI splits actions. |
| Ownership | `/api/v1/ownership/share-transfer` | POST | yes | no dedicated Next proxy | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Domain operation exists. |
| Ownership | `/api/v1/ownership/ownership-exit` | POST | yes | no dedicated Next proxy | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Domain operation exists. |
| Ownership workflow | `/api/v1/ownership-transactions/{id}/approve/reject/cancel/reverse` | n/a | no | deprecated wrappers | partial | no | n/a | n/a | no | legacy_fallback | P1: implement or replace detail/workflow routes in Python, then remove TS wrappers. |

## Representatives

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Representative | `/api/v1/representatives` | GET | yes | yes, temporary fallback | partial | yes | yes | scope partial | yes | partial | Projection separates `record_status` and `authority_status`. |
| Representative | `/api/v1/representatives` | POST | yes | yes, temporary fallback | partial | yes | yes | field-control yes | yes | partial | Draft create does not set authority fields. |
| Representative | `/api/v1/representatives/{representative_id}` | GET | yes | yes, temporary fallback | partial | yes | yes | scope partial | yes | partial | Card detail endpoint exists. |
| Representative | `/api/v1/representatives/{representative_id}` | PATCH | yes | yes, temporary fallback | partial | yes | yes | field-control yes | yes | partial | Authority fields rejected. |
| Representative | `/api/v1/representatives/{representative_id}` | DELETE | yes | yes, temporary fallback | partial | yes | yes | draft delete guard | yes | partial | Active/authority-history records cannot be hard deleted. |
| Representative authority | `/api/v1/representatives/{representative_id}/authority-transactions` | POST | yes | yes, temporary fallback | partial | yes | yes | policy/readiness/integrity yes | yes | partial | Authority action is separate from card PATCH. |
| Representative authority | `/api/v1/representatives/{representative_id}/current-authority` | GET | yes | partial | partial | yes | yes | scope partial | partial | partial | Current authority read exists. |
| Representative authority | `/api/v1/representatives/authorities` | GET | yes | partial | partial | yes | yes | scope partial | partial | partial | Branch/company-wide scope reads are available. |

## Platform

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Setup/readiness | `/api/v1/setup/readiness` | GET | yes | yes, temporary fallback | partial | yes | yes | readiness canonical | yes | partial | Missing infra returns setup language, not technical DB errors. |
| Setup/readiness | `/api/v1/setup/readiness/{module_key}` | GET | yes | yes, temporary fallback | partial | yes | yes | readiness canonical | yes | partial | Module readiness endpoint exists. |
| Policy | `/api/v1/policy/evaluate` | POST | yes | yes | partial | yes | yes | policy canonical | yes | ready | Canonical policy decision in Python. |
| Policy | `/api/v1/policy/action-eligibility` | POST | yes | yes | partial | yes | yes | policy/readiness/integrity | yes | ready | Action eligibility is Python canonical. |
| Integrity | `/api/v1/integrity/check` | POST | yes | yes | partial | yes | yes | integrity canonical | yes | ready | Blocking/warning checks in Python. |
| Integrity | `/api/v1/integrity/operation/{operation_key}` | POST | yes | yes | partial | yes | yes | integrity canonical | yes | ready | Operation-specific precheck endpoint exists. |
| Process | `/api/v1/processes` | GET/POST | yes | yes, temporary fallback | partial | yes | yes | process policy partial | yes | partial | Process engine MVP in Python; TS fallback remains. |
| Tasks | `/api/v1/tasks` | GET/POST | yes | yes, temporary fallback | partial | yes | yes | process policy partial | yes | partial | Task service MVP in Python. |
| Approvals | `/api/v1/approvals` | GET/POST | yes | yes, temporary fallback | partial | yes | yes | process policy partial | yes | partial | Approval approve/reject endpoints exist. |
| Audit | `/api/v1/audit` | GET | yes | yes, temporary fallback | partial | yes | yes | audit permission partial | yes | partial | Audit read/masking MVP exists; TS fallback P1. |
| Outbox | `/api/v1/system/outbox/dispatch` | POST | yes | yes, temporary fallback | n/a | yes | internal token | n/a | yes | partial | Python worker command is canonical; Next cron fallback remains P1. |
| Action Center | `/api/v1/action-center` | GET | yes | yes, temporary fallback | partial | yes | yes | source policy partial | yes | partial | Minimal process/task/approval source adapter exists. |
| Action Guide | `/api/v1/action-eligibility/evaluate` | POST | yes | partial | partial | yes | yes | eligibility canonical | yes | partial | Eligibility is Python; full intent resolver remains TS P2. |
| Projections | `/api/v1/projections` and `/api/v1/projections/{projection_key}` | GET | yes | optional | partial | yes | yes | scope partial | yes | partial | Generic projection endpoint exists for dev/admin style reads. |
| Health | `/health`, `/api/v1/health` | GET | yes | n/a | n/a | yes | public/basic | n/a | yes | ready | Basic health endpoints exist. |
| Metrics/deep health | `/api/v1/system/metrics`, `/api/v1/system/health/deep` | GET | yes | n/a | n/a | yes | internal token/config | n/a | yes | partial | Protected in production by internal token/config. |

## Gate Summary

- P0 productization blockers found in endpoint coverage: none.
- P1 before first customer: remove or hard-disable temporary TS fallbacks for migrated P0 domains after staging verification; add Python ownership workflow detail/approval/reversal endpoints or document replacement flow.
- P2 after pilot: full Action Guide resolver migration, organization/facility deeper product flows and generated client adoption across all services.
