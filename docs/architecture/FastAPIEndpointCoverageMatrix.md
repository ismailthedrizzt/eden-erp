# FastAPI Endpoint Coverage Matrix

<!-- source-of-truth-standard: contract overrides markdown -->

This matrix verifies the productization gate for the FastAPI core backend. It is based on the current `backend/openapi.json`, migration docs, route proxy inventory and test suite.

Legend:

- `ready`: endpoint exists, OpenAPI schema is generated, tests exist, and Next BFF/proxy path is known.
- `partial`: endpoint exists but still has staging/E2E, auth hardening or fallback-removal debt.
- `legacy_fallback`: Next route still has TS fallback while FastAPI is canonical or emerging.
- `missing`: endpoint is not implemented yet.
- `productization_blocker`: must be fixed before production customer rollout.

## Admin Console / System Settings

Product hardening note:

- Admin Console centralizes workspace settings, module activation/readiness, feature flag overrides, integrations, health and outbox admin views.
- Next routes are proxy-only and return a controlled backend configuration error when `FASTAPI_BASE_URL` is missing.
- Secret values, raw connection strings, signed URLs and SMTP passwords are not exposed in API payloads.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admin | `/api/v1/admin` | GET | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.view/settings fallback | partial | partial | Dashboard summary for workspace, modules, feature flags and outbox. |
| Admin workspace | `/api/v1/admin/workspace-settings` | GET/PATCH | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.manage/settings.edit | partial | partial | Tenant-level workspace settings with audit. |
| Admin modules | `/api/v1/admin/modules` | GET | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.manage/settings.modulesManage | partial | partial | Module activation, readiness, dependencies and feature counts. |
| Admin module detail | `/api/v1/admin/modules/{module_key}` | GET | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.manage/settings.modulesManage | partial | partial | Per-module readiness and flags. |
| Admin module activation | `/api/v1/admin/modules/{module_key}/activation` | PATCH | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.manage/settings.modulesManage | partial | partial | Stores tenant activation override and emits audit/outbox. |
| Admin features | `/api/v1/admin/features` | GET | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.manage/settings.edit | partial | partial | Lists registry feature flags with tenant override state. |
| Admin feature update | `/api/v1/admin/features/{feature_key}` | PATCH | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.manage/settings.edit | partial | partial | Writes `feature_flag_overrides`; risky toggles remain guarded. |
| Admin health | `/api/v1/admin/health` | GET | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.view/settings.view | partial | partial | FastAPI/DB/storage/audit/outbox/email/readiness summary. |
| Admin deep health | `/api/v1/admin/health/deep` | GET | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.technical/system.admin | partial | partial | Admin-only technical view without secrets. |
| Admin integrations | `/api/v1/admin/integrations` | GET | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.manage/settings.edit | partial | partial | Supabase/Auth/Storage/FastAPI/DB/SMTP/outbox status cards. |
| Admin integration test | `/api/v1/admin/integrations/{integration_key}/test` | POST | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.manage/settings.edit | partial | partial | Test result is sanitized and audit-ready. |
| Admin outbox | `/api/v1/admin/outbox` | GET | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.outboxAdmin/outbox.dispatch | partial | partial | Shows backlog and recent failed events. |
| Admin outbox retry | `/api/v1/admin/outbox/{event_id}/retry` | POST | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.outboxAdmin/outbox.dispatch | partial | partial | Resets failed event to pending and audits the action. |
| Admin outbox dispatch | `/api/v1/admin/outbox/dispatch-once` | POST | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.outboxAdmin/outbox.dispatch | partial | partial | Runs bounded dispatch once. |
| Admin settings | `/api/v1/admin/settings` | GET | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.view/settings.view | partial | partial | Generic admin settings map plus technical summary. |
| Admin setting update | `/api/v1/admin/settings/{settings_key}` | PATCH | yes | yes, proxy-only | yes | pending drift check | yes | adminConsole.manage/settings.edit | partial | partial | Stores tenant-scoped settings JSON with audit/outbox. |

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

Product hardening note:

- `Subelerimiz` now explicitly treats branch records as official/operational company sub-units, not companies, facilities or organization units.
- The branch list includes product filters for company, branch type, official/operational mode and city, plus summary widgets for organization/facility links and active authority-bearing branches.
- Branch detail now surfaces company, organization unit, facility/location and representative authority readiness in one panel, while routing lifecycle changes to Branch Opening/Closing operation wizards.
- FastAPI branch detail/PATCH/DELETE now uses the branch domain service and returns hydrated card detail for the frontend contract; free branch POST remains forbidden with `USE_BRANCH_OPENING_WIZARD`.

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
| Branch authority summary | `/api/v1/branches/{branch_id}/representative-authorities` | GET | partial | partial | partial | yes | yes | branch scope partial | partial | partial | Branch detail can read branch-scoped and company-wide authority summaries; staging data verification remains P1. |
| Facility | `/api/v1/facilities` | GET | yes | partial | partial | yes | yes | company scope partial | partial | partial | Used by branch/facility relation views; deeper facility product hardening is separate. |
| Facility | `/api/v1/facilities/{facility_id}` | GET | yes | partial | partial | yes | yes | company scope partial | partial | partial | Hydrated detail exists for branch relation display. |
| Organization | `/api/v1/organization/units` | GET | yes | partial | partial | yes | yes | company scope partial | partial | partial | Used by branch organization relation views. |
| Organization | `/api/v1/organization/units/{unit_id}` | GET | yes | partial | partial | yes | yes | company scope partial | partial | partial | Hydrated detail exists for branch relation display. |

