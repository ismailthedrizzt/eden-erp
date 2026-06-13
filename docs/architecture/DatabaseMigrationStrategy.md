# Database Migration Strategy

<!-- source-of-truth-standard: contract overrides markdown -->

## Current Decision

Supabase migrations remain the primary schema migration path during the transition. Python Alembic exists for backend-owned evolution but must not silently conflict with Supabase migrations.

## Short Term

- Keep existing `supabase/migrations/*`.
- Use Alembic only for backend-local experiments or explicitly reviewed backend-owned tables.
- Review all DB changes in PR.
- Destructive migrations require manual approval.
- Large index migrations need production rollout planning.

## Medium Term

- Choose one production schema migration source of truth.
- Add migration drift checks.
- Add rollback/runbook notes to each risky migration.
- Run staging migrations before production.

## Rollback

- Non-destructive indexes can usually remain during app rollback.
- Destructive migrations require a tested reverse migration or restore plan.
- Data migrations require backup and verification checkpoint.
