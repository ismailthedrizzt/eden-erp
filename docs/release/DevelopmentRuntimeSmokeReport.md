# Development Runtime Smoke Report

## Metadata

| Field | Value |
| --- | --- |
| Test date | 2026-05-31 |
| Workspace | `C:\Users\ismai\Desktop\eden-erp-development` |
| Branch | `develop` |
| Vercel URL | Not available to this local run; local simulation used `http://127.0.0.1:3100` |
| Supabase project | Local simulation used masked dummy Development target `dev-ref`; real project secrets were not read |
| Result | Partial pass; blocked by P0 build/full-app typecheck hang |

## Env Summary

No secrets were printed or persisted.

| Variable | Development value used |
| --- | --- |
| `NEXT_PUBLIC_APP_ENV` | `development` for functional checks; local dev server also resolved as development via `NEXT_PUBLIC_RELEASE_CHANNEL=development` |
| `NEXT_PUBLIC_RELEASE_CHANNEL` | `development` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` |
| `EDEN_LOGIN_DISABLED` | `true` only for local page smoke |
| `NEXT_PUBLIC_SUPABASE_URL` | masked dummy `https://dev-ref.supabase.co` |
| `DEVELOPMENT_SUPABASE_PROJECT_REF` | `dev-ref` in target check simulation |

## Code Precheck

| Check | Result | Notes | Priority |
| --- | --- | --- | --- |
| Two-environment files present | Pass | `lib/release/*`, `lib/env/releaseSafety.ts`, release components, guard scripts, and policy docs exist. | - |
| `package.json` scripts | Pass | `release:check`, `env:safety`, and `supabase:target:check` exist. | - |
| Release/development model | Pass after fix | Development permits release/development/internal/demo/direct surfaces; Release discovery surfaces now show only `release`. | - |
| `staging` term | Pass with note | Only intentional policy text says staging is not used; no runtime code hit found. | P2 |
| Navigation/sidebar visibility | Pass | Sidebar uses `getRouteReleaseDecision(..., 'navigation')`. | - |
| App layout navigation visibility | Pass | Top-level app layout filters items with `canShowRouteInNavigation`. | - |
| Search/command palette visibility | Pass | Command palette and action guide filter through release visibility. | - |
| Direct route guard | Pass after fix | Middleware rewrites blocked direct routes to public unavailable state. | - |

## Command Results

| Command | Result | Error summary | Likely cause | Fixed? | Priority |
| --- | --- | --- | --- | --- | --- |
| `npm run typecheck` | Pass | Targeted check passed; LF/CRLF warnings only. | Existing Windows line-ending metadata. | No | P2 |
| `npm run build` | Fail / timeout | Timed out twice, including one 10 minute run. `.next/diagnostics/build-diagnostics.json` stopped at `type-checking`. | Full app TypeScript/Next type-check graph hangs. | No | P0 |
| `npm run typecheck:app` | Fail / timeout | `tsc --noEmit -p tsconfig.app.json` timed out after 4 minutes and kept running until stopped. | Same full app TypeScript graph issue as build. | No | P0 |
| `npm run release:check` | Pass | 139 registry routes, 139 page routes. | Script strengthened in this phase. | Yes | - |
| `npm run env:safety` | Pass | Env resolved as development. | No unsafe release env values. | - | - |
| `npm run supabase:target:check` | Pass | Env resolved as development; project ref unknown in default shell. | No configured real Supabase refs in shell. | - | - |
| `npm run migration:status` | Pass with warnings | 205 missing migration headers, 75 temporary fallback routes, P0 missing headers 0. | Existing migration inventory debt. | No | P1/P2 |
| `npm run boundaries:check` | Pass with warnings | 69 warnings, 0 critical errors. | Existing frontend/backend boundary debt and temp fallbacks. | No | P1 |
| `npm run openapi:drift` | Pass | OpenAPI export/generate completed; `git diff --exit-code` passed for generated outputs. | No drift found. | - | - |

## Development Env Simulation

