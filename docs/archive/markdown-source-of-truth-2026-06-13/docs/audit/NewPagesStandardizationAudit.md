# New Pages Standardization Audit

Date: 2026-06-11

Scope: New, development, internal, admin, form, wizard, list and theme-management pages in Eden ERP.

Compared sources:

- `app/**/page.tsx`
- `lib/release/routeReleaseRegistry.ts`
- `contracts/page-flow-contracts.json`

## Executive Summary

This audit compared every `page.tsx` route with the release registry and the Page / Flow Delivery Contract registry.

Result:

- Routes scanned: 152
- Registry routes scanned: 152
- Page-flow contracts scanned: 10
- Page files missing from release registry: 0
- Registry routes without `page.tsx`: 0
- `/app` routes without Page / Flow Contract: 121
- Development, demo or internal pages scanned: 124
- Release pages scanned: 10
- Hidden pages scanned: 15

The release registry itself is complete, and `npm run release:check` passes. The main gap is not route coverage; it is delivery-contract coverage and standard UI/form maturity for newly added development surfaces.

## P0 Findings

None.

No page route was missing from `routeReleaseRegistry.ts`. No registry route was missing a `page.tsx`. Direct page-level DB/Supabase imports were not confirmed in the checked files. Existing boundary gates also report zero direct DB usage from Next API routes.

## P1 Findings

### P1-001: Page / Flow Contract coverage is incomplete for development pages

Affected routes:

- 121 `/app` page routes do not have a contract entry.
- Biggest groups without contracts: accounting 17, after-sales 14, HR 11, project management 10, admin console 10, product-services 8, CRM 8, contracts 7, settings 7.

Risk:

- New forms, lists, wizard flows and lifecycle pages can be considered "done" without typed frontend schema, backend schema, generated client reference, tests or e2e happy path.

Required fix:

- Add real contract entries for every non-static/new operational page.
- Placeholder text such as `Required:`, `P1:`, `Future:`, `TODO`, `TBD`, `placeholder`, `manual payload`, `should migrate` must not be accepted.

### P1-002: Many development route entries are visible in navigation/search/command palette

Affected route groups:

- `/app/muhasebe/*`
- `/app/gorev-ve-proje-yonetimi/*`
- `/app/urun-ve-hizmetler/*`
- `/app/satis-sonrasi/*`
- `/app/crm/*`
- many `/app/sistem/*` internal surfaces

Risk:

- Route release status is `development` or `development_internal`, but many entries still have `showInNavigation`, `showInSearch` and `showInCommandPalette` set to true. This can be safe only if tenant-license visibility and internal entitlement guards always win downstream.

Required fix:

- For development-only pages, default registry visibility should be false unless an explicit development/internal entitlement makes them visible.
- Add a registry contract test that checks development/internal visibility against tenant license and internal entitlement rules.

### P1-003: Placeholder module pages do not meet the standard Page Banner + Smart List/Form pattern

Affected route groups:

- `/app/crm/*`
- `/app/gorev-ve-proje-yonetimi/*`
- `/app/urun-ve-hizmetler/*`
- `/app/satis-sonrasi/*`
- several HR and accounting placeholder pages

Risk:

- Pages can ship visually as empty placeholders or module shells without the standard Eden ERP page structure.

Required fix:

- Development placeholder routes must either be explicitly hidden/internal or implemented with standard Page Banner plus Smart List/Form/Wizard structure before user-facing rollout.

### P1-004: Temalarimiz still has localStorage-backed management and non-atomic activation

Affected route/file:

- `/app/development/temalarimiz`
- `app/app/development/temalarimiz/page.tsx`
- `lib/theme/themeManagement.ts`

Risk:

- Theme management behaves like a development local state feature rather than a canonical backend-managed module. Activation cannot be guaranteed as atomic across users or devices.

Required fix:

- Persist theme records through canonical backend/DB before production release.
- Activation must be a backend transaction that deactivates the previous active system theme and activates the new one atomically.

### P1-005: Temalarimiz lifecycle schema still exposes expanded statuses internally

Affected files:

- `app/app/development/temalarimiz/page.tsx`
- `lib/theme/themeSchema.ts`
- `lib/theme/themePackageV2.ts`
- `lib/theme/workspaceThemeSchema.ts`

Observed:

- UI maps `review`, `approved`, `archived` and `rejected` to `Pasif`, but runtime schemas still contain those statuses and V2 package allowed transitions still include review/approve/archive vocabulary.

Risk:

- The UI says simple `Taslak / Aktif / Pasif`, while JSON/runtime contracts still imply a process engine.

Required fix:

- Either reduce runtime lifecycle to `draft | active | inactive` for current V2, or explicitly mark extended lifecycle as future/internal and prevent it from appearing in user-editable state.

### P1-006: Temalarimiz export/import output is not tied back to Belge Uploader slots

Affected file:

- `app/app/development/temalarimiz/page.tsx`

Observed:

