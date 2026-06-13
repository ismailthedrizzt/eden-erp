# P1 Standardization Backlog

Date: 2026-06-11
Source: `docs/audit/P0GateFailureCleanupReport.md`

## P0 Reference

The P0 cleanup was accepted after the release-grade gate passed on the canonical server repository.

Closed P0 gates referenced from the accepted report:

- `npm run page-flow:contract:check`
- `npm run security:guard`
- `npm run perf:guard`
- `npm run openapi:drift`
- DB schema contract tests
- `npm run eden:quality-gate -- --quick`
- `npm run eden:quality-gate`

Remaining P0: None.

## Closed In This P1 Pass

| Item | Path | Risk | Resolution | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Action Guide frontend import boundary | `components/ai/ActionGuideSearch.tsx`, `lib/contracts/actionGuideExamples.ts`, `lib/action-guide/actionGuideExamples.ts` | Frontend component imported from the backend-core `lib/action-guide` namespace for UI placeholder examples. | Moved Action Guide example query constants to a frontend-safe shared contract under `lib/contracts/actionGuideExamples.ts`. Updated the component to import the shared contract. Kept the old backend-core file as a re-export to avoid drift. | `npm run boundaries:check` reports `Warnings: 0` and `Critical errors: 0`. |
| Safe image warning cleanup for stable identity images | `app/app/layout.tsx`, `components/ui/UserAvatar.tsx` | Stable workspace/user identity images used raw `<img>` and generated Next build warnings. | Replaced stable logo/avatar renders with `next/image` using explicit dimensions and `unoptimized` to preserve authenticated/local image URL behavior. | `npm run build` passes and image warnings are reduced from 8 to 5. |

## Remaining P1 Items

| Item | Path | Risk | Resolution | Acceptance Criteria |
| --- | --- | --- | --- | --- |
| Employee list logo image optimization | `app/app/ik/calisanlar/page.tsx:513` | Raw `<img>` warning remains for a list-row image. Low runtime risk, but it keeps the build warning count above zero. | Replace with the same project pattern used for `UserAvatar` and workspace logos: `next/image`, explicit dimensions, and `unoptimized` if the source is authenticated, local, or tenant-scoped. | Build no longer reports `@next/next/no-img-element` for this path; visual row height and logo fallback remain unchanged. |
| Document slot image previews | `components/ui/DocumentSlotUploader.tsx:322`, `components/ui/DocumentSlotUploader.tsx:1562` | Upload previews may use object URLs or transient authenticated URLs. Blind `next/image` conversion can break preview/download semantics. | Keep raw preview rendering until a project-standard `SafePreviewImage` component exists for object URLs, local blobs, and authenticated tenant file URLs. | A shared preview image component supports object URL cleanup, MIME-safe rendering, fixed dimensions, and does not proxy private assets through the Next optimizer. |
| Image slot previews | `components/ui/ImageSlotUploader.tsx:339`, `components/ui/ImageSlotUploader.tsx:533` | Upload previews use object URLs and preview modal rendering. Incorrect optimization can leak or fail blob URLs. | Consolidate with the same `SafePreviewImage` component planned for document previews. | Build warnings are removed without changing upload preview, modal preview, remove, replace, or validation behavior. |
| Hook dependency cleanup for route-level loaders | `app/app/ik/personel/page.tsx:334`, `app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx:98`, `app/app/muhasebe/on-muhasebe-hareketleri/page.tsx:77`, `app/app/sirket/companies/representatives/page.tsx:598`, `app/app/sirket/companies/stakeholders/page.tsx:320` | Missing dependency fixes can trigger repeated loads or stale closure changes if callbacks are not stabilized first. | Wrap loader/open functions with `useCallback` or move one-shot notification handling into stable effect helpers before adding dependencies. | Each page has no `react-hooks/exhaustive-deps` warning and smoke tests confirm no duplicate initial fetch or notification reopen loop. |
| Hook dependency cleanup for company/partner pages | `app/app/sirket/companies/page.tsx:692`, `app/app/sirket/companies/page.tsx:770`, `app/app/sirket/companies/page.tsx:780`, `app/app/sirket/companies/partners/page.tsx:780`, `app/app/sirket/companies/partners/page.tsx:1780` | Company and partner flows have wizard/open callbacks where naive dependency changes can reopen modals or recompute draft state unexpectedly. | Split derived memo state from effectful open/notification handlers; stabilize submit/update callbacks with explicit data dependencies. | No hook lint warnings remain and company/partner create, edit, notification open, and lifecycle wizard flows pass smoke tests. |
| Hook dependency cleanup for shared UI components | `components/ui/EmployeeLifecycleWizard.tsx:175`, `components/ui/EntityBankAccountsPanel.tsx:169`, `components/ui/EntityForm.tsx:1538`, `components/ui/MasterIdentityGate.tsx:64`, `components/ui/RecordLifecycleWizard.tsx:604`, `components/ui/SmartDataTable.tsx:548`, `components/ui/SmartDataTable.tsx:556`, `components/ui/SmartDataTable.tsx:566`, `components/ui/SmartDataTable.tsx:957`, `lib/security/moduleStore.tsx:73`, `lib/security/moduleStore.tsx:89` | Shared components have broad blast radius. Incorrect dependency changes can affect table preferences, lifecycle wizard draft state, identity gates, and module permission refreshes. | Refactor component internals before dependency changes: use stable reducer state for table config, memoize static option normalization inside memo callbacks, and stabilize permission refresh functions. | Hook warnings are removed with targeted component tests or smoke tests for SmartDataTable preferences, lifecycle wizard steps, entity form options, identity gate blocking, and module refresh behavior. |

## Current Warning Baseline

After this pass:

- Import boundary warnings: `0`
- Next build warnings: reduced from `29` to `26`
- Remaining `<img>` warnings: `5`
- Remaining hook dependency warnings: `21`

The remaining build warnings are tracked as P1 because they need behavior-preserving refactors rather than mechanical dependency insertion or unsafe image optimization.
