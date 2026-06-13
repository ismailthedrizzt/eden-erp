# Remote Server P0 P1 P2 Risk Register

## Changed Files

- `docs/audit/RemoteServerP0P1P2RiskRegister.md`
- Related code files listed in `RemoteServerLocalDbAlignmentReport.md`

## Why Changed

Risk tracking now reflects remote server/local DB deployment instead of Vercel/Supabase separation.

## Risks

| ID | Severity | Area | Risk | Mitigation |
|---|---|---|---|---|
| RS-P0-001 | P0 | Auth | Supabase fallback required for middleware | Removed fallback; app-session canonical |
| RS-P0-002 | P0 | DB | Release seed/reset | `check-database-target.js` blocks |
| RS-P0-003 | P0 | Env | Missing session/proxy secrets | release safety guard |
| RS-P1-001 | P1 | Storage | Media cached or public | API NetworkOnly and local media docs |
| RS-P1-002 | P1 | Legacy | Supabase imports remain | deprecated inventory |
| RS-P2-001 | P2 | Docs | Old docs confuse operators | deprecated headers |

## Field Test Impact

Manual field test may proceed with listed P1 limitations.

## Remaining Risks

Backend dependency availability should be verified before declaring full release readiness.
