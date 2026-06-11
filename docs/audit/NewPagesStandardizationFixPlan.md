# New Pages Standardization Fix Plan

Date: 2026-06-11

## Issue P1-001: Missing Page / Flow Contracts

Risk: New pages can mutate data without typed frontend schema, backend schema, generated client reference, service command, repository method and tests.

Affected route/file:

- 121 `/app` routes without contract entries.
- Largest groups: accounting, after-sales, HR, project management, admin console, product-services, CRM, contracts and settings.

Required change:

- Add a contract entry to `contracts/page-flow-contracts.json` for every stateful page.
- Add real references for frontend schema, backend Pydantic model, generated OpenAPI path/type, service command, repository method, backend test, frontend test and e2e test.

Acceptance criteria:

- `npm run page-flow:contract:check` passes.
- No contract contains placeholder wording.
- Each promoted development route has a real contract.

Command to verify:

```bash
npm run page-flow:contract:check
```

Priority: P1

## Issue P1-002: Development/Internal Visibility Defaults

Risk: Development/internal routes can appear in navigation, search or command palette unless tenant-license/internal entitlement guards are consistently applied.

Affected route/file:

- `lib/release/routeReleaseRegistry.ts`
- `/app/muhasebe/*`
- `/app/gorev-ve-proje-yonetimi/*`
- `/app/urun-ve-hizmetler/*`
- `/app/satis-sonrasi/*`
- `/app/crm/*`
- `/app/sistem/*`

Required change:

- Default development/internal navigation/search/command visibility to false.
- Add explicit entitlement/tenant-license allow rules for development tenants.
- Add registry tests for internal route visibility.

Acceptance criteria:

- Normal tenant cannot see development/internal pages.
- Development tenant can see allowed development pages.
- `npm run release:check` passes.

Command to verify:

```bash
npm run release:check
```

Priority: P1

## Issue P1-003: Placeholder Module Pages

Risk: Empty or placeholder pages can be mistaken for finished Eden ERP surfaces.

Affected route/file:

- `/app/crm/*`
- `/app/gorev-ve-proje-yonetimi/*`
- `/app/urun-ve-hizmetler/*`
- `/app/satis-sonrasi/*`
- several HR and accounting development pages

Required change:

- Either hide placeholder routes or implement standard Page Banner + Smart List/Form/Wizard structure.

Acceptance criteria:

- Each visible development page has Page Banner and one standard primary surface.
- Placeholder routes are hidden from navigation/search/command palette.

Command to verify:

```bash
npm run release:check
npm run build
```

Priority: P1

## Issue P1-004: Temalarimiz Backend Persistence and Atomic Activation

Risk: Theme records and activation state are localStorage-backed and cannot guarantee multi-user consistency.

Affected route/file:

- `/app/development/temalarimiz`
- `app/app/development/temalarimiz/page.tsx`
- `lib/theme/themeManagement.ts`

Required change:

- Move theme records to canonical backend/DB.
- Activation must be a backend transaction.
- User/theme selection must read only active approved system themes.

Acceptance criteria:

- Activating one system theme deactivates the previous active system theme atomically.
- Refresh, browser change and user change preserve canonical theme records.
- Normal tenants see only active themes.

Command to verify:

```bash
npm run page-flow:contract:check
npm run eden:quality-gate
```

Priority: P1

## Issue P1-005: Temalarimiz Lifecycle Simplification

Risk: UI communicates `Taslak / Aktif / Pasif`, while runtime schemas still include `review`, `approved`, `archived` and `rejected`.

Affected files:

- `app/app/development/temalarimiz/page.tsx`
- `lib/theme/themeSchema.ts`
- `lib/theme/themePackageV2.ts`
- `lib/theme/workspaceThemeSchema.ts`

Required change:

- Current V2 runtime should expose only `draft`, `active`, `inactive`, or clearly isolate extended process statuses as future/internal.

Acceptance criteria:

- UI, JSON schema, runtime package and validation agree on supported current statuses.
- No review/approval/archive action is visible unless process engine is implemented.

Command to verify:

```bash
npm run theme:hikmet:validate
npm run typecheck
```

Priority: P1

## Issue P1-006: Export Artifact Slot Tracking

Risk: Generated JSON/Figma/CSS/validation files can be downloaded but are not represented in standard document slots.

Affected file:

- `app/app/development/temalarimiz/page.tsx`

Required change:

- When export files are generated, update corresponding `DocumentSlotUploader` metadata for `Tema JSON Export`, `Figma Token Export`, `CSS Variable Export` and `Validation Report`.

Acceptance criteria:

- Export buttons generate artifacts.
- Belge Uploader shows current export artifact status.
- Download happens from the standard document slot.

Command to verify:

```bash
npm run build
npm run theme:hikmet:validate
```

Priority: P1

## Issue P1-007: Theme Asset Upload Security

Risk: Theme asset upload/download is not yet proven through server-side tenant-scoped storage and authorization.

Affected route/file:

- `/app/development/temalarimiz`
- `ImageSlotUploader`
- `DocumentSlotUploader`

Required change:

- Route image/document uploads through standard secure upload proxy and FastAPI storage endpoint.
- Enforce MIME allowlist, file size, tenant scope, server-generated path and authorized download.

Acceptance criteria:

- Theme image and document uploads pass upload security contracts.
- External URL and executable payloads are rejected.
- Download is tenant-scoped.

Command to verify:

```bash
npm run security:guard
npm run eden:quality-gate
```

Priority: P1

## Issue P1-008: Theme Validator Generalization

Risk: Hikmet strict validation is real, but other theme packages can regress without the same gate.

Affected files:

- `scripts/validate-hikmet-theme-package.mjs`
- `src/themes/**`
- `lib/theme/themePackageV2.ts`

Required change:

- Generalize strict package validation into a script that validates every theme package under `src/themes`.

Acceptance criteria:

- All theme packages pass strict schema, asset, CSS, Figma, mapper and roundtrip checks.
- A failed package blocks the quality gate.

Command to verify:

```bash
npm run theme:hikmet:validate
npm run eden:quality-gate
```

Priority: P1

## Issue P2-001: Shared Form Primitive Extraction

Risk: Local page primitives drift from Eden ERP standard form components.

Affected file:

- `app/app/development/temalarimiz/page.tsx`

Required change:

- Extract local `FormHeader`, uploader wrappers, tabs and token table patterns into shared standard components or replace with existing shared components.

Acceptance criteria:

- Temalarimiz uses shared standard form primitives.
- Visual behavior remains unchanged.

Command to verify:

```bash
npm run typecheck
npm run build
```

Priority: P2

## Issue P2-002: Deprecated Hidden Route Cleanup

Risk: Hidden legacy page files increase maintenance surface.

Affected routes:

- `/app/design-lab`
- `/app/sistem/temalar`
- legacy `/muhasebe/*`, `/ik/personel`, `/ayarlar/entegrasyon-ayarlari`

Required change:

- Convert to redirect/guard shells or remove when no longer needed.

Acceptance criteria:

- Deprecated routes do not contain active business UI.
- Release registry remains complete.

Command to verify:

```bash
npm run release:check
```

Priority: P2
