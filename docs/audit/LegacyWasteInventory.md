# Legacy Waste Inventory

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

## Özet

- Toplam keyword hit: 6755
- Supabase/Vercel-related hit: 300
- Docs residue hit: 300
- Suspected dead/helper candidate: 46

## Keyword Counts

| keyword | count |
| --- | --- |
| alias | 682 |
| BACKEND_MIGRATION_STATUS | 447 |
| CANONICAL_BACKEND | 416 |
| compat | 555 |
| compatibility | 274 |
| delete_obsolete | 10 |
| demo_auth | 3 |
| deprecated | 347 |
| deprecated_wrapper | 21 |
| EDEN_ALLOW_LEGACY_API_ACCESS | 12 |
| EDEN_ENABLE_LEGACY_SUPABASE_AUTH | 11 |
| fallback | 528 |
| FIXME | 38 |
| HACK | 79 |
| legacy | 394 |
| migrate_to_fastapi | 29 |
| mock | 80 |
| NEXT_PUBLIC_SUPABASE | 10 |
| obsolete | 43 |
| old | 1148 |
| placeholder | 169 |
| proxy_to_fastapi_with_temporary_fallback | 12 |
| service_role | 12 |
| signed-url | 15 |
| signedUrl | 23 |
| SUPABASE | 298 |
| supabase storage | 14 |
| TARGET_FASTAPI_ENDPOINT | 436 |
| temporary | 180 |
| temporary_fallback | 13 |
| test route | 3 |
| TODO | 421 |
| VERCEL | 32 |

## Aksiyon Alınabilir Örnek Bulgular

