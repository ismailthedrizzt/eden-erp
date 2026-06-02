# Page Release Registry

## Purpose

`lib/release/routeReleaseRegistry.ts` is the source of truth for which pages are visible in Development and Release.

## Status Values

| status | Development | Release | notes |
|---|---:|---:|---|
| `release` | visible | visible | approved release surface |
| `development` | visible | hidden | field test and active development |
| `development_demo` | visible | hidden | demo/test pages |
| `development_internal` | visible | hidden | admin, audit, integration, portal and operational pages |
| `coming_soon` | visible/passive | passive optional | no CRUD or mutation |
| `hidden` | hidden | hidden | aliases and internal redirects |
| `broken_do_not_show` | blocked | blocked | never normal-user visible |

## Integration

- Sidebar uses the registry before module readiness and permission checks.
- Command palette/search results are filtered by the registry.
- Middleware blocks direct route access when a route is not enabled for the current environment.
- Release hides environment, demo, version and page status badges.
- Development can show environment and release status badges.

## Commands

```bash
npm run release:check
```

## P0/P1/P2 Priority

- P0: Development/internal/demo route visible in Release.
- P1: New page route missing from registry.
- P2: Missing explanatory notes for future promotion review.

## Suggested Next Prompt

Run a release environment browser smoke and verify sidebar/search/direct URL behavior.
