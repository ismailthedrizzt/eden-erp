# Runtime Smoke Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

Updated 2026-06-06: Current runtime smoke is remote server + local PostgreSQL/local DB. Historical Vercel references are deprecated; use `db:target:check`, `env:safety`, PM2/process health and document storage smoke.

## Purpose

Development and Release runtime behavior is checked after deploy and before promotion.

## Development Smoke

| check | expected |
|---|---|
| Open Development URL | app loads |
| Login | App-session login works |
| Sidebar | release + development surfaces visible |
| Environment badge | visible |
| Release status badge | visible on non-release surfaces |
| Command palette | development/demo/internal routes can appear |
| Direct development route | opens |
| Direct hidden/broken route | blocked |
| Demo route | opens if enabled |
| Demo seed dry run | does not target Release |
| DB target | Development/local DB target |

## Release Smoke

| check | expected |
|---|---|
| Open Release URL | app loads |
| Login | App-session login works |
| Sidebar | only release pages visible |
| Environment badge | hidden |
| Release status badge | hidden |
| Debug/version badge | hidden for normal users |
| Command palette | no development/demo/internal routes |
| Direct development route | blocked/passive state |
| Direct demo/test route | blocked |
| Portal/admin/audit/integration/AI/automation | hidden from normal users |
| Demo seed | fails |
| Reset | fails |
| Env safety | passes |

## Required Commands

```bash
npm run typecheck
npm run build
npm run release:check
npm run env:safety
npm run db:target:check
npm run migration:status
npm run boundaries:check
npm run openapi:drift
```

## Findings

Runtime smoke must verify both navigation filtering and direct URL blocking.

## Risks

- A route can be hidden in navigation but still accessible directly if middleware is bypassed.
- Search/command palette can leak route availability if not filtered.

## Recommended Fixes

- Run manual route attempts for sensitive pages in Release.
- Add automated browser smoke after remote server app/API URLs and process health checks are finalized.

## P0/P1/P2 Priority

- P0: Sensitive route accessible in Release by direct URL.
- P1: Search/command palette exposes Development route in Release.
- P2: Manual checklist not automated.

## Suggested Next Prompt

Development ve Release URL'leri verildikten sonra browser smoke testi yap.
