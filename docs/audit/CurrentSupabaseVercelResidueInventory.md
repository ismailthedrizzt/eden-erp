# Current Supabase/Vercel Residue Inventory

Date: 2026-06-06
Branch: `main`
Commit: `9b1b0297ce4171cd85d0154ed4bd9a2ebc2e8d7d`
Working environment: remote server release runtime

## Tested Commands

- `rg -i` for `SUPABASE`, `NEXT_PUBLIC_SUPABASE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `@supabase`, `createServerClient`, `supabase.auth`, `supabase.storage`.
- `rg -i` for `VERCEL`, `VERCEL_ENV`.
- `rg -i` for `check-supabase-target`, `supabase:migrate`, `db:reset:public`.

## Inventory Notes

This inventory is file/context based. Repeated proxy comments with the same purpose are grouped by category to keep the report usable. No deletion was performed.

## Code Residue

| File/path | Line/context | Usage type | Risk | Recommended next action | Priority |
| --- | --- | --- | --- | --- | --- |
| `backend/app/core/config.py` | Supabase env fields: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_JWKS_URL`, `USE_SUPABASE_POOLER` | env/auth/legacy | External auth/storage assumptions remain configurable. | Keep only if explicit legacy compatibility is still required; otherwise remove in backend cleanup phase. | P1 |
| `backend/app/core/database.py` | `use_supabase_pooler` in pool summary | env/legacy | Naming implies Supabase pooler although current DB is local PostgreSQL. | Rename/generalize after config cleanup. | P2 |
| `backend/app/core/security.py` | `verify_legacy_supabase_jwt`, `verify_supabase_jwt` | auth/legacy | Legacy verifier can confuse canonical app-session/trusted-proxy model. | Remove or guard behind an explicit documented compatibility flag. | P1 |
| `backend/app/domains/security/service.py` | Warning mentions Supabase Auth profile sync | docs/runtime message | User-facing/admin message references old auth model. | Rewrite to app-session/local profile terminology. | P2 |
| `backend/app/domains/admin/system_health.py` | Supabase-related health/integration references | legacy/health | Health output may imply old dependency. | Align health checks to local DB/FastAPI topology. | P2 |
| `backend/app/domains/admin/integrations.py` | Supabase-related integration residue | legacy | Could preserve old integration assumptions. | Review during admin/integration cleanup. | P2 |
| `backend/app/domains/portal/documents.py` | Supabase references in portal documents domain | storage/legacy | Portal documents may still imply old storage semantics. | Ensure portal document download uses local media route. | P1 |
| `backend/app/seeds/demo_seed.py` | Supabase references | seed/legacy | Demo docs/seed wording can target wrong platform. | Update seed docs/messages after seed audit. | P2 |
| `backend/migrations/versions/20260528_1700_document_management.py` | Historical Supabase/document storage references | migration/history | Historical migration should not be edited unless broken. | Keep as historical context. | P2 |
| `backend/migrations/README.md` | Supabase migration wording | docs | Old migration instructions. | Update to Alembic/local DB runbook. | P2 |
| `lib/supabase/client.ts` | Supabase client module | legacy | Direct client can be reused accidentally. | Delete or quarantine after all imports are removed. | P1 |
| `lib/supabase/server.ts` | `createServiceClient` | legacy/auth/storage | Service client is high-risk if used in server routes. | Remove after replacing all consumers with FastAPI/BFF. | P1 |
| `lib/modules/moduleContract.types.ts` | `SupabaseClient` type import | dependency/type | Shared contract still includes Supabase type. | Replace with neutral repository/context interface. | P1 |
| `lib/modules/moduleGuards.ts` | `createServiceClient` and readiness calls | legacy/runtime | Runtime module guard may still touch Supabase. | Move readiness to FastAPI or local DB BFF. | P1 |
| `lib/action-center/actionCenter.types.ts` | `SupabaseClient` type | legacy/type | Action Center contract still typed around Supabase. | Replace with canonical backend client/context. | P1 |
| `lib/operations/operationRequestService.ts` | `SupabaseClient`, `.from(...)` calls | legacy/data | Operation requests can bypass FastAPI canonical backend if used. | Migrate to FastAPI endpoints, then delete. | P1 |
| `lib/integrity/**` | `SupabaseClient`, `supabase.from(...)` patterns | legacy/data | Integrity checks still modeled as direct Supabase reads. | Move to FastAPI integrity endpoints. | P1 |
| `lib/setup/**` | readiness checker/service uses `SupabaseClient` | setup/legacy | Setup readiness can depend on old DB access model. | Move readiness checks to FastAPI. | P1 |
| `lib/documents/documentThumbnails.server.ts` | `supabase.storage` | storage/legacy | Thumbnail storage path can conflict with local storage canonical path. | Replace with local document storage thumbnail service. | P1 |
| `lib/documents/documentThumbnailBackfill.server.ts` | `createServiceClient`, `supabase.storage.download` | storage/legacy | Backfill can target old storage. | Disable/delete after local thumbnail strategy lands. | P1 |
| `lib/user-state/server.ts` | `createServiceClient`, `supabase.auth.getUser`, multiple `.from(...)` | auth/data/legacy | User state still has old Supabase path. | Ensure all live session/bootstrap paths use FastAPI/local DB, then remove. | P1 |
| `lib/services/notifications/processNotification.server.ts` | `SupabaseClient`, `.from(...)` | legacy/data | Notifications can bypass FastAPI. | Move notification writes to FastAPI/outbox. | P1 |
| `lib/media/mediaMetadata.server.ts` | Supabase references | storage/legacy | Media metadata may contain old storage assumptions. | Align with `/api/media/open` and local storage. | P1 |
| `lib/auth/userRegistrationRequests.ts` | Supabase references | auth/legacy | User registration path may not be fully local/FastAPI. | Migrate to FastAPI auth/admin endpoints. | P1 |
| `lib/security/**` | Supabase references in access/scope/policy modules | auth/scope/legacy | Security logic can remain split between TS and FastAPI. | Move scope/permission decisions to canonical backend/shared contracts. | P1 |
| `lib/audit/**` | Supabase references | audit/legacy | Audit write/read paths may bypass FastAPI. | Confirm active API routes proxy to FastAPI, then delete legacy. | P1 |
| `lib/process/**` | Supabase references | process/legacy | Process engine TS remnants can compete with FastAPI. | Keep only shared types; move runtime to FastAPI. | P1 |
| `lib/read-models/**` | Supabase/read model references | read-model/legacy | Read model execution can drift from FastAPI projections. | Keep projections as shared contracts only. | P1 |
| `app/api/companies/**`, `app/api/employees/**`, `app/api/processes/**`, `app/api/audit/**`, `app/api/accounting/**`, `app/api/settings/**`, `app/api/tasks/**` | Many route comments state "DB and Supabase access belong to FastAPI." | docs/comment | Comment is mostly good boundary intent, but still names Supabase. | Replace wording with "DB access belongs to FastAPI" after cleanup. | P2 |
| `app/app/belgeler/page.tsx` | UI fallback `selected.storage_provider || 'supabase'` | storage/UI | UI can display Supabase as default provider. | Change fallback to `local` in cleanup phase. | P1 |
| `components/audit/AuditDetailDrawer.tsx` | Masks `supabase.co/storage` URLs | storage/safety | Safe masking, but old host-specific logic. | Keep or generalize to all signed/media URLs. | P2 |
| `package.json`, `package-lock.json` | `@supabase/ssr`, `@supabase/supabase-js` dependencies | dependency | Dependency keeps legacy imports buildable. | Remove only after imports are gone. | P1 |
| `middleware.ts` | `EDEN_ENABLE_LEGACY_SUPABASE_AUTH` branch returns disabled error | auth/guard | Good guard but old env name remains. | Keep until legacy paths are removed; then delete flag. | P2 |

