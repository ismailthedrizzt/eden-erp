# Supabase Environment Separation

## Purpose

Development Supabase and Release Supabase are separate projects. Separate schema in the same project is not recommended.

## Development Supabase

- Separate Supabase project.
- Migrations and seed data are applied here.
- Demo data is stored here.
- Field test users are created here.
- Reset is allowed after confirming the target is Development.
- Service role key belongs to the Development project.
- Anon key belongs to the Development project.

## Release Supabase

- Existing protected project.
- Live/approved data area.
- Demo seed is forbidden.
- Reset is forbidden.
- Migration requires:

```env
ALLOW_RELEASE_DB_MIGRATION=true
RELEASE_MIGRATION_APPROVED_BY=<name>
```

## Setup Checklist

| item | Development | Release |
|---|---|---|
| Auth enabled | yes | yes |
| RLS/policies checked | yes | yes |
| Storage buckets created | yes | yes |
| Required tables/migrations applied | yes | controlled |
| Demo users created | yes | no |
| Demo data seeded | optional | no |
| Service role key verified | Development project | Release project |
| Anon key verified | Development project | Release project |
| Project ref recorded | `DEVELOPMENT_SUPABASE_PROJECT_REF` | `RELEASE_SUPABASE_PROJECT_REF` |

## Why Not One Project With Separate Schema

- Supabase client assumes the default `public` schema in many flows.
- Auth is project-level, not schema-level.
- Storage is project-level, not schema-level.
- RLS policies can be confused across environment assumptions.
- Migration target mistakes can touch live data.

## Commands

```bash
npm run supabase:target:check
```

## Findings

Target guard can block release seed/reset and can require explicit release migration approval.

## Risks

- Missing `SUPABASE_PROJECT_REF` makes target detection less precise.
- Same-project schema split leaves auth/storage mixed.

## Recommended Fixes

- Create a dedicated Development Supabase project.
- Record both project refs in Vercel env as guard references.
- Keep Release Supabase credentials out of `.env.local`.

## P0/P1/P2 Priority

- P0: Development seed/reset hits Release Supabase.
- P1: Missing RLS/storage setup in Development project.
- P2: Add scripted Supabase project metadata check if CLI access is later configured.

## Suggested Next Prompt

Development Supabase project kurulumundan sonra bucket, auth ve migration smoke checklistini calistir.
