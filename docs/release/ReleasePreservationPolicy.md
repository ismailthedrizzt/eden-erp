# Release Preservation Policy

<!-- source-of-truth-standard: contract overrides markdown -->

## Purpose

Release preservation is now data/env based, not branch based. The same `main` code runs locally and on the Virtual Server.

## Local Runtime

- Branch: `main`
- Env source: `.env.local`
- DB: Development/local PostgreSQL target
- Codex may actively develop here.
- Demo, seed, reset and migration experiments are allowed only against Development/local DB.

## Live Runtime

- Branch: `main`
- Machine: Virtual Server
- Env source: `/etc/eden-erp/eden-erp.env`
- DB: Release/local PostgreSQL target
- Ollama: VS-local service
- Live secrets stay on the VS or secret manager.

## Hard Rules

- No long-lived `develop` branch.
- Release DB is never used from local `.env.local`.
- Schema/migration/seed experiments are not run on Release DB.
- Release migration requires explicit approval env values.
- Release env keeps demo mode, login bypass and legacy API access disabled.

## P0/P1/P2 Priority

- P0: local command mutates Release DB; VS live env targets Development DB; unsafe release flags are enabled.
- P1: `release:check`, `env:safety`, `db:target:check` are skipped before risky operations.
- P2: manual smoke checklist is incomplete.

## Suggested Next Prompt

VS deploy oncesi otomatik kontrol ve smoke checklist akisini tek komutta topla.