## Documentation Residue

| File/path | Context | Usage type | Risk | Recommended next action | Priority |
| --- | --- | --- | --- | --- | --- |
| `docs/AI_COLLABORATION_GUIDE.md` | Mentions Supabase DB/Auth/Storage and old Vercel/Supabase environment split | docs | High confusion risk for future agents. | Rewrite after this baseline. | P1 |
| `docs/release/EnvironmentVariableMatrix.md` | Supabase Development/Release project matrix | docs | Contradicts current local DB reality. | Replace with remote/local PostgreSQL matrix. | P1 |
| `docs/release/TwoEnvironmentReleasePolicy.md` | Two Supabase project policy | docs | Outdated release safety policy. | Rewrite to remote server/local DB policy. | P1 |
| `docs/release/DevelopmentReleaseWorkflow.md` | Supabase project based workflow | docs | Outdated workflow. | Rewrite. | P1 |
| `docs/release/DevelopmentEnvironmentChecklist.md` | Supabase env examples and target check | docs | Can lead to wrong env setup. | Replace with local DB setup checklist. | P1 |
| `docs/release/ReleaseEnvironmentChecklist.md` | Release Supabase env examples | docs | Can lead to wrong release env. | Replace with local DB release checklist. | P1 |
| `docs/release/RuntimeSmokeChecklist.md` | `supabase:target:check` and Supabase auth checks | docs/script | Outdated smoke commands. | Replace with `db:target:check`, app-session login, FastAPI health. | P1 |
| `docs/release/ProductionReadinessReport.md` | "PostgreSQL/Supabase remains system of record" | docs | Outdated system-of-record description. | Update to local PostgreSQL. | P2 |
| `docs/architecture/EnvironmentVariables.md` | Supabase env references | docs | Env confusion. | Rewrite as local DB/FastAPI/Next secret matrix. | P1 |
| `docs/architecture/DeploymentTopology.md` | Vercel/Supabase references | docs | Topology confusion. | Update to PM2 remote topology. | P1 |
| `docs/architecture/DatabaseMigrationStrategy.md` | Supabase migration strategy references | docs | Migration runbook confusion. | Align to Alembic. | P1 |
| `docs/architecture/PythonAuthTenantSecurity.md` | Supabase auth references | docs | Auth model confusion. | Update to app-session/trusted proxy. | P1 |
| `docs/operations/RemoteServerDeploymentRunbook.md` | Vercel/Supabase residue | docs | Ops runbook drift. | Update in operations cleanup. | P1 |
| `docs/operations/BackupRestoreRunbook.md` | Vercel/Supabase residue | docs | Backup/restore drift. | Rewrite around local PostgreSQL backups. | P1 |
| Existing audit docs | Historical reports mention Supabase/Vercel | docs/history | Mostly historical; do not rewrite blindly. | Keep historical, add current baseline cross-reference. | P2 |

