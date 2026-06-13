# Main / Remote Server Release Workflow

<!-- source-of-truth-standard: contract overrides markdown -->

## Purpose

Development and live release use the same `main` code. They are separated by environment values and local PostgreSQL DB targets, not Supabase projects.

## Development / Field Test

- Branch: `main`
- Runtime: remote server or controlled development server
- DB: `eden_development_db` or DB target marked `DATABASE_TARGET_CLASS=development`
- Demo/field-test data is allowed.
- Development/internal/demo pages can be visible.

## Remote Server Release

- Branch: `main`
- Runtime: remote server
- DB: `eden_release_db` or approved release `DATABASE_URL`
- `APP_ENV=release`
- `AUTH_REQUIRED=true`
- Demo mode is off.
- Environment/status/version badge is hidden from normal users.

## Deploy Flow

```text
commit -> push origin main -> remote server pull/build -> DB guard -> env safety -> restart services
```

## P0/P1/P2 Priority

- P0: release env points at development DB or auth bypass is enabled.
- P1: release env shows demo/status surfaces.
- P2: webhook/cron automation missing.

## Suggested Next Prompt

Remote server deploy automation and smoke checklist should call `db:target:check`, `env:safety`, build and process health checks.
