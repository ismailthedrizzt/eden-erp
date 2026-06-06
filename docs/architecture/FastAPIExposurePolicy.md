# FastAPI Exposure Policy

Date: 2026-06-06

## Decision

Eden ERP MVP’de FastAPI business API public browser API değildir. FastAPI, Next BFF veya reverse proxy trusted internal path üzerinden çağrılır.

## Option A: Internal FastAPI

This is the default policy.

- Public browser traffic reaches Next.js.
- Next.js owns login, OTP and `eden_app_session`.
- Next BFF proxies business requests to FastAPI.
- FastAPI accepts trusted proxy context only with `TRUSTED_PROXY_SECRET`.
- Reverse proxy/firewall should limit direct FastAPI access to internal paths.
- Browser must not call FastAPI business endpoints directly.

## Option B: Public FastAPI

This is not the MVP default and requires an explicit future task.

- FastAPI must verify its own direct JWT or API token.
- Trusted proxy headers must not be accepted from public requests.
- CORS must be strict and origin-specific.
- Rate limiting must be enabled.
- Public documentation must distinguish direct API auth from app-session browser auth.
- Permission, tenant and scope checks must still resolve from DB.

## Required Controls

| Control | MVP Status |
| --- | --- |
| Public traffic entry | Next.js/reverse proxy |
| Browser auth | `eden_app_session` |
| Backend auth | trusted proxy secret + DB context |
| Direct FastAPI browser access | Not canonical |
| Supabase Auth | Legacy only |
| Release bypass | Forbidden by env safety |

## P0/P1/P2

- P0: FastAPI business endpoints are publicly exposed and accept `x-user-id`/`x-tenant-id` without `x-proxy-secret`.
- P0: Release runs with `AUTH_REQUIRED=false`.
- P1: Reverse proxy policy is undocumented or not enforced outside the app.
- P2: Public API token policy is not designed yet.
