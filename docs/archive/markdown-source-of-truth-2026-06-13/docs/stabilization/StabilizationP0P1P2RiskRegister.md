# Stabilization P0/P1/P2 Risk Register

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: a5d871d release_candidate_gate_decision
- Ortam: uzak sunucu, local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF
- Sprint kararı: READY_WITH_LIMITATIONS_FOR_MANUAL_FIELD_TEST

| ID | Source report | Risk | Area | Severity | Evidence | Impact | Required action | Owner | Status | Retest step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STAB-001 | BackendQualityGateFixReport | E501 per-file ignore borcu | Backend quality | P2 | Ruff PASS with scoped ignores | Formatting consistency | Separate no-behavior formatting cleanup | Engineering | Open | ruff check after cleanup |
| STAB-002 | BoundaryWarningBurnDownReport | 162 boundary warning | Next/FastAPI boundary | P1 | boundaries critical 0, warnings 162 | Architectural debt | Shared contract/client helper burn-down | Engineering | Open | npm run boundaries:check |
| STAB-003 | BackupAndRestoreProofReport | `/opt` backup dir not writable | Ops backup | P1 | Fallback backup dir used | Release ops standardization | Create protected backup dir and ownership | Ops | Open | pg_dump to standard path |
| STAB-004 | WorkerHeartbeatAndBacklogReport | Dedicated worker not running | Workers/outbox | P1 | PM2 only app + fastapi; outbox pending 4 | Async event delay | Start outbox worker or document field-test limitation | Ops/Backend | Open | worker process + backlog check |
| STAB-005 | WorkerHeartbeatAndBacklogReport | Heartbeat/DLQ visibility missing | Workers | P1 | No heartbeat proof | Operational blind spot | Add heartbeat/readiness endpoint or query | Backend | Open | heartbeat smoke |
| STAB-006 | PublicReverseProxySmokeReport | HSTS missing | Reverse proxy/SSL | P1 | PUBLIC_HSTS:no | Browser transport hardening gap | Add HSTS at reverse proxy | Ops | Open | curl HTTPS headers |
| STAB-007 | SecurityNegativeSmokeReport | Authenticated scope negative tests not run | Security | P1 | Unauthenticated/proxy spoof smoke passed only | Scope leak risk not fully proven | Manual field test with real user/scope | QA/Engineering | Open | tenant/company/branch negative tests |
| STAB-008 | ManualFieldTestReadinessReport | Real field test evidence still absent | Field test | P1 | READY_WITH_LIMITATIONS only | RC cannot be promoted yet | Run first manual field test round | QA/User | Open | findings register update |
