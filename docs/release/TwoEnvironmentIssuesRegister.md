# Two Environment Issues Register

Deprecated historical register, updated 2026-06-06: This document contains old Vercel/Supabase-era issues. Current risks are tracked in `docs/audit/DeploymentP0P1P2RiskRegister.md`.

## Metadata

| Field | Value |
| --- | --- |
| Test date | 2026-05-31 |
| Workspace | `C:\Users\ismai\Desktop\eden-erp-development` |
| Branch | `develop` |
| Vercel URL | Local simulations only: development `http://127.0.0.1:3100`, release `http://127.0.0.1:3101` |
| Supabase project | Dummy masked refs `dev-ref` and `release-ref`; real projects not read |

## Issues

| ID | Environment | Issue | Module/Page | Severity | Expected | Actual | Likely cause | Recommended fix | Fixed in this phase? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TE-001 | both | Production build and full app typecheck hang. | `npm run build`, `npm run typecheck:app` | P0 | Build/typecheck complete or fail with actionable diagnostics. | Build timed out twice; `typecheck:app` timed out after 4 minutes; diagnostics showed build stuck at `type-checking`. | Full app TypeScript graph or Next type-check plugin is too heavy/hung. | Isolate `tsconfig.app.json` graph, inspect large generated/client files, and profile `tsc -p tsconfig.app.json`. | no |
| TE-002 | release | `coming_soon` routes visible on release discovery surfaces. | `lib/release/releaseVisibility.ts` | P1 | Release navigation/search/command palette show only `release` status routes. | Runtime matrix initially showed release counts containing `coming_soon`. | `coming_soon` branch ran before release surface filtering. | Hide `coming_soon` in release except direct route unavailable handling. | yes |
| TE-003 | release | Direct blocked routes redirected to login instead of showing unavailable state. | `middleware.ts`, `/release-not-available` | P1 | Direct non-release route shows simple unavailable/coming soon state. | `/app/sistem` initially became `/login?from=...&reason=not_promoted`. | Rewritten `/release-not-available` route was not public, so auth redirected it. | Add `/release-not-available` to public middleware surface. | yes |
| TE-004 | development | Browser visual smoke could not run. | Browser plugin / node_repl | P2 | Local browser opens and verifies rendered pages. | Browser runtime failed with kernel asset path error. | Local tool runtime path issue outside repo. | Retry after Browser plugin/node_repl asset path is repaired. | no |
| TE-005 | both | Optional boundary/migration checks report existing warnings. | API migration inventory and import boundaries | P1 | No runtime-risk boundary or temporary fallback warnings. | `migration:status` reports 75 temporary fallback routes; `boundaries:check` reports 69 warnings, 0 critical. | Existing backend migration transition debt. | Track separately from two-env guard; reduce temp fallbacks after FastAPI Development verification. | no |
| TE-006 | both | LF/CRLF warnings during targeted typecheck. | Git working copy metadata | P2 | No line-ending churn warnings. | Git warned several touched files will be converted LF to CRLF. | Windows working tree line-ending settings. | Normalize `.gitattributes` or accept as local metadata warning. | no |
| TE-007 | release | Live Vercel project settings not automatically verified. | Vercel projects | P2 | Development and Release Vercel envs checked against dashboard/deployment. | Only local simulations and manual checklist were possible. | No live Vercel project data available in this run. | Complete `VercelDeploymentVerificationReport.md` checklist after connector/dashboard access. | no |