Step 5 product integration update:

- `POST /api/v1/organization/units`, `PATCH /api/v1/organization/units/{unit_id}`, `GET/POST /api/v1/organization/units/{unit_id}/positions`, `GET /api/v1/organization/units/{unit_id}/representative-authorities` and `GET /api/v1/organization/units/{unit_id}/impact` are now exposed in FastAPI for Teşkilat/Kadro product integration.
- `POST /api/v1/facilities`, `PATCH /api/v1/facilities/{facility_id}`, `GET /api/v1/facilities/{facility_id}/representative-authorities` and `GET /api/v1/facilities/{facility_id}/impact` are now exposed in FastAPI for Tesisler/Lokasyonlar product integration.
- Next `/api/organization` remains a compatibility bridge with FastAPI-first behavior. New `/api/facilities` routes are proxy-only.
- Remaining P1: stage organization/facility authority fixtures, add deactivate lifecycle operations and remove the legacy organization fallback.

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

Product hardening note:

- `Temsilcilerimiz` now surfaces the card-vs-authority distinction in the product UI: representative detail shows card status, current authority status, scope target, signature rule, limits, delete behavior and correct next authority actions in one panel.
- Representative list columns include authority types, authority status, scope target, signature rule, currency, limit summary, last transaction and warnings from the current authority/projection row when available.
- FastAPI representative card PATCH remains card-safe only; authority/status/scope/limit fields continue to be blocked with `OPERATION_CONTROLLED_FIELDS`.
- Authority operations remain transaction-based. Scope validation for company-wide/branch/organization/facility and closed-scope blocking need staging E2E with production-like fixtures before fallback removal.

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
| Representative authority | `/api/v1/branches/{branch_id}/representative-authorities` | GET | partial | partial | partial | yes | yes | branch scope partial | partial | partial | Branch detail authority summary should include branch-scoped and optional company-wide authorities; staging data verification remains P1. |

## Accounting

Product foundation note:

