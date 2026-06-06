# Main To Virtual Server Release Workflow

## Purpose

Release is no longer promoted from `develop` to `main`. The product branch is already `main`; live deployment is a Virtual Server pull/build/restart from `origin/main`.

## Workflow

1. Work locally on `main`.
2. Keep `.env.local` connected to Development/local DB.
3. Run local checks.
4. Commit and push `origin/main`.
5. Virtual Server runs `scripts/deploy-main-vps.sh`.
6. Deploy script loads `/etc/eden-erp/eden-erp.env`.
7. Build runs with release local DB and app-session env values.
8. Service restarts after checks/build pass.

## Required Local Checks

```bash
npm run typecheck:fast
npm run env:safety
npm run release:check
```

## Required VS Checks

The VS deploy script runs:

```bash
npm run typecheck:fast
npm run env:safety
npm run release:check
npm run build
```

Run `npm run db:target:check` before any live migration/import command.

## Data Safety

- Local seed/reset/migration: Development/local DB only.
- VS live app: Release/local DB only.
- Live seed/reset: forbidden.
- Live migration: requires `ALLOW_RELEASE_DB_MIGRATION=true` and `RELEASE_MIGRATION_APPROVED_BY=<name>`.

## Rollback

Rollback means checking out a previous known-good `main` commit on the VS and rebuilding with the same live env file. Do not switch to a different long-lived branch.

## Suggested Next Prompt

VS icin GitHub webhook veya cron tabanli `scripts/deploy-main-vps.sh` otomasyonunu kur.
