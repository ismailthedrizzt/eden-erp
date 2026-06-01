# Frontend Template Consistency Report

Audit date: 2026-05-31

Scope: list pages, form pages, detail pages and wizard pages under `app/**`, `components/**`, navigation/module registry surfaces.

## Template Inventory

| template | canonical component/pattern | status | evidence |
| --- | --- | --- | --- |
| List | `components/ui/SmartDataTable.tsx` | partial | Used by several project/company-style pages; many MVP pages still use local tables/cards. |
| Form | `components/ui/EntityForm.tsx` | partial | Core entity pages and project records use it; accounting/CRM/portal/MVP pages often use local forms. |
| Wizard | `RecordLifecycleWizard`, company/branch/capital/HR wizard components | partial/compliant in core | Company, branch, capital, HR lifecycle components exist. Some non-core operational flows remain local. |
| Detail/header | page-local hero/header patterns | partial | Core company/partner/representative pages have rich detail drawers; no single enforced detail template. |
| Empty/loading/error | page-local plus `SmartDataTable`/portal async blocks | partial | Present in many mature pages, missing/implicit in thin wrappers and aliases. |
| Permission/runtime visibility | `permissionStore`, `runtimeVisibilityResolver`, navigation permissions | partial | Registry exists; not every direct route has environment release gating. |

## Module Review

| module | list consistency | form consistency | detail consistency | wizard consistency | empty/loading/error | visibility | notes | priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Core dashboard/action center | partial | n/a | partial | n/a | partial | partial | widgets and Action Center compile; route release classification still needed | P1 |
| Company | yes/partial | yes | yes | yes | yes | yes/partial | closest to canonical UX; boundary warnings from TS helper imports | P1 |
| Branches | yes | yes | partial | yes | yes | yes/partial | branch opening/closing uses wizard/operation flow | P1 |
| Partners/ownership | yes | yes | yes | yes | yes | yes/partial | card vs ownership transaction separation visible | P1 |
| Representatives | yes | yes | yes | yes | yes | yes/partial | authority operation UX present | P1 |
| Organization/facilities | partial | partial | partial | n/a | yes/partial | partial | needs template alignment before live scale | P1 |
| Accounting | partial | partial | partial | n/a | yes/partial | partial | several live-candidate pages are hand-rolled but functional | P1 |
| HR | partial | partial | partial | yes | yes/partial | partial | `/app/ik/calisanlar` preferred; legacy `/app/ik/personel` is richer but riskier | P1 |
| Projects/tasks | partial | partial | partial | partial | yes | partial | SmartDataTable in backlog/records, local tables in MVP task pages | P1 |
| Products/after-sales | partial | partial | partial | partial | yes | partial | MVP pages build; keep staging until template and scope tests improve | P1 |
| CRM | partial | partial | partial | n/a | yes | partial | stakeholder/lead/opportunity MVP pages, not full canonical list/form standard | P1 |
| Reporting | partial | partial | partial | n/a | yes | partial | advanced reporting should be staging-only until KPI/company-scope smoke | P1 |
| Documents | partial | partial | partial | n/a | yes | yes/partial | signed URL/download permission smoke needed | P1 |
| Admin console | partial | partial | partial | n/a | yes | yes/partial | functional but powerful; production admin role gating required | P1 |
| Portal | partial | partial | partial | n/a | yes | partial | AsyncBlock/EmptyState pattern present; external access smoke required | P1 |
| Demo/legacy aliases | no | no | no | n/a | no/partial | unknown | hide outside development | P2 |

## List Page Checks

| requirement | status | finding |
| --- | --- | --- |
| SmartDataTable/canonical list | partial | Used in selected mature pages; many module MVP pages use local table/card layouts. |
| Server-side pagination | partial | Present in backend/API designs and some pages; not uniformly visible in all UI pages. |
| Search/filter/sort standard | partial | Present in core/company/accounting pages; inconsistent in MVP modules. |
| Empty state | partial | Present in mature pages, portal and Admin Console; thin wrappers often rely on child components or lack explicit state. |
| Loading skeleton | partial | Loading states exist, but skeleton standard is not universal. |
| User-safe error state | partial | Backend error handling is strong; frontend often displays `error.message` directly from API. |
| Mobile/card view | partial | Some table components support responsive behavior; not validated with browser in this audit. |

## Form Page Checks

| requirement | status | finding |
| --- | --- | --- |
| EntityForm/canonical form | partial | `EntityForm` is present and used; many MVP forms are local. |
| Validation standard | partial | Backend/pydantic/zod style validation exists, but frontend validation is inconsistent. |
| Save/cancel pattern | partial | Core pages are consistent; local MVP forms vary. |
| Field helper/locked helper | partial | Strongest in company/partner/representative/branch areas. |
| Operation-controlled fields locked | partial/compliant in core | Backend field-control registry and tests exist; non-core local forms need review before live. |

## Detail/Wizard Checks

| requirement | status | finding |
| --- | --- | --- |
| Detail hero/header | partial | Rich in core entity pages, not standardized globally. |
| Status badge | partial | Multiple badge implementations exist. |
| Tabs and related summaries | partial | Core pages have tabs/summaries; MVP modules vary. |
| Audit/history/pending actions | partial | Action Center and audit components exist; not universal on all detail pages. |
| Wizard stepper | partial/compliant in core | Company/branch/capital/HR wizards exist. |
| Precheck -> input -> docs -> summary -> confirm -> success | partial | Present conceptually in core operation flows; not all wizards prove the full sequence statically. |
| Blocking reasons/warnings | partial | Policy/action eligibility and setup readiness exist; UI usage varies. |
| No mutation before confirmation | partial | Needs E2E smoke for every critical operation. |

## Minor Fixes Applied

None. This phase remained audit-only. Build-generated PWA artifacts were reverted/removed because they were command artefacts, not product changes.

## Findings

- The canonical UI building blocks exist and are used in the most mature ERP surfaces.
- Template consistency drops in newer product/after-sales/project/CRM/reporting/portal MVP pages.
- Frontend error messages often depend on API error strings; safe backend messages help, but frontend should still normalize.

## Risks

- P1: live users may see inconsistent table/form behavior if MVP pages are promoted too early.
- P1: hand-rolled forms may miss locked-field helper UX even if backend rejects the mutation.
- P1: error messages can be uneven across modules.

## Recommended Fixes

- Require SmartDataTable/EntityForm or an explicit exception for any production route.
- Add a `LiveRouteReadiness` checklist that includes empty/loading/error/mobile states.
- Normalize frontend error display through a shared `userSafeErrorMessage` helper.
- Move direct module MVP pages to staging/develop until template pass is complete.

## P0/P1/P2 Priority

- P0: none confirmed.
- P1: template consistency for live candidates; error/loading/empty standards; field-control UX parity.
- P2: badge/header/tab polish and legacy component cleanup.

## Suggested Next Prompt

`Live Candidate Template Hardening: PageStatusMatrix'teki live_candidate sayfalarda SmartDataTable, EntityForm, empty/loading/error ve locked-field helper uyumunu tamamla.`