- Accounting domain now owns cari cards, cari movements, payment/collection/expense relations, document status and reconciliation preparation.
- Cari Kartlar and Cari Hareketler MVP endpoints are Python/FastAPI canonical. Next routes are proxy-only and do not contain domain mutation logic.
- Sermaye artirimi ortaklik/sirket domain'inde olusur. Sermaye odemesi veya tahsilati muhasebe domain'inde cari/banka hareketi olarak mutabakatlanir.
- Deepening phase adds bank accounts, bank movements, card movements, e-document records, reconciliation suggestions and capital reconciliation as canonical FastAPI resources.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accounting cari accounts | `/api/v1/accounting/cari-accounts` | GET | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | partial | List filters cover company, role, status, balance status, city and search. |
| Accounting cari accounts | `/api/v1/accounting/cari-accounts` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | partial | Duplicate account code and linked master entity checks exist. |
| Accounting cari accounts | `/api/v1/accounting/cari-accounts/{account_id}` | GET | yes | yes, proxy-only | yes | yes | yes | permission/tenant | yes | partial | Detail payload is used by the product detail drawer. |
| Accounting cari accounts | `/api/v1/accounting/cari-accounts/{account_id}` | PATCH | yes | yes, proxy-only | yes | yes | yes | permission/company scope/version | yes | partial | Card-safe update only; movement balance is calculated by summary/refresh. |
| Accounting cari accounts | `/api/v1/accounting/cari-accounts/{account_id}` | DELETE | yes | yes, proxy-only | yes | yes | yes | permission/company scope/delete guard | yes | partial | Soft delete is blocked when transactions exist. |
| Accounting cari summary | `/api/v1/accounting/cari-accounts/{account_id}/summary` | GET | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | partial | Returns debit, credit, balance, unmatched and overdue counts. |
| Accounting company summary | `/api/v1/accounting/company/{company_id}/summary` | GET | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | partial | Company-level accounting summary for dashboard/future panels. |
| Accounting cari transactions | `/api/v1/accounting/cari-transactions` | GET | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | partial | List filters cover account, type, direction, date, document, payment and reconciliation. |
| Accounting cari transactions | `/api/v1/accounting/cari-transactions` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | partial | Supports paid_by, paid_to, real counterparty, document and related module fields. |
| Accounting cari transactions | `/api/v1/accounting/cari-transactions/{transaction_id}` | GET | yes | yes, proxy-only | yes | yes | yes | permission/tenant | yes | partial | Detail includes account labels and debit/credit projection. |
| Accounting cari transactions | `/api/v1/accounting/cari-transactions/{transaction_id}` | PATCH | yes | yes, proxy-only | yes | yes | yes | permission/company scope/version | yes | partial | Confirmed transactions are immutable except cancellation. |
| Accounting cari transactions | `/api/v1/accounting/cari-transactions/{transaction_id}` | DELETE | yes | yes, proxy-only | yes | yes | yes | permission/company scope/delete guard | yes | partial | Hard delete is limited to draft-safe records via soft delete flag. |
| Accounting bank accounts | `/api/v1/accounting/bank-accounts` | GET/POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | pilot-ready | Bank account CRUD uses masked financial identifiers in response helpers. |
| Accounting bank accounts | `/api/v1/accounting/bank-accounts/{account_id}` | GET/PATCH/DELETE | yes | yes, proxy-only | yes | yes | yes | permission/company scope/version | yes | pilot-ready | Soft delete/passivation preserves financial traceability. |
| Accounting bank transactions | `/api/v1/accounting/bank-transactions` | GET/POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | pilot-ready | Bank movements stay separate from cari movements until matched. |
| Accounting bank transactions | `/api/v1/accounting/bank-transactions/import` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/duplicate guard | yes | pilot-ready | CSV/XLSX import adapter can dry-run and detect duplicate bank rows. |
| Accounting bank transactions | `/api/v1/accounting/bank-transactions/{transaction_id}/match` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/match guard | yes | pilot-ready | Creates reconciliation link through Accounting domain service. |
| Accounting bank transactions | `/api/v1/accounting/bank-transactions/{transaction_id}/ignore` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope | yes | pilot-ready | Removes low-value bank row from reconciliation queue without deleting it. |
| Accounting card transactions | `/api/v1/accounting/card-transactions` | GET/POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | pilot-ready | Corporate card rows support document-needed tracking. |
| Accounting e-documents | `/api/v1/accounting/e-documents` | GET/POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | pilot-ready | e-Fatura/e-Arsiv records hold metadata and Document domain references. |
| Accounting e-documents | `/api/v1/accounting/e-documents/import` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/duplicate guard | yes | pilot-ready | Import creates e-document records first; no direct cari posting. |
| Accounting e-documents | `/api/v1/accounting/e-documents/{document_id}/match` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/match guard | yes | pilot-ready | Links e-document to cari/bank movement with match score. |
| Accounting e-documents | `/api/v1/accounting/e-documents/{document_id}/reject` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/audit-ready | yes | pilot-ready | Rejected invoice moves into needs_review workflow. |
| Accounting reconciliation | `/api/v1/accounting/reconciliation/suggestions` | GET | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | pilot-ready | Suggests bank-cari and bank-e-document matches using scoring rules. |
| Accounting reconciliation | `/api/v1/accounting/reconciliation/match` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/match guard | yes | pilot-ready | Manual/exact/partial match writes reconciliation link. |
| Accounting reconciliation | `/api/v1/accounting/reconciliation/unmatch` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope | yes | pilot-ready | Removes active reconciliation link and resets statuses. |
| Accounting reconciliation | `/api/v1/accounting/reconciliation/unmatched` | GET | yes | yes, proxy-only | yes | yes | yes | permission/company scope | yes | pilot-ready | Returns unmatched bank/cari/e-document queues. |
| Accounting reconciliation | `/api/v1/accounting/reconciliation/summary` | GET | yes | yes, proxy-only | yes | yes | yes | permission/company scope | yes | pilot-ready | Feeds Action Center and reporting warnings. |
| Accounting capital reconciliation | `/api/v1/accounting/capital-reconciliation` | GET | yes | yes, proxy-only | yes | yes | yes | permission/company scope/readiness | yes | pilot-ready | Tracks expected/paid/outstanding partner capital payments. |
| Accounting capital reconciliation | `/api/v1/accounting/capital-reconciliation/{capital_transaction_id}` | GET | yes | yes, proxy-only | yes | yes | yes | permission/company scope | yes | pilot-ready | Provides capital payment detail for ownership/capital flows. |
| Accounting capital reconciliation | `/api/v1/accounting/capital-reconciliation/{reconciliation_id}/match-payment` | POST | yes | yes, proxy-only | yes | yes | yes | permission/company scope/match guard | yes | pilot-ready | Links bank/cari payment to expected capital amount without mutating ownership. |

## HR

Product foundation note:

- HR domain now owns calisan kartlari, istihdam kayitlari, lifecycle
  transactions, SGK manuel takip and employee document references.
- Calisan karti ile istihdam lifecycle ayridir. `+ Ekle` taslak calisan karti
  olusturur; ise giris, pozisyon, SGK ve isten cikis operation olarak
  kaydedilir.
- Calisan olmak, temsilci olmak veya ortak olmak ayni sey degildir. Bir kisi
  ayni anda calisan, ortak ve temsilci olabilir; ancak bu roller ayri domain
  iliskileriyle yonetilir.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HR employees | `/api/v1/hr/employees` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | List filters cover company, branch, unit, position, employment, SGK, gender, education and date range. |
