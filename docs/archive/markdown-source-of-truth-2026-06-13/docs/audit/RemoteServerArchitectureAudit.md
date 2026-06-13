# Remote Server Architecture Audit

Date: 2026-06-06
Branch: `main`
Commit: `09e90b5588a43af147d75b2926d5368a6f4635b9`
Environment: remote server release runtime

## Tested Commands

| Command | Result |
| --- | --- |
| `npm run env:safety` | PASS |
| `npm run db:target:check` | PASS |
| `npm run migration:status` | PASS with 99 non-P0 missing headers |
| `pm2 status` | `eden-app` and `eden-fastapi` online |

## Canonical Reality

- Next.js is UI/BFF/proxy.
- FastAPI is canonical backend.
- PostgreSQL on the server is canonical DB.
- Local filesystem document storage is canonical file storage.
- Workers exist as Python modules; live PM2 worker process was not confirmed.
- Release registry controls visible routes.
- App session + trusted proxy is canonical auth path.

## ERP Principle Alignment

| Principle | Status | Evidence | Risk | Fix |
| --- | --- | --- | --- | --- |
| Kart baska, lifecycle islem baska | partial | Company/partner/representative flows use lifecycle wizards, but not all modules are standardized. | Inconsistent UX and mutation paths. | Continue template consolidation. |
| `Ekle` = taslak | partial | Several official records use draft/lifecycle; some modules still have direct create semantics. | Official state can be implied too early. | Enforce via entity contracts. |
| Official/legal/financial change via wizard | partial | Company official changes use wizards; accounting/contract surfaces still need standardization. | Critical mutation can bypass lifecycle. | Add operation guards. |
| Document central but contextual upload | compliant | Document slot upload plus central document_files dedup. | Some legacy Supabase thumbnail utilities remain. | Remove legacy storage utilities. |
| Action Center business center | partial | Action Center exists; technical event separation still needs audit. | Users can see noisy action items. | Define action taxonomy. |
| FastAPI canonical backend | partial | BFF boundary check passes for app/api; TS backend-core warnings remain. | Split-brain logic. | Remove TS runtime backend remnants. |
| Next BFF/proxy | compliant | 486 FastAPI proxy route files, 0 proxy-only boundary violations. | Route comments still mention Supabase. | Wording cleanup. |
| Release surface != build surface | compliant | Route release registry passes; build includes more routes than release surface. | Wrong route promotion if registry not maintained. | Keep release check mandatory. |
| Local DB protected asset | compliant | DB target guard passed against `localhost:5432/app1db`. | Seed/reset still dangerous if guard bypassed manually. | Keep guard mandatory. |

## ERP Comparison

| Area | Odoo | ERPNext | SAP/Dynamics | NetSuite/cloud ERP | Eden ERP current baseline |
| --- | --- | --- | --- | --- | --- |
| Modularity | Strong apps/modules | Strong doctype/modules | Very strong enterprise modules | Strong suite modules | Strong registry direction, module cleanup still open |
| Lifecycle control | Workflow capable | Workflow capable | Mature approval/change control | Mature workflow/approval | Good principle; uneven implementation |
| Audit | Available | Available | Enterprise-grade | Enterprise-grade | Audit exists; coverage still being standardized |
| Document management | Attachments/docs | File attachments | Mature DMS integration | Suite documents | Good contextual upload + central dedup |
| Permission/scope | Mature ACL | Role permissions | Enterprise IAM/scope | Role/permission model | Good direction; TS remnants remain |
| Workflow/action center | Activities/workflows | Assignments/workflows | Mature workflow inbox | Suite approvals | Action Center exists; needs business taxonomy |
| Deployment maturity | Self-host/cloud options | Self-host/cloud options | Enterprise-managed | Cloud-managed | Remote PM2 works; reverse proxy/worker ops docs incomplete |
| Extensibility | High | High | High but heavy | SuiteScript/platform | High potential via FastAPI/Next registries |

## Strengths

- Strong domain separation intent.
- FastAPI + OpenAPI contract gives a measurable backend target.
- Release registry is a useful live-surface control.
- Local document storage now has tenant-scoped paths and controlled media route.
- DB target guard is already active.

## Gaps

- Backend tests/lint/type are not green.
- Worker/reverse proxy operational topology is not fully documented in repo.
- Supabase/Vercel residue remains in code and docs.
- Some ERP lifecycle patterns are not yet universal.

## Risks

| Priority | Risk |
| --- | --- |
| P1 | TS backend remnants can revive non-canonical behavior. |
| P1 | Worker process not confirmed in live PM2. |
| P1 | Reverse proxy/SSL config outside repo reduces auditability. |
| P2 | Old docs/comments can confuse future work. |

## Decision

`READY_WITH_LIMITATIONS`
