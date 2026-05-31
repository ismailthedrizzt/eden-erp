# Release Runtime Smoke Report

## Metadata

| Field | Value |
| --- | --- |
| Test date | 2026-05-31 |
| Workspace | `C:\Users\ismai\Desktop\eden-erp-development` |
| Branch | `develop` |
| Vercel URL | Not available to this local run; local release simulation used `http://127.0.0.1:3101` |
| Supabase project | Local simulation used masked dummy Release target `release-ref`; real project secrets were not read |
| Result | Release guard pass after fixes; overall promotion still blocked by P0 build/full-app typecheck hang |

## Env Summary

No secrets were printed or persisted.

| Variable | Release value used |
| --- | --- |
| `NEXT_PUBLIC_APP_ENV` | `release` |
| `NEXT_PUBLIC_RELEASE_CHANNEL` | `release` |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |
| `EDEN_LOGIN_DISABLED` | `false` |
| `EDEN_ALLOW_LEGACY_API_ACCESS` | `false` |
| `ALLOW_RELEASE_DB_SEED` | `false` |
| `ALLOW_RELEASE_DB_RESET` | `false` |
| `NEXT_PUBLIC_SUPABASE_URL` | masked dummy `https://release-ref.supabase.co` |

## Release Visibility Simulation

| Check | Result | Evidence | Priority |
| --- | --- | --- | --- |
| `getCurrentReleaseEnvironment()` returns release | Pass | Jiti runtime check returned `release`. | - |
| `isReleaseEnvironment()` true | Pass | Jiti runtime check returned `true`. | - |
| Environment badge hidden | Pass | Component returns `null` in release. | - |
| Release status badge hidden | Pass | `getReleaseBadgeLabel('development', 'release')` returned `null`. | - |
| Navigation only release routes | Pass after fix | Release navigation count: release 14 only. | - |
| Search only release routes | Pass after fix | Release search count: release 14 only. | - |
| Command palette only release routes | Pass after fix | Release command palette count: release 14 only. | - |
| Development routes hidden | Pass | `/app/sistem` and `/portal/dashboard` returned hidden/disabled with `not_promoted`. | - |
| Demo/test/legacy hidden | Pass | Demo and legacy routes hidden/disabled on release discovery surfaces. | - |
| Coming soon hidden from discovery | Pass after fix | Coming soon routes hidden on release navigation; direct routes remain disabled. | - |
| Direct development route unavailable | Pass after fix | `/app/sistem` returned HTTP 200 unavailable state instead of login redirect. | - |

## Release Page Smoke

Local release simulation server: `http://127.0.0.1:3101`.

Because this was a local `next dev` simulation, raw HTML contains framework development markers and is not authoritative for the literal absence of words such as `development`. Visibility was verified through release visibility functions and rendered unavailable markers over HTTP.

Allowed release routes without auth correctly reached the auth gate where applicable:

| Route | Result | Notes |
| --- | --- | --- |
| `/login` | Pass | HTTP 200 |
| `/offline` | Pass | HTTP 200 |
| `/app` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/sirket/companies` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/sirket/companies/branches` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/sirket/companies/partners` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/sirket/companies/representatives` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/sirket/tesisler` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/sirket/teskilat` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/muhasebe/cari-kartlar` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/muhasebe/cari-hareketler` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/muhasebe/on-muhasebe-hareketleri` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/muhasebe/banka-hesaplari-ve-kartlari` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/muhasebe/banka-kart-hareketleri` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/muhasebe/hesap-ve-kart-hareketleri` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |
| `/app/ik/calisanlar` | Pass | HTTP 307 to login because auth is required; release guard allowed route. |

Blocked release routes returned the simple unavailable state:

| Route | Result | Notes |
| --- | --- | --- |
| `/app/sistem` | Pass after fix | HTTP 200 unavailable marker |
| `/app/belgeler` | Pass after fix | HTTP 200 unavailable marker |
| `/app/surecler` | Pass after fix | HTTP 200 unavailable marker |
| `/app/crm/paydaslar` | Pass after fix | HTTP 200 unavailable marker |
| `/app/gorev-ve-proje-yonetimi` | Pass after fix | HTTP 200 unavailable marker |
| `/app/satis-sonrasi` | Pass after fix | HTTP 200 unavailable marker |
| `/portal/dashboard` | Pass after fix | HTTP 200 unavailable marker |
| `/app/demo/document-slot-uploader` | Pass after fix | HTTP 200 unavailable marker |
| `/test` | Pass after fix | HTTP 200 unavailable marker |
| `/muhasebe/cari-kartlar` | Pass after fix | HTTP 200 unavailable marker |
| `/ik/personel` | Pass after fix | HTTP 200 unavailable marker |
| `/app/ik/personel-ekle` | Pass after fix | HTTP 200 unavailable marker |

## Issues Found

| ID | Issue | Priority | Fixed? | Recommended fix |
| --- | --- | --- | --- | --- |
| TE-001 | Production build still cannot complete because full app type checking hangs. | P0 | No | Unblock `tsconfig.app.json` / Next build type checking before live candidate smoke. |
| TE-002 | `coming_soon` was visible on release discovery surfaces. | P1 | Yes | Fixed in `lib/release/releaseVisibility.ts`; enforced by `release:check`. |
| TE-003 | Blocked direct routes redirected to login instead of unavailable state for unauthenticated users. | P1 | Yes | Fixed in `middleware.ts`; enforced by `release:check`. |