| HR employees | `/api/v1/hr/employees` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Creates draft employee card only; no employment is created. |
| HR employees | `/api/v1/hr/employees/{employee_id}` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/tenant | yes | partial | Detail hydrates current employment fields and document warning count. |
| HR employees | `/api/v1/hr/employees/{employee_id}` | PATCH | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/version | yes | partial | Employment, position, SGK and exit fields are operation-controlled. |
| HR employees | `/api/v1/hr/employees/{employee_id}` | DELETE | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/delete guard | yes | partial | Soft delete is limited to draft cards without employment records. |
| HR employment | `/api/v1/hr/employees/{employee_id}/employment/start` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Draft employee becomes active with active employment record. |
| HR employment | `/api/v1/hr/employees/{employee_id}/employment/terminate` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Active employee becomes passive and employment terminated. |
| HR employment | `/api/v1/hr/employees/{employee_id}/employment/assignment-change` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Branch/unit/position assignment transaction is recorded. |
| HR SGK | `/api/v1/hr/employees/{employee_id}/sgk/entry-completed` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Manual SGK entry completion for MVP. |
| HR SGK | `/api/v1/hr/employees/{employee_id}/sgk/exit-completed` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Manual SGK exit completion for MVP. |
| HR documents | `/api/v1/hr/employees/{employee_id}/documents` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Employee document references support required/missing/expired status. |
| HR documents | `/api/v1/hr/employees/{employee_id}/documents/{document_id}` | PATCH | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Updates document status, dates and file reference. |
| HR summary | `/api/v1/hr/employees/summary`, `/api/v1/hr/company/{company_id}/summary` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Returns active/draft/terminated/SGK counts and distributions. |

## Project / Task Management

Product foundation note:

- Project/Task domain owns project cards, project tasks/issues, status workflow,
  assignment, comments, attachments, related ERP record links and Kanban MVP.
- Process task sistem isleminin parcasidir. Project task ekip is takibidir.
  Action Center ikisini kullaniciya tek is listesi olarak gosterebilir ama veri
  modeli ve lifecycle ayridir.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Projects | `/api/v1/projects` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | List filters cover company, branch, unit, status, type, priority, manager and date range. |
| Projects | `/api/v1/projects` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Creates company-scoped project card with unique project_key. |
| Projects | `/api/v1/projects/{project_id}` | GET/PATCH/DELETE | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/version/delete guard | yes | partial | Open-task guard blocks deleting projects with active work. |
| Projects | `/api/v1/projects/{project_id}/summary`, `/api/v1/projects/summary` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Returns total/open/done/overdue tasks and dashboard totals. |
| Project tasks | `/api/v1/tasks/project-tasks` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Separate from process engine `/api/v1/tasks` task list. |
| Project tasks | `/api/v1/tasks/project-tasks` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Creates project or standalone task; closed projects reject new tasks. |
| Project tasks | `/api/v1/tasks/project-tasks/{task_id}` | GET/PATCH/DELETE | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/version | yes | partial | Done/cancelled tasks are final for normal edit. |
| Project task workflow | `/api/v1/tasks/project-tasks/{task_id}/transition` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/status policy | yes | partial | Supports Jira-like MVP transition matrix; blocked requires reason. |
| Project task assignment | `/api/v1/tasks/project-tasks/{task_id}/assign` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/employee scope | yes | partial | User and HR employee assignment fields are supported. |
| Project task comments | `/api/v1/tasks/project-tasks/{task_id}/comments` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | partial | partial | Creates `task.commented` history entry. |
| Project task attachments | `/api/v1/tasks/project-tasks/{task_id}/attachments` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | partial | partial | Stores file_ref metadata without signed URL logging. |
| My project tasks | `/api/v1/tasks/my-project-tasks` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | partial | partial | Feeds "Bana Atananlar" and Action Center-like user work views. |

## Product / Service / After-Sales

Product foundation note:

- Product/Service domain owns the sellable/serviceable catalog definition: product model, serial requirement, warranty, maintenance rules, technical specs and documents.
- After-Sales domain owns installed customer assets, service requests, service records, warranty state, maintenance due tracking and service outcomes.
- Urun katalogu satilabilir/hizmet verilebilir urunun tanimidir. Kurulu urun ise belirli bir musteride, belirli lokasyonda, belirli seri numarasiyla izlenen gercek varliktir.
- Project task servis talebinin yerine gecmez; follow-up work is linked as `related_module=after_sales` while service request/status remains in After-Sales.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Product catalog | `/api/v1/products` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | List filters cover type, category, brand, active, after-sales and maintenance flags. |
| Product catalog | `/api/v1/products` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Creates serviceable product/service catalog records; product_code is generated when omitted. |
| Product catalog | `/api/v1/products/{product_id}` | GET/PATCH/DELETE | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/version/delete guard | yes | partial | Delete is blocked once installed assets reference the catalog item. |
| Product summary | `/api/v1/products/summary` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/readiness | yes | partial | Returns active, after-sales-enabled and maintenance-required catalog counts. |
| Installed assets | `/api/v1/after-sales/assets` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/product readiness | yes | partial | Serial-required products enforce serial_no at asset creation. |
| Installed assets | `/api/v1/after-sales/assets/{asset_id}` | GET/PATCH/DELETE | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/version | yes | partial | Asset carries customer/account, location, warranty and maintenance fields. |
| Asset service history | `/api/v1/after-sales/assets/{asset_id}/service-history` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/tenant | partial | partial | Lists service records for installed asset detail tabs. |
| Service requests | `/api/v1/after-sales/service-requests` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Optional `create_project_task` creates a linked project task, not a replacement service request. |
| Service requests | `/api/v1/after-sales/service-requests/{request_id}` | GET/PATCH | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/version | yes | partial | Status, priority, customer, asset and task link are editable under After-Sales policy. |
| Service request workflow | `/api/v1/after-sales/service-requests/{request_id}/assign`, `/close` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Assignment and close actions write After-Sales lifecycle state. |
| Service records | `/api/v1/after-sales/service-records` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Stores technician, service type, work performed, parts/photos/report placeholders and warranty coverage. |
| Service records | `/api/v1/after-sales/service-records/{service_id}` | GET/PATCH | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/version | yes | partial | Planned/in-progress records can be updated before completion. |
| Service record completion | `/api/v1/after-sales/service-records/{service_id}/complete` | POST | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Completion updates installed asset last_service_date and optional next maintenance date. |
| Maintenance due | `/api/v1/after-sales/maintenance-due` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/readiness | yes | partial | Feeds Bakimi Gelenler page. |
| After-sales summary | `/api/v1/after-sales/company/{company_id}/summary` | GET | yes | yes, proxy-only | yes | pending drift check | yes | permission/company scope/readiness | yes | partial | Company-level counts for assets, open requests, completed records and maintenance due. |

