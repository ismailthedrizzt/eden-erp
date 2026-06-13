# Route Navigation Cleanup Report

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Release Registry
- Final release registry check: 146 registry routes and 146 page routes.
- Release check passed.
- Hidden legacy routes are not allowed to show in navigation/search/command palette by `scripts/check-release-registry.js`.

## Alias Result
Legacy public aliases remain hidden; development aliases remain non-release. No alias route was deleted in this sprint.

## P0/P1/P2
- P0: none; no release-visible legacy alias was found.
- P1: direct hidden route smoke should be included in manual field test.
- P2: old wrappers can be deleted after telemetry/caller audit.
