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

## Completion Rule

Work is not complete until the relevant guard passes. For contract/documentation cleanup, run at minimum:

```bash
npm run validate:contracts
npm run build
```