## CRM / Stakeholders / Master Data

Product foundation note:

- Master kayit kisi/kurum kimligini temsil eder; musteri, tedarikci, lead ve paydas rolleri bu kayda baglanan iliski kayitlaridir.
- Paydas kaydi finansal cari kart yerine gecmez; cari kart finansal iliski icindir.
- Ortak, temsilci ve calisan rolleri ayri domain iliskileridir; ayni master kisi bu rollerin birden fazlasina sahip olabilir.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CRM master person | `/api/v1/crm/master/persons/search` | GET | yes | yes, proxy-only | yes | pending drift check | yes | crm.view + tenant | yes | partial | Lookup supports TCKN/passport/name/phone/email fallback warnings. |
| CRM master person | `/api/v1/crm/master/persons` | POST | yes | yes, proxy-only | yes | pending drift check | yes | crm.create + tenant | yes | partial | Creates master person with full_name derivation and duplicate guard. |
| CRM master organization | `/api/v1/crm/master/organizations/search` | GET | yes | yes, proxy-only | yes | pending drift check | yes | crm.view + tenant | yes | partial | Lookup supports VKN/trade_name/city search. |
| CRM master organization | `/api/v1/crm/master/organizations` | POST | yes | yes, proxy-only | yes | pending drift check | yes | crm.create + tenant | yes | partial | Creates master organization with VKN uniqueness. |
| CRM stakeholders | `/api/v1/crm/stakeholders` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | crm.view/create + company scope | yes | partial | Master lookup first; stakeholder role duplicate is blocked per company. |
| CRM stakeholder detail | `/api/v1/crm/stakeholders/{stakeholder_id}` | GET/PATCH/DELETE | yes | yes, proxy-only | yes | pending drift check | yes | crm.view/edit/delete + company scope/version | yes | partial | Soft delete archives the stakeholder role, not master identity. |
| CRM interactions | `/api/v1/crm/stakeholders/{stakeholder_id}/interactions` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | crm.view/interactionsManage | yes | partial | Timeline notes for calls, meetings, complaints, service contact and other events. |
| CRM related records | `/api/v1/crm/stakeholders/{stakeholder_id}/related-records` | GET | yes | yes, proxy-only | yes | pending drift check | yes | crm.view + company scope | yes | partial | Shows partner, representative, employee, cari, service and task counts. |
| CRM summary | `/api/v1/crm/stakeholders/{stakeholder_id}/summary` | GET | yes | yes, proxy-only | yes | pending drift check | yes | crm.view + company scope | yes | partial | Drives related roles and follow-up indicators in detail panel. |
| CRM cari integration | `/api/v1/crm/stakeholders/{stakeholder_id}/create-cari-account` | POST | yes | yes, proxy-only | yes | pending drift check | yes | crm.createCariAccount + accounting policy | yes | partial | Creates Accounting cari account linked to stakeholder. |
| CRM task integration | `/api/v1/crm/stakeholders/{stakeholder_id}/create-followup-task` | POST | yes | yes, proxy-only | yes | pending drift check | yes | crm.createTask + project policy | yes | partial | Creates Project/Task follow-up with related_module=crm. |

## Reporting / Dashboards / Management Overview

Product foundation note:

