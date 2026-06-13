# Simplification P0/P1/P2 Risk Register

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

| id | risk | module/area | severity | evidence | impact | required action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P1-001 | 162 official boundary warnings remain | Next/FastAPI boundary | P1 | boundaries:check PASS_WITH_WARNINGS | architecture debt before RC | Sprint C boundary burn-down | open |
| SIM-P1-002 | 99 API routes missing migration headers | Next API routes | P1 | migration:status | route ownership ambiguity | classify and add headers | open |
| SIM-P1-003 | dedicated worker process absent | Workers | P1 | PM2 only eden-app and eden-fastapi | async outbox delay | start outbox worker or document non-dependency | open |
| SIM-P1-004 | outbox pending 4, oldest 2026-05-25 | Outbox | P1 | outbox query | notifications/events may lag | worker + retry/DLQ visibility | open |
| SIM-P1-005 | standard backup path missing | Ops backup | P1 | /opt/eden-erp/backups missing | ops inconsistency | create standard path/ownership | open |
| SIM-P1-006 | authenticated tenant/scope/media tests absent | Security | P1 | only public negative smoke done | P0 could still be found in manual test | run security negative test plan | open |
| SIM-P2-001 | legacy/Supabase/Vercel docs residue | Docs/scripts | P2/P1 | 415 Supabase/Vercel-related hits; 375 docs residue hits | developer confusion | Sprint D/G cleanup | open |
| SIM-P2-002 | alias route family remains | Routing/navigation | P2/P1 if visible | 43 alias candidates | duplicate UX surface | visibility/telemetry audit then cleanup | open |