- Export buttons live in the `Export / Import` tab, which is correct.
- Generated Eden JSON, Figma Tokens and CSS Variables are downloaded directly with `downloadFile`.
- The generated export artifacts are not registered into the standard Belge Uploader slots.

Risk:

- Document slot status and export artifact lifecycle can drift.

Required fix:

- Export generation should populate/update the matching document slot metadata for `Tema JSON Export`, `Figma Token Export`, `CSS Variable Export` and `Validation Report`.

### P1-007: Upload security for theme assets is still development-local

Affected route/file:

- `/app/development/temalarimiz`
- `ImageSlotUploader`
- `DocumentSlotUploader`

Risk:

- Slot metadata is well structured, but theme-management asset upload is not yet proven through server-side tenant-scoped storage, MIME allowlist, size limit, path generation and download authorization.

Required fix:

- Move theme asset upload/download through the standard secure upload proxy and FastAPI storage contract before release.

### P1-008: Theme package validator is strict, but only Hikmet package has package-level strict validation coverage

Affected files:

- `scripts/validate-hikmet-theme-package.mjs`
- `lib/theme/themeValidation.ts`
- `lib/theme/themePackageV2.ts`

Observed:

- The validator is real and not a hardcoded pass. It checks schema version, lifecycle, component contracts, backgrounds, opacity types, asset registry, SVG safety, CSS variable fallbacks, Figma output, deterministic mapping and roundtrip.

Risk:

- Other theme packages can regress unless they are covered by the same strict validation standard.

Required fix:

- Generalize strict validation to every managed/exported theme package, not only Hikmet.

## P2 Findings

### P2-001: Temalarimiz form uses page-local standard components

Affected file:

- `app/app/development/temalarimiz/page.tsx`

Observed:

- The page contains a local `FormHeader`, local uploader block wrappers, local token table and local tabs.

Risk:

- The form visually follows much of the standard, but reuse and consistency are weaker than using shared `EntityForm`, `FormHeader`, `EntityHero`, `FormTabs` and token-table components.

Required fix:

- Extract or replace local form primitives with shared standard components.

### P2-002: Temalarimiz list shows `source` as secondary row text

Affected file:

- `app/app/development/temalarimiz/page.tsx`

Risk:

- The requested list columns were limited to name, slug, status, version, active flag and updated date. The secondary `source` label is minor list detail leakage.

Required fix:

- Move `source` to the form hero or general tab if the list must remain strictly minimal.

### P2-003: Hidden/deprecated routes still have live page files

Affected routes:

- `/app/design-lab`
- `/app/sistem/temalar`
- legacy `/muhasebe/*`, `/ik/personel`, `/ayarlar/entegrasyon-ayarlari`

Risk:

- Registry hides them, but deprecated pages increase maintenance and audit surface.

Required fix:

- Keep only redirect/guard shells for deprecated routes, or remove page files when no longer needed.

### P2-004: Build warnings remain outside P0/P1 gate

Reference:

- `docs/audit/P1StandardizationBacklog.md`

Risk:

- Remaining hook dependency and preview-image warnings are non-blocking, but they should be tracked until warning count reaches zero or a documented exception baseline.

Required fix:

- Continue the P1 backlog cleanup without mechanical hook dependency insertion.

## Route Coverage Matrix

| Route group | Routes scanned | Registry | Contracts | UI standard status | Security status | Risk | Required fix |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Root/auth/PWA/release fallback | 4 | Complete | Not required for static shell routes | Mostly standard | OK | P2 | Keep hidden/static routes minimal. |
| `/app` core/account/profile/help | 6 | Complete | Mostly missing | Mixed | OK | P1 | Add contracts where stateful profile/account flows mutate data. |
| Company management release pages | 4 | Complete | Covered for company, partner, representative, authority | Strongest standard coverage | No direct DB confirmed | P1 | Keep expanding contracts to related branch/stakeholder flows. |
| Branches/facilities/organization/assets | 6 | Complete | Branch create covered only | Mixed standard coverage | No direct DB confirmed | P1 | Add contracts and standardize list/form detail pages. |
| HR | 12 | Complete | Employee create covered only | Mixed; several placeholders | No direct DB confirmed | P1 | Add contracts for personnel and HR operational pages. |
| Accounting | 17 | Complete | Missing | Mixed; several real list pages plus placeholders | No direct DB confirmed | P1 | Add contracts, typed schemas and backend references before release. |
| CRM | 8 | Complete | Missing | Mostly placeholder/no Page Banner | OK | P1 | Hide or implement standard pages. |
| Contracts | 7 | Complete | Missing | Mixed/placeholder | OK | P1 | Add page contracts before enabling. |
| Project management | 10 | Complete | Missing | Mostly placeholder/no Page Banner | OK | P1 | Hide or implement standard pages. |
| Product services | 8 | Complete | Missing | Mostly placeholder/no Page Banner | OK | P1 | Hide or implement standard pages. |
| After-sales | 14 | Complete | Missing | Mostly placeholder/no Page Banner | OK | P1 | Hide or implement standard pages. |
| System/admin/internal | 28 | Complete | Mostly missing | Mixed; many internal pages visible in registry | OK by registry check, entitlement guard still required | P1 | Default internal visibility to false unless entitlement-bound. |
| Portal | 9 | Complete | Missing | Development internal | OK | P1 | Add contracts before portal flows become active. |
| Demo/test | 4 | Complete | Missing | Demo-only | OK | P2 | Keep demo routes hidden from normal tenants. |
| Legacy hidden routes | 9 | Complete | Not required if redirect-only | Hidden | OK | P2 | Remove or keep as redirect shells. |

