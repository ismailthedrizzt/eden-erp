# Auth Architecture Audit

Date: 2026-06-06
Branch: `main`
Commit: `09e90b5588a43af147d75b2926d5368a6f4635b9`

## Current Auth Model

| Question | Answer |
| --- | --- |
| Canonical auth app session mi? | Yes. `eden_app_session` is created/verified by `lib/auth/appSession.ts` and checked in `middleware.ts`. |
| Supabase fallback var mi? | Middleware does not fall back to Supabase. If `EDEN_ENABLE_LEGACY_SUPABASE_AUTH=true`, it returns a disabled error. Backend still retains legacy Supabase JWT verification for direct bearer compatibility. |
| FastAPI trusted proxy context nasil tasiniyor? | `lib/backend/fastApiProxy.ts` forwards `x-tenant-id`, `x-user-id`, optional scope/permissions, request ids and `x-proxy-secret`. |
| Direct FastAPI public exposure guvenli mi? | Direct bearer auth exists but still maps to legacy Supabase JWT verifier. Canonical path remains Next BFF. |
| Release ortaminda auth bypass mumkun mu? | `env:safety` passed; `EDEN_LOGIN_DISABLED` is blocked by release safety. |
| `TRUSTED_PROXY_SECRET` zorunlu mu? | FastAPI validates production trusted proxy use requires a secret. |
| Supabase JWT hala gerekli mi? | Not for canonical app-session/trusted-proxy flow; only for legacy/direct bearer compatibility. |

## P0 Checks

| P0 condition | Baseline |
| --- | --- |
| Supabase env yokken middleware crash | Not confirmed. Middleware no longer creates Supabase client. |
| Auth olmadan protected route acilmasi | Not confirmed. Middleware redirects/401s without app session. |
| Trusted proxy secret olmadan release'te proxy headers kabul edilmesi | Not confirmed. FastAPI production validation requires secret. |

## Risks

| Priority | Risk | Fix |
| --- | --- | --- |
| P1 | Direct FastAPI bearer auth still depends on legacy Supabase verifier. | Define app-issued direct API token strategy or remove compatibility. |
| P1 | Trusted proxy headers are powerful. | Keep secret rotation and production validation strict. |
| P1 | Legacy TS auth/user-state Supabase modules remain. | Migrate or delete after import audit. |
| P2 | Old auth docs mention Supabase as canonical. | Rewrite docs. |

## Decision

`READY_WITH_LIMITATIONS`