- Reporting domain read-only analiz katmanidir; business mutation, official operation, task lifecycle veya accounting transaction yaratmaz.
- Dashboard kartlari projection/read model/summary kaynaklari uzerinden hesaplanir ve permission/scope bazli gorunur.
- Export disinda veri uretmez; export da ayri permission, tarih araligi ve row limit ister.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reporting dashboard | `/api/v1/reporting/dashboard` | GET | yes | yes, proxy-only | yes | pending drift check | yes | reporting.dashboardView + scope | yes | partial | Returns KPI cards, warning cards, chart datasets and permissions summary. |
| Reporting summary | `/api/v1/reporting/dashboard/summary` | GET | yes | yes, proxy-only | yes | pending drift check | yes | reporting.dashboardView | yes | partial | Returns visible/warning/critical/hidden card counts. |
| Reporting module dashboard | `/api/v1/reporting/dashboard/module/{module_key}` | GET | yes | yes, proxy-only | yes | pending drift check | yes | reporting.dashboardView + module permissions | yes | partial | Lazy-loadable module-specific dashboard section. |
| Reporting KPIs | `/api/v1/reporting/kpis/{module_key}` | GET | yes | yes, proxy-only | yes | pending drift check | yes | reporting.dashboardView + module permissions | yes | partial | Covers company, ownership, representatives, branches, action-center, accounting, hr, projects, after-sales, crm and system. |
| Reporting definitions | `/api/v1/reporting/reports` | GET | yes | yes, proxy-only | yes | pending drift check | yes | reporting.view | yes | partial | Lists permission-aware report definitions. |
| Reporting definition | `/api/v1/reporting/reports/{report_key}` | GET | yes | yes, proxy-only | yes | pending drift check | yes | reporting.view + report permission | yes | partial | Returns report columns, filters and export readiness. |
| Reporting query | `/api/v1/reporting/reports/{report_key}/query` | POST | yes | yes, proxy-only | yes | pending drift check | yes | reporting.view + report permission + pagination | yes | partial | Server-side filtered report result; no unbounded query. |
| Reporting export | `/api/v1/reporting/reports/{report_key}/export` | POST | yes | yes, proxy-only | yes | pending drift check | yes | reporting.export + date range | yes | partial | CSV export preparation only; file generation future. |

## Security / RBAC / Permission Matrix

Product foundation note:

- Security domain uygulama-level profil, rol, permission ve company/branch scope yonetimini tasir.
- Supabase Auth kullanici kimligini dogrular; uygulama tabloları profil/rol/scope kontratini tutar.
- Permission registry canonical listedir; DB role permission kaydi registry disi key kabul etmez.
- Frontend visibility UX sinyalidir; backend permission/scope/policy enforcement'i degistirmez.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Security users | `/api/v1/security/users` | GET | yes | yes, proxy-only | yes | pending drift check | yes | security.view | pending | partial | Lists application-level user profiles, roles and scope summaries; dev fallback shows current admin user. |
| Security user detail | `/api/v1/security/users/{user_id}` | GET/PATCH | yes | yes, proxy-only | yes | pending drift check | yes | security.view/usersManage | pending | partial | Profile PATCH is application-level only, not Supabase Auth mutation. |
| Security user roles | `/api/v1/security/users/{user_id}/roles` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | security.view/usersManage | pending | partial | Assigns a role with optional scope mode/company/branch context. |
| Security user role remove | `/api/v1/security/users/{user_id}/roles/{role_id}` | DELETE | yes | yes, proxy-only | yes | pending drift check | yes | security.usersManage | pending | partial | Removes role assignment by role id or assignment id. |
| Security roles | `/api/v1/security/roles` | GET/POST | yes | yes, proxy-only | yes | pending drift check | yes | security.view/rolesManage | pending | partial | Returns DB roles plus default product roles when not seeded. |
| Security role detail | `/api/v1/security/roles/{role_id}` | GET/PATCH/DELETE | yes | yes, proxy-only | yes | pending drift check | yes | security.view/rolesManage | pending | partial | System roles are locked from direct edit/delete. |
| Security permissions | `/api/v1/security/permissions` | GET | yes | yes, proxy-only | yes | pending drift check | yes | security.view | pending | partial | Registry permissions grouped by module with risk/deprecated metadata. |
| Security permission matrix | `/api/v1/security/permissions/matrix` | GET | yes | yes, proxy-only | yes | pending drift check | yes | security.view | pending | partial | Role x permission cells and registry mismatch warnings. |
| Security role permissions | `/api/v1/security/roles/{role_id}/permissions` | PATCH | yes | yes, proxy-only | yes | pending drift check | yes | security.rolesManage | pending | partial | Rejects unknown permission keys; default in-memory roles are locked. |
| Security scopes | `/api/v1/security/users/{user_id}/scopes` | GET/PATCH | yes | yes, proxy-only | yes | pending drift check | yes | security.view/scopesManage | pending | partial | Company and branch scope CRUD with view/edit/operate flags. |
| Security policy test | `/api/v1/security/policy-test` | POST | yes | yes, proxy-only | yes | pending drift check | yes | security.policyTest | pending | partial | Admin diagnostic returns permission, scope, module and policy reasons. |
| Security denials | `/api/v1/security/permission-denials` | GET | yes | yes, proxy-only | yes | pending drift check | yes | security.view | pending | partial | Reads recent permission/scope denials from audit when available. |
| Security access summary | `/api/v1/security/access-summary` | GET | yes | yes, proxy-only | yes | pending drift check | yes | security.view | pending | partial | Returns user/role/risk/denial counts and setup warnings. |

## Data Quality / Master Data Governance

Product foundation note:

