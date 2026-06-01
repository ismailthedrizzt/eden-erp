# Release Surface Candidate Matrix

Audit date: 2026-05-31

Principle: production shows only `live_candidate`; staging shows `live_candidate + staging_candidate + demo_only`; develop can show all with status badges. Broken or unsafe surfaces are hidden everywhere for normal users.

## Matrix

| module/page | current implementation status | business readiness | UI readiness | backend readiness | test readiness | recommended production visibility | recommended staging visibility | recommended develop visibility | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login/offline shell | working | high | high | n/a | build | live_candidate | live_candidate | live_candidate | auth smoke still required |
| Main workspace `/app` | working | medium | medium | medium | build/backend | live_candidate | live_candidate | live_candidate | widget placeholders acceptable only if hidden/neutral |
| Company list/detail/lifecycle | working | high | high | high | backend tests pass | live_candidate | live_candidate | live_candidate | boundary warnings must be tracked |
| Branches | working | high | high | high | backend tests pass | live_candidate | live_candidate | live_candidate | opening/closing smoke before full prod |
| Partners/ownership | working | high | high | high | backend tests pass | live_candidate | live_candidate | live_candidate | ownership read model present |
| Representatives/authority | working | high | high | high | backend tests pass | live_candidate | live_candidate | live_candidate | authority operation smoke required |
| Facilities/organization | working | medium | medium | high | backend tests pass | live_candidate | live_candidate | live_candidate | scope smoke required |
| Accounting core cards/movements | working | medium/high | medium | high | backend tests pass | live_candidate | live_candidate | live_candidate | Next accounting migration routes remain P1 |
| HR employees `/app/ik/calisanlar` | working | medium/high | medium/high | high | backend tests pass | live_candidate | live_candidate | live_candidate | preferred HR route |
| Documents | working | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | signed URL/download scope smoke before prod |
| Audit | working | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | admin-only; export/access smoke required |
| Admin Console/settings/features/modules | working | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | production only after role-gated admin launch |
| Setup/readiness | working | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | admin-only setup path |
| Outbox/admin health/email | working/partial | medium | medium | partial | backend tests partial | hidden | staging_candidate | live_candidate | worker visibility needed |
| Reporting dashboards/custom/scheduled | partial/working | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | KPI/company-scope smoke required |
| CRM | working/partial MVP | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | field-test first |
| Project/task management | working/partial MVP | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | task transition smoke required |
| Product/services | partial MVP | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | not first production surface |
| After-sales | working/partial MVP | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | field-service/mobile smoke required |
| Integrations/webhook | working | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | signature/SSRF/secret smoke required |
| Automation | working/partial | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | audit and no-surprise execution needed |
| AI copilot | partial | low/medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | no critical mutation; prompt masking smoke |
| Customer portal | working MVP | medium | medium | high | backend tests pass | hidden | staging_candidate | live_candidate | external access scope smoke before prod |
| Demo routes | working | demo only | medium | n/a | build | hidden | demo_only | demo_only | never normal production |
| Legacy aliases | partial/placeholder | low | low | n/a | build | hidden | hidden | develop_only | keep only for redirect/backward compatibility |
| Thin/coming soon pages | placeholder/partial | low | low | mixed | build only | hidden | coming_soon | develop_only | badge or hide |

## Production Candidate Page Set

Initial production candidate set after staging smoke:

- `/login`
- `/offline`
- `/app`
- `/app/sirket/companies`
- `/app/sirket/companies/branches`
- `/app/sirket/companies/partners`
- `/app/sirket/companies/representatives`
- `/app/sirket/tesisler`
- `/app/sirket/teskilat`
- `/app/muhasebe/cari-kartlar`
- `/app/muhasebe/cari-hareketler`
- `/app/muhasebe/on-muhasebe-hareketleri`
- `/app/muhasebe/banka-hesaplari-ve-kartlari`
- `/app/muhasebe/banka-kart-hareketleri`
- `/app/muhasebe/hesap-ve-kart-hareketleri`
- `/app/ik/calisanlar`

Admin, audit, documents and portal are intentionally not in the first normal-user production set despite building successfully.

## Findings

- Build surface is much larger than safe production surface.
- The first live surface should be core workspace, company/branch/partner/representative/facility/organization, accounting core and HR employee pages.
- Admin, portal, integrations, AI, automation, audit, documents and export are staging candidates until role/scope/security smoke passes.

## Risks

- P1: without a release registry, staging/demo/develop pages can appear in production navigation.
- P1: admin/export/document/portal surfaces can leak sensitive data if promoted without smoke.
- P2: coming-soon/placeholder pages reduce trust if visible as normal modules.

## Recommended Fixes

- Implement route-level `releaseStatus` metadata and consume it in navigation/sidebar/search/command palette.
- Hide direct routes in production unless route is live or user is allowed to preview.
- Add environment badges only in staging/develop, never production.
- Add release smoke tests for each production candidate page.

## P0/P1/P2 Priority

- P0: none confirmed, but any broken/unsafe page visible to production users becomes P0.
- P1: release registry and smoke gating.
- P2: coming-soon polish and route alias cleanup.

## Suggested Next Prompt

`Release Registry uygula: route -> releaseStatus metadata ekle, navigation/sidebar/search/command palette ve direct route guard bu matrisi kullansin.`