| file/path | line/context | kategori | risk | önerilen aksiyon | priority | release blocker mı? |
| --- | --- | --- | --- | --- | --- | --- |
| app/layout.tsx | 11: const legacyTheme = localStorage.getItem('theme'); | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/app/layout.tsx | 109: <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#09141e]" />}> | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/app/page.tsx | 19: import { buildEmployeesDashboard } from '@/lib/modules/employees/dashboard/employeesDashboard.mock' | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/app/page.tsx | 219: .map(id => availableWidgets.get(id) // buildRegisteredWidgetPlaceholder(id)) | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/ik/personel/page.tsx | 3: export default function LegacyPersonelPage() { | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/_proxy.ts | 3: // NOTES: Admin Console has no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/_proxy.ts | 3: // NOTES: Admin Console has no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/route.ts | 3: // NOTES: Admin Console dashboard proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/route.ts | 3: // NOTES: Admin Console dashboard proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/products/route.ts | 4: // NOTES: Product catalog list/create route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/products/route.ts | 4: // NOTES: Product catalog list/create route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/data-quality/_proxy.ts | 3: // NOTES: Data Quality has no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/data-quality/_proxy.ts | 3: // NOTES: Data Quality has no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/documents/_upload.ts | 122: function stringValue(value: FormDataEntryValue / null, fallback: string) { | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/documents/_proxy.ts | 3: // NOTES: Documents has no legacy fallback; storage and document policy live in FastAPI. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/documents/_proxy.ts | 3: // NOTES: Documents has no legacy fallback; storage and document policy live in FastAPI. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/route.ts | 4: // NOTES: Contract list/create route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/route.ts | 4: // NOTES: Contract list/create route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/organization/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/_banking.ts | 2: import type { SupabaseClient } from '@supabase/supabase-js' | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/notifications/_proxy.ts | 3: // NOTES: Notifications has no legacy fallback; delivery policy lives in FastAPI. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/notifications/_proxy.ts | 3: // NOTES: Notifications has no legacy fallback; delivery policy lives in FastAPI. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/import/_proxy.ts | 3: // NOTES: Data import/export has no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/import/_proxy.ts | 3: // NOTES: Data import/export has no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/projects/route.ts | 4: // NOTES: Project Management project list/create route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/projects/route.ts | 4: // NOTES: Project Management project list/create route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/tasks/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/ownership-transactions/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/search/_proxy.ts | 3: // NOTES: Global search and command palette have no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/search/_proxy.ts | 3: // NOTES: Global search and command palette have no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/approvals/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/facilities/route.ts | 4: // NOTES: This route is a BFF/proxy compatibility layer. Do not add facility lifecycle logic here. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/audit/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/processes/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/user-registration-requests/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/companies/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/employees/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/session/bootstrap/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/health/route.ts | 3: // NOTES: Admin health proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/health/route.ts | 3: // NOTES: Admin health proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/integrations/route.ts | 3: // NOTES: Admin integrations proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/integrations/route.ts | 3: // NOTES: Admin integrations proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/outbox/route.ts | 3: // NOTES: Admin outbox proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/outbox/route.ts | 3: // NOTES: Admin outbox proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/modules/route.ts | 3: // NOTES: Admin module list proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/modules/route.ts | 3: // NOTES: Admin module list proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/settings/route.ts | 3: // NOTES: Admin settings proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/settings/route.ts | 3: // NOTES: Admin settings proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/features/route.ts | 3: // NOTES: Admin feature flag list proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/features/route.ts | 3: // NOTES: Admin feature flag list proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/workspace-settings/route.ts | 3: // NOTES: Workspace settings proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/workspace-settings/route.ts | 3: // NOTES: Workspace settings proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/health/deep/route.ts | 3: // NOTES: Admin deep health proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/health/deep/route.ts | 3: // NOTES: Admin deep health proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/integrations/[integration_key]/test/route.ts | 3: // NOTES: Admin integration test proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/integrations/[integration_key]/test/route.ts | 3: // NOTES: Admin integration test proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/outbox/dispatch-once/route.ts | 3: // NOTES: Admin outbox dispatch proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/outbox/dispatch-once/route.ts | 3: // NOTES: Admin outbox dispatch proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/outbox/[event_id]/retry/route.ts | 3: // NOTES: Admin outbox retry proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/outbox/[event_id]/retry/route.ts | 3: // NOTES: Admin outbox retry proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/modules/[module_key]/route.ts | 3: // NOTES: Admin module detail proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/modules/[module_key]/route.ts | 3: // NOTES: Admin module detail proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/modules/[module_key]/activation/route.ts | 3: // NOTES: Admin module activation proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/modules/[module_key]/activation/route.ts | 3: // NOTES: Admin module activation proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/settings/[settings_key]/route.ts | 3: // NOTES: Admin setting update proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/settings/[settings_key]/route.ts | 3: // NOTES: Admin setting update proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/features/[feature_key]/route.ts | 3: // NOTES: Admin feature flag update proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/admin/features/[feature_key]/route.ts | 3: // NOTES: Admin feature flag update proxy; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/entities/[entityKind]/[entityId]/bank-accounts/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/onboarding/system-tour/_shared.ts | 37: const { supabase, userId, workspaceId } = context | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/ai/cv-extract/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/route.ts | 4: // NOTES: Contract detail route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/route.ts | 4: // NOTES: Contract detail route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/amend/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/amend/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/documents/route.ts | 4: // NOTES: Contract documents route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/documents/route.ts | 4: // NOTES: Contract documents route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/terminate/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/terminate/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/archive/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/archive/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/events/route.ts | 4: // NOTES: Contract event timeline route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/events/route.ts | 4: // NOTES: Contract event timeline route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/renew/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/renew/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/suspend/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/suspend/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/relations/route.ts | 4: // NOTES: Contract relation route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/relations/route.ts | 4: // NOTES: Contract relation route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/obligations/route.ts | 4: // NOTES: Contract obligation route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/obligations/route.ts | 4: // NOTES: Contract obligation route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/activate/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/activate/route.ts | 4: // NOTES: Contract lifecycle route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/amend/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/amend/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/documents/upload/route.ts | 4: // NOTES: Contract document upload route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/documents/upload/route.ts | 4: // NOTES: Contract document upload route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/terminate/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/terminate/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/renew/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/renew/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/suspend/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/suspend/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/obligations/[obligationId]/route.ts | 4: // NOTES: Contract obligation detail route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/obligations/[obligationId]/route.ts | 4: // NOTES: Contract obligation detail route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/activate/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/contracts/[id]/activate/precheck/route.ts | 4: // NOTES: Contract lifecycle precheck route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/cari-transactions/route.ts | 4: // NOTES: New accounting cari transaction route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/cari-transactions/route.ts | 4: // NOTES: New accounting cari transaction route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/bank-connections/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/bank-transactions/route.ts | 4: // NOTES: Accounting deepening route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/bank-transactions/route.ts | 4: // NOTES: Accounting deepening route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/bank-accounts/route.ts | 4: // NOTES: Accounting deepening route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/bank-accounts/route.ts | 4: // NOTES: Accounting deepening route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/bank-card-transactions/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/financial-institution-movements/route.ts | 4: // NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI. | Supabase/Vercel residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/e-documents/route.ts | 4: // NOTES: Accounting deepening route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/e-documents/route.ts | 4: // NOTES: Accounting deepening route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/capital-reconciliation/route.ts | 4: // NOTES: Accounting deepening route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |
| app/api/accounting/capital-reconciliation/route.ts | 4: // NOTES: Accounting deepening route is proxy-only; no legacy fallback. | legacy/fallback/docs residue | runtime/developer confusion | review then migrate/delete after test | P1 | no confirmed P0 |

## Not

Bu rapor ham 6.755 satırı birebir commit etmez; ham tarama `/tmp/eden_simplification_inventory.json` altında üretildi. Cleanup sprintlerinde her kategori için caller/test audit yapılmadan silme yapılmamalıdır.
