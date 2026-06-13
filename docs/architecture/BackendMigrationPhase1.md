# Backend Migration Phase 1

<!-- source-of-truth-standard: contract overrides markdown -->

## Current Repo Summary

- Frontend framework: Next.js 15 App Router with TypeScript, React 19, Tailwind CSS.
- Routing: pages live under `app/`; existing API routes live under `app/api/`.
- Auth flow: Supabase SSR middleware protects non-API routes and redirects unauthenticated users to `/login`. Demo cookie bypass access has been removed; only Supabase sessions or server-signed app sessions may pass protected routes.
- Supabase usage:
  - Browser clients still exist in `hooks/useTeskilat.ts`, `hooks/useSirketler.ts`, `hooks/usePersonel.ts`, and `hooks/useNakitIslemler.ts`.
  - Sensitive direct client writes still exist in `usePersonel` and `useNakitIslemler`.
  - Next API routes already use server/service Supabase access for several company, HR, vehicle, reference, and settings endpoints.
- Main modules detected: company management, employees, organization/positions, vehicles, accounting, system module licenses, documents/reference data, and workflow documentation.
- Form pattern: reusable `EntityForm`, `SmartDataTable`, `PageBanner`, and module-specific pages. Form modes currently map to `create`, `view`, and `edit`.
- Env vars: Supabase public URL/anon key, service role key, app URL/name, Gemini settings, cron secret. Phase 1 adds FastAPI and database env placeholders.

## New Structure Added

```text
apps/
  api/
    app/
      api/routes/
      core/
      schemas/
      services/
packages/
  shared/src/
infra/
  docker-compose.yml
  env.example
```

The existing frontend remains at the repo root for this phase. Moving it to
`apps/web` should be a later mechanical step after the backend contract settles.

## Permission Model

Permissions are action based and use:

```text
resource.action
```

The shared constants and database seed include:

```text
companies.view
companies.insert
companies.edit
companies.approve
companies.passivate
companies.export
employees.view
employees.insert
employees.edit
vehicles.view
vehicles.insert
vehicles.edit
workflow.approve
documents.export
```

Minimum actions are represented as lowercase constants:

```text
view, insert, edit, approve, passivate, export
```

## Module Toggle Model

`instance_modules` has been introduced with:

```text
id
instance_id
module_code
status
enabled_at
disabled_at
settings_json
```

Supported statuses:

```text
enabled
disabled
readonly
beta
```

Backend routes can now depend on `require_module_enabled(module_code, write=True)`.
Frontend has a new `ModuleProvider` and `useModules()` store for hiding disabled
modules or suppressing write controls.

## Workflow Readiness

The migration adds generic workflow tables:

```text
workflow_definitions
workflow_steps
workflow_requests
workflow_actions
```

The FastAPI service boundary is in place:

```text
direct_update()
request_update()
approve_update()
reject_update()
```

`WorkflowService` is currently a stub that always permits direct updates. This is
intentional for Phase 1 so modules can call the workflow boundary before a full
approval engine exists.

## Direct Supabase Still Present

Client-side direct Supabase usage remains in:

```text
hooks/useTeskilat.ts
hooks/useSirketler.ts
hooks/usePersonel.ts
hooks/useNakitIslemler.ts
```

Highest-risk remaining direct writes:

```text
hooks/usePersonel.ts
hooks/useNakitIslemler.ts
```

Companies already use Next API routes from the page, but `useSirketler` still
fetches some details directly from Supabase and should be migrated next.

## Phase Status

- Phase 1: repo analysis and backend skeleton complete.
- Phase 2: auth, permission, and module toggle infrastructure started.
- Phase 3: audit/history/optimistic locking modeled and implemented in the FastAPI company service, pending end-to-end migration.
- Phase 4: Companies has frontend permission gating started; data writes still use existing Next API routes until the FastAPI route is wired in production.

## Next Steps

1. Apply `supabase/migrations/20260503_backend_architecture_foundation.sql`.
2. Configure `NEXT_PUBLIC_API_BASE_URL`, `DATABASE_URL`, and `SUPABASE_JWT_SECRET`.
3. Seed an ERP instance, roles, user roles, and module rows for the active customer.
4. Migrate `useSirketler` list/detail access to `lib/api/apiClient.ts`.
5. Move company POST/PATCH/DELETE from Next API routes to FastAPI after validating parity.
6. Migrate `usePersonel` and `useNakitIslemler` next because they still perform direct browser writes.