| Check | Result | Evidence | Priority |
| --- | --- | --- | --- |
| `getCurrentReleaseEnvironment()` returns development | Pass | Jiti runtime check returned `development`. | - |
| `isDevelopmentEnvironment()` true | Pass | Jiti runtime check returned `true`. | - |
| `isReleaseEnvironment()` false | Pass | Inferred from release resolver for development env. | - |
| Environment badge visible | Pass | Component hides only when env is `release`; runtime env was development. | - |
| Release status badges visible for development routes | Pass | `getReleaseBadgeLabel('development', 'development')` returned `development`. | - |
| Navigation can include release/development/internal/coming soon | Pass | Development navigation counts: release 14, development 65, development_internal 34, coming_soon 2. | - |
| Hidden routes absent from normal navigation | Pass | `/muhasebe`, `/ik/personel`, and legacy aliases returned hidden/disabled. | - |
| `broken_do_not_show` absent | Pass | Registry currently has 0 `broken_do_not_show` entries. | - |
| Search/command palette can show development routes | Pass | Development search and command counts include development/internal routes. | - |
| Direct development routes open | Pass | Development direct decisions for requested routes were visible/enabled. | - |
| Demo routes in development | Pass | Direct demo routes `/app/demo/document-slot-uploader` and `/test` were visible/enabled; they remain intentionally hidden from nav/search by registry flags. | - |
| Development Supabase target check | Pass | Simulated `dev-ref` target with `COMMAND_CONTEXT=seed` passed. | - |

## Development Page Smoke

Local development server: `http://127.0.0.1:3100`.

Browser plugin verification could not be used because the `node_repl` browser runtime failed with a local kernel asset path error. HTTP smoke was used instead.

| Route | Result | Notes |
| --- | --- | --- |
| `/app` | Pass | HTTP 200 |
| `/app/sirket/companies` | Pass | HTTP 200 |
| `/app/sirket/companies/branches` | Pass | HTTP 200 |
| `/app/sirket/companies/partners` | Pass | HTTP 200 |
| `/app/sirket/companies/representatives` | Pass | HTTP 200 |
| `/app/sirket/tesisler` | Pass | HTTP 200 |
| `/app/sirket/teskilat` | Pass | HTTP 200 |
| `/app/muhasebe/cari-kartlar` | Pass | HTTP 200 |
| `/app/muhasebe/cari-hareketler` | Pass | HTTP 200 |
| `/app/ik/calisanlar` | Pass | HTTP 200 |
| `/app/belgeler` | Pass after retry | First request timed out during Next dev compile; retry returned HTTP 200. |
| `/app/surecler` | Pass | HTTP 200 |
| `/app/sistem` | Pass | HTTP 200 |
| `/app/sistem/moduller` | Pass | HTTP 200 |
| `/app/sistem/saglik` | Pass | HTTP 200 |
| `/app/crm/paydaslar` | Pass | HTTP 200 |
| `/app/gorev-ve-proje-yonetimi` | Pass | HTTP 200 |
| `/app/satis-sonrasi` | Pass after retry | First request timed out during Next dev compile; retry returned HTTP 200. |
| `/portal/dashboard` | Pass | HTTP 200 |

## Issues Found

| ID | Issue | Priority | Fixed? | Recommended fix |
| --- | --- | --- | --- | --- |
| TE-001 | `npm run build` and `npm run typecheck:app` hang in full app type checking. | P0 | No | Isolate the heavy TS graph in `tsconfig.app.json`; inspect generated/client-heavy files and Next plugin type-check behavior. |
| TE-002 | Release discovery surfaces initially exposed `coming_soon` routes as visible/disabled. | P1 | Yes | Hide `coming_soon` from release navigation/search/command surfaces; keep direct route disabled for unavailable state. |
| TE-003 | Release blocked direct routes initially rewrote to unavailable, then redirected to login because `/release-not-available` was not public. | P1 | Yes | Mark `/release-not-available` public in middleware. |
| TE-004 | Browser visual smoke could not run due local Browser plugin runtime failure. | P2 | No | Retry Browser plugin after node_repl kernel asset path is repaired; HTTP smoke covered route availability meanwhile. |

