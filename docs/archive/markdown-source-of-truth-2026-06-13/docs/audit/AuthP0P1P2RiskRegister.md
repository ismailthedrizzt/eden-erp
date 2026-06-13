# Auth P0/P1/P2 Risk Register

Date: 2026-06-06

| Priority | Risk | Evidence | Status | Next Action |
| --- | --- | --- | --- | --- |
| P0 | Release auth disabled with `AUTH_REQUIRED=false`. | `lib/env/releaseSafety.ts`, `scripts/check-release-env-safety.js`, `backend/app/core/security.py`. | Guarded. | Keep negative test in release checklist. |
| P0 | Release session signs with fallback setup/OTP secret. | `lib/auth/appSession.ts`; release safety now requires `APP_SESSION_SECRET`. | Guarded; server env fixed. | Rotate and document app session secret per deployment. |
| P0 | Legacy Supabase JWT accepted in release. | `backend/app/core/security.py`. | Guarded. | Remove legacy verifier after direct API policy lands. |
| P0 | Untrusted public request spoofs tenant/user headers. | `backend/app/core/security.py`, `lib/backend/fastApiProxy.ts`. | Guarded in app. | Verify reverse proxy does not expose FastAPI publicly. |
| P1 | Header permission fallback remains for trusted proxy. | `backend/app/core/security.py`. | Controlled fallback. | Move to DB-only permission source for all release paths. |
| P1 | Direct FastAPI external auth policy not implemented. | `docs/architecture/FastAPIExposurePolicy.md`. | Deferred. | Create explicit API-token/JWT policy before public exposure. |
| P2 | Historical Supabase docs remain. | Older audit docs. | Accepted. | Update only canonical operator docs. |
