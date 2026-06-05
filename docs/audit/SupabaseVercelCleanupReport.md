# Supabase Vercel Cleanup Report

## Changed Files

- `middleware.ts`
- `next.config.js`
- `package.json`
- `lib/supabase/server.ts`
- `docs/release/TwoVercelTwoSupabaseSetup.md`
- `docs/release/SupabaseEnvironmentSeparation.md`
- `docs/release/VercelEnvironmentSeparation.md`
- `docs/release/DevelopmentSupabaseSetupGuide.md`
- `docs/release/SafeDevelopmentCloneGuide.md`

## Why Changed

Supabase and Vercel are no longer canonical runtime dependencies. Their remaining references are marked legacy or moved out of primary scripts.

## P0/P1/P2

- P0: release path enabling `EDEN_ENABLE_LEGACY_SUPABASE_AUTH`.
- P1: Supabase image/storage cache rules in PWA config.
- P1: direct Supabase server client imports in old migration inventory.
- P2: historical documentation naming old environments.

## Field Test Impact

Operators should use remote server scripts and DB guards, not Vercel or Supabase dashboards, for field-test deployment safety.

## Remaining Risks

Legacy Supabase dependencies remain installed until all migration inventory is removed.