- Data Quality duplicate, missing data, quality score and merge review orchestration layeridir; master/company/crm/accounting/hr/document CRUD ownership'i devralmaz.
- Duplicate kayitlar sessiz merge edilmez; review queue, impact preview, permission check, source/target secimi ve audit/outbox sinyali ile ilerler.
- Company, official transaction, ownership/authority history, confirmed accounting transaction and audit logs merge edilmez; link correction veya domain-specific cleanup onerilir.

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Data quality summary | `/api/v1/data-quality/summary` | GET | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.view | pending | partial | Returns open findings, duplicate groups, score samples and merge operation summaries. |
| Data quality entity score | `/api/v1/data-quality/by-entity/{entity_type}/{entity_id}` | GET | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.view | pending | partial | Returns score/findings/duplicate candidates for a single entity. |
| Data quality check | `/api/v1/data-quality/check` | POST | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.runChecks | pending | partial | Runs bounded duplicate detection and quality scoring across supported entity samples. |
| Data quality entity check | `/api/v1/data-quality/check/{entity_type}/{entity_id}` | POST | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.runChecks | pending | partial | Recalculates score and findings for one entity. |
| Duplicate groups | `/api/v1/data-quality/duplicates` | GET | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.reviewDuplicates | pending | partial | Lists review queue groups with entity/status/severity filters. |
| Duplicate group detail | `/api/v1/data-quality/duplicates/{group_id}` | GET | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.reviewDuplicates | pending | partial | Returns candidate records and match fields for comparison UI. |
| Duplicate detection | `/api/v1/data-quality/duplicates/detect` | POST | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.runChecks | pending | partial | Persists duplicate candidates from exact/strong MVP rules; no automatic merge. |
| Duplicate dismiss | `/api/v1/data-quality/duplicates/{group_id}/dismiss` | POST | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.dismissFinding | pending | partial | Marks group reviewed/dismissed with notes and emits an audit-friendly event. |
| Duplicate false positive | `/api/v1/data-quality/duplicates/{group_id}/false-positive` | POST | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.dismissFinding | pending | partial | Marks group as false positive without deleting candidates. |
| Merge preview | `/api/v1/data-quality/merge/preview` | POST | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.merge + entity policy | pending | partial | Shows field conflicts, relation impact, risks and blocked reasons before confirm. |
| Merge confirm | `/api/v1/data-quality/merge/confirm` | POST | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.merge + entity policy | pending | partial | Applies safe merges for allowed master/document-style entities; archives sources and audits. |
| Merge operation detail | `/api/v1/data-quality/merge/{merge_id}` | GET | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.merge | pending | partial | Returns merge operation result and relation impact rows. |
| Data quality rules | `/api/v1/data-quality/rules` | GET | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.view | pending | partial | Lists seeded/default quality rules with tenant overrides. |
| Data quality rule update | `/api/v1/data-quality/rules/{rule_key}` | PATCH | yes | yes, proxy-only | yes | pending drift check | yes | dataQuality.admin | pending | partial | Updates active/severity/description/config override for a rule. |

## Platform