## Temalarimiz Detailed Findings

Route: `/app/development/temalarimiz`

Page file: `app/app/development/temalarimiz/page.tsx`

Registry:

- Status: `development_internal`
- Module: `adminConsole`
- Label: `Temalarimiz`
- Navigation/search/command palette: true
- Permission requirements: `adminConsole.manage`, `system.admin`

Contract:

- Contract id: `themes-management`
- `npm run page-flow:contract:check` passes.

List page:

- Page Banner: present.
- Main action: only `Ekle` on Page Banner.
- Smart List/table: present.
- Inline action column: not present.
- Import/export in Page Banner: not present.
- Route is development internal: yes.
- Risk: P2, because registry visibility still needs entitlement-bound route visibility guarantees.

Theme form:

- Standard-like Form Header: present, but implemented locally inside the page.
- Hero/Summary: present.
- Resim Uploader: present in hero area through `ImageSlotUploader`.
- Belge Uploader: present in hero area through `DocumentSlotUploader`.
- Left external upload panel: not present.
- Tabs: limited to 8 requested tabs.
- Save placement: Form Header only.
- Export/import: inside `Export / Import` tab.
- Color editing: compact table.
- Component rules: grouped by category.
- Preview: present.
- Status UI: shows `Taslak`, `Aktif`, `Pasif`.
- Internal status model: still includes `review`, `approved`, `archived`, `rejected`.
- Export artifact slot tracking: not yet connected to Belge Uploader slots.
- Persistence: localStorage-backed management, not canonical backend/DB.

Theme validation:

- `npm run theme:hikmet:validate` passes.
- Validator performs real schema, asset, CSS, Figma, mapper and roundtrip checks.
- It is not a hardcoded `true` pass.

## Development/Internal Pages Findings

- 124 development, demo or internal routes exist.
- Most development route entries are complete in registry but visible flags are commonly true.
- Many new module areas are placeholder-like and lack standard Page Banner + Smart List/Form structure.
- Page/Flow Contract coverage is concentrated on company, representatives, partners, branches, document upload, employees, theme management and generic lifecycle only.

## Missing Page Contracts

Contract coverage is currently 10 flows:

- `company-create-wizard`
- `representative-create`
- `representative-authority-wizard`
- `partner-create`
- `ownership-transactions`
- `branch-create`
- `document-upload`
- `employee-create`
- `themes-management`
- `generic-lifecycle-operations`

Missing contract count for `/app` routes: 121.

Largest missing groups:

- accounting: 17
- after_sales: 14
- hr: 11
- project_management: 10
- adminConsole: 10
- product_services: 8
- crm: 8
- contracts: 7
- settings: 7

## UI Standard Deviations

- Placeholder development modules lack Page Banner and Smart List/Form structure.
- Some real list pages use local page-specific implementations rather than shared standard list/form primitives.
- Some hidden/deprecated pages remain as live page files.
- `Temalarimiz` follows the requested structure but still uses local form primitives and includes minor list detail leakage.

## Data Security Deviations

- No confirmed direct DB/Supabase import was found in checked page files.
- Next API direct DB/Supabase access remains guarded by `backend:boundary:enforce`.
- Theme-management persistence and asset upload/download are development-local and must move to canonical backend contracts before release.
- Development/internal registry visibility needs an explicit entitlement visibility test.

## Required Fixes

1. Add Page/Flow Contracts for all stateful new development pages before promotion.
2. Add a registry visibility test for development/internal pages against tenant license and internal entitlements.
3. Hide placeholder module pages or implement standard Page Banner + Smart List/Form structure.
4. Move `Temalarimiz` persistence and activation to canonical backend/DB.
5. Reduce current theme lifecycle states to `draft | active | inactive` or mark extended statuses as future-only.
6. Attach generated export artifacts to standard Belge Uploader slots.
7. Generalize strict theme package validation beyond Hikmet.

## Verification Commands

Passed on canonical server repository:

```bash
npm run release:check
npm run page-flow:contract:check
npm run theme:hikmet:validate
```

Previously passed after P1 cleanup:

```bash
npm run boundaries:check
npm run eden:quality-gate
```

## Remaining Issues

- P0: None.
- P1: Contract coverage, development visibility defaults, placeholder page standardization, theme management persistence/activation, theme lifecycle simplification, upload/export slot integration.
- P2: Local form primitives, legacy hidden route cleanup, remaining build warning backlog.
