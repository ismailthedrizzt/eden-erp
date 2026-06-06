# Release Guard Verification Report

Deprecated historical report, updated 2026-06-06: This document records old Supabase-target release guard simulations. The active guard is `db:target:check` against local PostgreSQL/local DB plus `env:safety`.

## Metadata

| Field | Value |
| --- | --- |
| Test date | 2026-05-31 |
| Workspace | `C:\Users\ismai\Desktop\eden-erp-development` |
| Branch | `develop` |
| Vercel URL | Not available; local release simulation used `http://127.0.0.1:3101` |
| Supabase project | Masked dummy Release target `release-ref` |
| Result | Pass after two guard fixes |

## Env Summary

Release safety tests used dummy masked Supabase values:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_ENV` | `release` unless otherwise noted |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://release-project.supabase.co` or intentional development-pattern URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dummy `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | dummy `service` |

## Negative Env Safety Tests

Expected failure means the guard worked.

| Test | Command env delta | Expected | Actual | Result | Priority |
| --- | --- | --- | --- | --- | --- |
| Release login bypass | `EDEN_LOGIN_DISABLED=true` | Fail | Failed with forbidden login bypass | Pass | P0 |
| Release legacy API | `EDEN_ALLOW_LEGACY_API_ACCESS=true` | Fail | Failed with forbidden legacy API access | Pass | P0 |
| Release demo mode | `NEXT_PUBLIC_DEMO_MODE=true` | Fail | Failed with forbidden demo mode | Pass | P0 |
| Public internal token | `NEXT_PUBLIC_INTERNAL_BACKEND_TOKEN=abc` in development | Fail or critical warning | Failed as public secret exposure | Pass | P0 |
| Release points to development Supabase | `NEXT_PUBLIC_SUPABASE_URL=https://development-project.supabase.co` | Fail or critical warning | Failed as development Supabase URL | Pass | P0 |

## Direct Route Guard Tests

| Check | Expected | Actual | Result | Fixed? |
| --- | --- | --- | --- | --- |
| Release direct development route `/app/sistem` | Simple unavailable state | Initially redirected to `/login?from=...&reason=not_promoted`; after fix HTTP 200 unavailable marker | Pass | Yes |
| Release direct portal route `/portal/dashboard` | Simple unavailable state | HTTP 200 unavailable marker | Pass | Yes |
| Release direct demo route `/app/demo/document-slot-uploader` | Simple unavailable state | HTTP 200 unavailable marker | Pass | Yes |
| Release direct legacy route `/muhasebe/cari-kartlar` | Simple unavailable state | HTTP 200 unavailable marker | Pass | Yes |
| Release direct coming soon route `/app/ik/personel-ekle` | Simple unavailable / coming soon state | HTTP 200 unavailable marker | Pass | Yes |

## Guard Changes Made

| File | Change | Reason |
| --- | --- | --- |
| `lib/release/releaseVisibility.ts` | Hide `coming_soon` routes from release navigation/search/command surfaces while keeping direct routes disabled. | Release must show only `release` status routes on discovery surfaces. |
| `middleware.ts` | Treat `/release-not-available` as public. | Blocked direct routes must show the simple unavailable state instead of becoming auth redirects. |
| `scripts/check-release-registry.js` | Added static assertions for surface flags, direct middleware guard, public unavailable page, and visibility contract files. | Prevent regressions in release guard behavior. |
