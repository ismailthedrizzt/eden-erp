# Runtime Visibility

Date: 2026-06-06

## Principles

- Release surface is not build surface.
- Next.js may build development/internal routes that are not visible to release users.
- `lib/release/routeReleaseRegistry.ts` is the release surface contract.
- `npm run release:check` must pass before deployment.
- Hidden/broken/internal routes must remain blocked even if directly requested.

## Current Audit Status

The release registry currently passes with 140 registry routes and 140 page routes.
