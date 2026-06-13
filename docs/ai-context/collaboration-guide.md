# AI Collaboration Guide

Status: canonical AI context
Updated: 2026-06-13

Use this guide for AI-assisted work on Eden ERP.

## Working Style

- Inspect the remote canonical repo first.
- Group failures by contract, source-of-truth, guard, backend, BFF, frontend, lifecycle, or documentation drift.
- Make the smallest safe change that aligns code with contracts.
- Prefer typed contracts, explicit request/response schemas, and visible operation records.
- Preserve historical context in `docs/archive/**` instead of deleting it.
- Do not add compatibility aliases to hide drift; fix the contract/source mismatch.

## Controlled Legacy Cleanup

- Contract is the source of truth; legacy code, comments, route aliases, and Markdown cannot override executable contracts.
- Legacy code is not removed without inventory evidence from `npm run legacy:inventory` and P0 review from `npm run legacy:check`.
- Hidden alias routes are compatibility wrappers by default; retain them until caller audit or telemetry proves safe removal.
- `generated_from_existing_page` means technical debt, not final contract readiness.
- BFF routes must stay proxy/session/upload adapters; business validation and lifecycle mutation belong in FastAPI/domain services.
- Frontend API services must be covered by API contracts before a page is promoted to contract-ready.
- Lifecycle or status mutation must be operation-recorded before master/projection updates.

## Completion Rule

Work is not complete until the relevant guard passes. For contract/documentation cleanup, run at minimum:

```bash
npm run validate:contracts
npm run build
```

## Related Contracts

- `contracts/**`
- `contracts/page-flow-contracts.json`

## Related Guards

- `scripts/check-doc-source-of-truth.js`
- `scripts/generate-code-legacy-inventory.js`
- `scripts/check-code-legacy-inventory.js`
- `npm run validate:contracts`
- `npm run build`
