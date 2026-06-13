# Eden ERP AI Context

Status: canonical AI working context
Updated: 2026-06-13

This folder is the concise starting point for AI-assisted work on Eden ERP. It does not replace contracts or source code. When a machine-readable contract exists, the contract is the source of truth. When code and docs disagree, inspect code, contracts, and guards before editing.

## Read Order

1. [Remote Development](./remote-development.md)
2. [Contracts and Guards](./contracts-and-guards.md)
3. [Architecture Summary](./architecture-summary.md)
4. [Lifecycle and Operation Rules](./lifecycle-and-operation-rules.md)
5. [Collaboration Guide](./collaboration-guide.md)
6. [Markdown Source-of-Truth Inventory](./markdown-source-of-truth-inventory.md)

## Canonical Sources

- Contracts: `contracts/**`
- Page flow registry: `contracts/page-flow-contracts.json`
- Release registry guard: `scripts/check-release-registry.js`
- Backend drift guard: `scripts/check-backend-contract-drift.js`
- Lifecycle guard: `scripts/check-lifecycle-operation-guard.js`
- Documentation source guard: `scripts/check-doc-source-of-truth.js`

Historical audits, cleanup reports, stale root notes, and legacy migration notes are archived under `docs/archive/markdown-source-of-truth-2026-06-13/`.
