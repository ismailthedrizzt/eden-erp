# Cleanup Sprint Backlog

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

| id | title | source report | priority | estimated risk | recommended prompt type | tests required | done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-001 | P0 cleanup if security field test finds bypass | AuthenticatedSecurityNegativeTestGapReport | P0 conditional | high | fix prompt | targeted negative tests | no auth/scope/storage bypass |
| B-001 | Start dedicated outbox worker | WorkerOpsLimitationReport | P1 | medium | ops/config fix | pm2/process + backlog drain | worker online and backlog stable |
| B-002 | Add worker heartbeat/DLQ visibility | WorkerOpsLimitationReport | P1 | medium | backend/ops fix | heartbeat query/endpoint | heartbeat visible and DLQ documented |
| B-003 | Standardize backup directory | BackupHstsOpsLimitationReport | P1 | low | ops fix | pg_dump to /opt path | backup path writable, 600 perms |
| B-004 | Run authenticated security negative tests | AuthenticatedSecurityNegativeTestGapReport | P1 | medium | manual+automation smoke | 10 negative tests | no P0; findings registered |
| C-001 | Boundary warnings release-scope burn-down | NextFastApiBoundaryDebtReport | P1 | medium | refactor prompt | typecheck/build/boundaries | release-scope warnings reduced or classified |
| C-002 | Add migration headers to 99 routes | NextFastApiBoundaryDebtReport | P1 | low | mechanical docs/code metadata | migration:status | missing headers 0 or justified |
| D-001 | Supabase/Vercel residue cleanup | DeprecatedDocsAndScriptsInventory | P1/P2 | medium | cleanup prompt | build/env/release | canonical docs/scripts only |
| E-001 | Alias route visibility cleanup | FallbackAndAliasInventory | P1/P2 | medium | route cleanup prompt | release:check/navigation smoke | aliases hidden/redirected/deleted after test |
| F-001 | Release UI template consistency pass | UiTemplateConsistencyDebtReport | P1 | medium | UI standardization prompt | manual field test + build | core pages use canonical patterns |
| G-001 | Deprecated docs archive cleanup | DeprecatedDocsAndScriptsInventory | P2 | low | docs cleanup prompt | docs review | old assumptions archived or updated |
