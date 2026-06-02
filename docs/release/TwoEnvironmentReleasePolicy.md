# Single Main Environment Policy

## Purpose

This policy protects live data while keeping development simple. Eden ERP uses one product branch and two isolated Supabase projects.

## Decision

- `main` is the only long-lived product branch.
- Local development runs from `main`.
- The Virtual Server pulls and runs `origin/main`.
- Local `.env.local` points to Development Supabase.
- The VS live env file points to Release Supabase.
- A same-project schema split is not recommended because auth and storage are project-level concerns.
- Release Supabase remains protected.
- Development Supabase remains the safe work/test area.

## Visibility Rule

Development env can expose development/demo/internal routes for testing. Release env enables only approved `release` routes and hides debug/demo/environment/page-status badges from normal users.

## P0/P1/P2 Priority

- P0: local seed/reset/migration points at Release Supabase; live env enables login bypass; release route guard bypass.
- P1: missing route registry entry; development page appears in live navigation/search.
- P2: missing deployment notes, advanced CI automation, extra smoke scenarios.

## Suggested Next Prompt

VS env dosyasini Live Supabase degerleriyle doldur ve `scripts/deploy-main-vps.sh` ile ilk canli deploy provasini calistir.
