# Single Main Environment Policy

## Purpose

This policy protects live data while keeping development simple. Eden ERP uses one product branch and isolated local PostgreSQL DB targets.

## Decision

- `main` is the only long-lived product branch.
- The remote server pulls and runs `origin/main`.
- Development/field-test env points at `eden_development_db`.
- Release env points at `eden_release_db` or another approved release DB target.
- A same-DB schema split is not recommended for release/development separation.
- Release DB remains protected.
- Development DB remains the safe work/test area.

## Visibility Rule

Development env can expose development/demo/internal routes for testing. Release env enables only approved `release` routes and hides debug/demo/environment/page-status badges from normal users.

## P0/P1/P2 Priority

- P0: seed/reset/migration points at Release DB without approval; live env enables login bypass; release route guard bypass.
- P1: missing route registry entry; development page appears in live navigation/search.
- P2: missing deployment notes, advanced CI automation, extra smoke scenarios.

## Suggested Next Prompt

Remote server env dosyasini local PostgreSQL release degerleriyle dogrula ve `db:target:check` + backup + smoke akisini otomatiklestir.
