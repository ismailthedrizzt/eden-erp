# Supabase/Vercel Residue Cleanup Report

## Metadata

| Field | Value |
| --- | --- |
| Date | 2026-06-06 |
| Branch | `main` |
| Baseline commit | `a82ff9b32b2688e5ea8fed8143f74ea76887127c` |
| Working environment | Remote server + local PostgreSQL/local DB |

## Canonical Position

Supabase and Vercel are not canonical runtime platforms for Eden ERP. The canonical path is:

```text
Next.js UI/BFF -> FastAPI canonical backend -> local PostgreSQL/local DB
Documents -> local filesystem storage through FastAPI/Next media proxy
Auth -> app session + FastAPI trusted proxy context
```

## Inventory

| File/Path | Context | Usage Type | Risk | Recommended Next Action | Priority |
| --- | --- | --- | --- | --- | --- |
| `lib/supabase/server.ts` | `createClient`, `createServiceClient`, `@supabase/ssr` | legacy adapter | Server-side Supabase calls remain possible if imported path executes. | Replace consumers, then move to `lib/legacy/supabase/server.ts` or delete. | P1 |
| `lib/security/policyEngine.ts` | imports `createServiceClient` | legacy/data/audit | Policy denied audit can touch Supabase instead of FastAPI/local DB. | Move audit write to FastAPI audit endpoint/service. | P1 |
| `lib/modules/moduleGuards.ts` | imports `createServiceClient` | legacy/runtime | Module readiness can touch Supabase. | Replace with FastAPI/local DB module readiness endpoint. | P1 |
| `lib/user-state/server.ts` | imports `createServiceClient` | legacy/auth/data | User state path can depend on Supabase user/data reads. | Route user-state bootstrap through app session + FastAPI. | P1 |
| `lib/documents/documentThumbnailBackfill.server.ts` | imports `createServiceClient` | legacy/storage | Backfill can target old storage. | Replace with local document storage backfill. | P1 |
| `lib/documents/documentThumbnails.server.ts` | type import from Supabase adapter | legacy/type | Type dependency keeps adapter visible. | Replace adapter type with local storage/service interface. | P2 |
| `app/api/onboarding/system-tour/_shared.ts` | type import from Supabase adapter | legacy/type | Tour helper type still names Supabase. | Replace with local DB repository type. | P2 |
| `@supabase/ssr`, `@supabase/supabase-js` in `package.json` | dependencies | dependency | Dependency remains while legacy imports exist. | Remove only after all active imports are replaced. | P1 |
| `docs/release/*` | old `supabase:target:check` references | docs | Operator confusion. | Replaced with `db:target:check` in this phase. | P1 fixed |
| Historical audit docs | Supabase residue snapshots | docs | Intentional audit evidence. | Keep as historical baseline. | - |

## Cleanup Applied In This Phase

- Middleware was verified to have no `@supabase/ssr` import and no Supabase client creation.
- Release safety blocks `EDEN_ENABLE_LEGACY_SUPABASE_AUTH=true`.
- `next.config.js` was verified to have no Supabase image/storage allowlist.
- `lib/supabase/server.ts` was marked deprecated with the canonical FastAPI + local DB + app session rule.
- Release/operator docs were corrected from Supabase target commands to local DB target commands.

## Deferred Cleanup

No active Supabase imports were deleted in this phase because those changes can alter runtime behavior. The next phase should replace the active imports one by one with FastAPI/local DB equivalents and rerun the full baseline after each group.

## P0/P1/P2

| Priority | Risk | Status |
| --- | --- | --- |
| P0 | Middleware requires Supabase env to start. | Not observed; middleware is app-session based. |
| P0 | Release allows legacy Supabase auth. | Blocked by release safety. |
| P1 | Legacy Supabase adapter still has active imports. | Inventory recorded; cleanup deferred. |
| P2 | Historical docs mention Supabase. | Canonical operator docs corrected; historical audit docs retained. |
