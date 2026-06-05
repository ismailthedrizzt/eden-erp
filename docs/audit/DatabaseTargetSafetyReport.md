# Database Target Safety Report

## Changed Files

- `scripts/check-database-target.js`
- `scripts/check-supabase-target.js`
- `package.json`
- `scripts/check-release-env-safety.js`

## Why Changed

DB safety must reason about `DATABASE_URL`, `DB_NAME`, `APP_ENV`, command context and release approval flags instead of Supabase project refs.

## P0/P1/P2

- P0: `DATABASE_URL` missing but DB command passes.
- P0: release DB seed/reset passes.
- P0: development context points at release-like DB.
- P1: ambiguous DB name in release context.
- P2: legacy Supabase target script remains for historical commands.

## Field Test Impact

Before field test, run `npm run db:target:check`. Release migrations require explicit approval env values.

## Remaining Risks

DB name classification is pattern based. Ambiguous release targets fail, but operators should still verify manually.