## Vercel Residue

| File/path | Context | Usage type | Risk | Recommended next action | Priority |
| --- | --- | --- | --- | --- | --- |
| `docs/release/*` | Old Vercel URL/checklist/reporting references | docs | Confuses live deployment reality. | Rewrite release docs after architecture cleanup. | P1 |
| `docs/architecture/DeploymentTopology.md` | Vercel topology references | docs | Confuses target topology. | Replace with remote PM2 topology. | P1 |
| `docs/operations/*` | Vercel deployment/backup context | docs | Operational drift. | Update runbooks. | P1 |
| `scripts/check-release-env-safety.js` | Vercel-related checks/wording | script | May still be useful if generic, but naming may drift. | Review and rename/generalize if needed. | P2 |
| `lib/release/environment.ts` | Release environment resolution may mention Vercel env | env | Platform naming residue. | Keep if harmless; generalize later. | P2 |
| `app/api/auth/otp/send/route.ts` | Vercel/env references found by scan | auth/env | Need review for release-specific behavior. | Inspect during auth cleanup. | P2 |

## Script Pattern Inventory

The requested patterns `check-supabase-target`, `supabase:migrate`, and `db:reset:public` were not found in the scanned paths. Current DB safety scripts are `db:target:check`, `db:migrate:check`, `db:seed:check`, `db:reset:check`, and `db:reset:development`.

## P0/P1/P2 Summary

- P0: none confirmed by residue scan alone.
- P1: runtime-capable Supabase TS modules and dependencies remain.
- P1: old release/architecture docs can mislead future implementation.
- P2: comments and historical audit docs use old terminology.

## Next Phase Impact

Cleanup should proceed in dependency order:

1. Prove no active route imports `lib/supabase/*`.
2. Migrate or delete TS runtime modules using `SupabaseClient`.
3. Remove Supabase dependencies.
4. Rewrite current docs/runbooks.
5. Keep historical audit reports as history, not instructions.