| domain | endpoint | method | FastAPI implemented? | Next proxy implemented? | frontend service mapped? | OpenAPI schema generated? | auth/tenant guard? | policy/readiness/integrity guard? | tests? | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Setup/readiness | `/api/v1/setup/readiness` | GET | yes | yes, temporary fallback | partial | yes | yes | readiness canonical | yes | partial | Missing infra returns setup language, not technical DB errors. |
| Setup/readiness | `/api/v1/setup/readiness/{module_key}` | GET | yes | yes, temporary fallback | partial | yes | yes | readiness canonical | yes | partial | Module readiness endpoint exists. |
| Modules | `/api/v1/modules` | GET | yes | yes | partial | yes | yes | settings.view + readiness | partial | partial | Step 8 adds module status payload with license/readiness/setup/feature summary. |
| Modules | `/api/v1/modules/{module_key}` | GET | yes | yes | partial | yes | yes | settings.view + readiness | partial | partial | Module detail combines product metadata, setup steps and feature flags. |
| Modules | `/api/v1/modules/{module_key}/activation` | PATCH | yes | yes | partial | yes | yes | settings.modulesManage | partial | partial | MVP in-memory activation override; DB-backed tenant module settings remains P1. |
| Feature flags | `/api/v1/features` | GET | yes | yes | partial | yes | yes | settings.view | partial | partial | Lists runtime feature flags with module, dependency and risk metadata. |
| Feature flags | `/api/v1/features/{module_key}` | GET | yes | yes | partial | yes | yes | settings.view | partial | partial | Lists feature flags scoped to a module. |
| Feature flags | `/api/v1/features/{feature_key}` | PATCH | yes | yes | partial | yes | yes | settings.modulesManage | yes | partial | MVP in-memory flag override; action eligibility enforces feature_disabled decisions. |
| Policy | `/api/v1/policy/evaluate` | POST | yes | yes | partial | yes | yes | policy canonical | yes | ready | Canonical policy decision in Python. |
| Policy | `/api/v1/policy/action-eligibility` | POST | yes | yes | partial | yes | yes | policy/readiness/integrity | yes | ready | Action eligibility is Python canonical. |
| Integrity | `/api/v1/integrity/check` | POST | yes | yes | partial | yes | yes | integrity canonical | yes | ready | Blocking/warning checks in Python. |
| Integrity | `/api/v1/integrity/operation/{operation_key}` | POST | yes | yes | partial | yes | yes | integrity canonical | yes | ready | Operation-specific precheck endpoint exists. |
| Process | `/api/v1/processes` | GET/POST | yes | yes, temporary fallback | partial | yes | yes | process policy partial | yes | partial | Process engine MVP in Python; Step 6 product UI consumes process list/detail. |
| Process | `/api/v1/processes/{process_id}` | GET | yes | yes, temporary fallback | yes | yes | yes | process policy partial | yes | partial | Detail now returns tasks, approvals and events for Process Center. |
| Tasks | `/api/v1/tasks` | GET/POST | yes | yes, temporary fallback | yes | yes | yes | process policy partial | yes | partial | Task service MVP in Python. |
| Tasks | `/api/v1/tasks/{task_id}/complete`, `/assign`, `/comment` | POST | yes | yes, temporary fallback | yes | yes | yes | process policy partial | yes | partial | Task complete/assign/comment endpoints support Process Center actions. |
| Approvals | `/api/v1/approvals` | GET/POST | yes | yes, temporary fallback | yes | yes | yes | process policy partial | yes | partial | Approval approve/reject endpoints exist. |
| Audit | `/api/v1/audit` | GET | yes | yes, temporary fallback | yes | yes | yes | audit.view permission, tenant scope, date/page guard | yes | partial | Audit Admin UI consumes filtered FastAPI list with default last-7-days and pageSize max 100; TS fallback P1. |
| Audit | `/api/v1/audit/{audit_id}` | GET | yes | yes, temporary fallback | yes | yes | yes | audit.view permission | partial | partial | Detail drawer shows masked old/new values and operation/process/request links. |
| Audit | `/api/v1/audit/by-record` | GET | yes | yes, temporary fallback | yes | yes | yes | audit.view permission | partial | partial | Reusable AuditTimeline fetches record-specific audit events. |
| Audit | `/api/v1/audit/by-operation` | GET | yes | yes, temporary fallback | partial | yes | yes | audit.view permission | partial | partial | Operation-linked audit report path exists. |
| Audit | `/api/v1/audit/by-process` | GET | yes | yes, temporary fallback | partial | yes | yes | audit.view permission | partial | partial | Process-linked audit report path exists. |
| Outbox | `/api/v1/system/outbox/dispatch` | POST | yes | yes, temporary fallback | n/a | yes | internal token | n/a | yes | partial | Python worker command is canonical; Next cron fallback remains P1. |
| Action Center | `/api/v1/action-center`, `/counts`, `/summary`, `/by-record` | GET | yes | yes, temporary fallback | yes | yes | yes | source policy partial | yes | partial | Step 6 normalizes task/approval/operation/outbox sources into business-language UnifiedActionItem output. |
| Action Guide | `/api/v1/action-eligibility/evaluate` | POST | yes | partial | partial | yes | yes | eligibility canonical | yes | partial | Eligibility is Python; full intent resolver remains TS P2. |
| Projections | `/api/v1/projections` and `/api/v1/projections/{projection_key}` | GET | yes | optional | partial | yes | yes | scope partial | yes | partial | Generic projection endpoint exists for dev/admin style reads. |
| Health | `/health`, `/api/v1/health` | GET | yes | n/a | n/a | yes | public/basic | n/a | yes | ready | Basic health endpoints exist. |
| Metrics/deep health | `/api/v1/system/metrics`, `/api/v1/system/health/deep` | GET | yes | n/a | n/a | yes | internal token/config | n/a | yes | partial | Protected in production by internal token/config. |

## Step 9 Product Integration Update

Action Guide + Guided Tour hardening keeps the natural-language resolver as a thin Next UI adapter, but expands registry coverage and FastAPI canonical eligibility coverage for company lifecycle, official changes, capital, branch, ownership and representative authority actions. The user-facing Action Guide, operation hints and field helpers now show the same business-language module/status/permission/readiness reasons.

- `POST /api/ai/action-guide` remains mutation-free and registry-constrained.
- `POST /api/ai/action-guide/actions` remains a navigation command adapter and does not mutate ERP data.
- `POST /api/v1/action-eligibility/evaluate` and `POST /api/v1/policy/action-eligibility` cover the hardening scenarios for capital, branch, partner ownership, representative authority and company lifecycle actions.
- `GET/PATCH /api/user/preferences` and onboarding tour endpoints remain Next UI/session adapters backed by `user_workspace_state`; they are not ERP domain mutation endpoints.
- P2 remains full FastAPI Action Guide resolver migration or registry-constrained LLM refinement.

## Gate Summary

- P0 productization blockers found in endpoint coverage: none.
- P1 before first customer: remove or hard-disable temporary TS fallbacks for migrated P0 domains after staging verification; add Python ownership workflow detail/approval/reversal endpoints or document replacement flow.
- P2 after pilot: full Action Guide resolver migration, organization/facility deeper product flows and generated client adoption across all services.
