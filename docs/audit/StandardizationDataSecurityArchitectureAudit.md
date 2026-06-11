# Standardization + Data Security + Conceptual Architecture Audit

Date: 2026-06-10
Updated: 2026-06-11
Scope: Eden ERP frontend to BFF to FastAPI to PostgreSQL delivery contract, data security, upload security, operation request lifecycle, representative authority flow, release visibility and quality gates.

## Executive Summary

This audit hardened the quality gates and exposed real delivery debt. The repository no longer treats page/flow contract placeholder text as a valid reference. The default `eden:quality-gate` is release-grade. Preview and staging are no longer considered local development. Uploads no longer pass through the Next BFF as base64 JSON. Operation requests are moving through typed payload contracts, and representative authority transaction types use canonical values rather than Turkish labels.

The P0 cleanup work that follows this report replaces placeholder contract entries with real schema, generated client and test references; adds missing BFF guards; standardizes list-query contracts; and expands live DB schema contract tests.

## P0 Findings

- Page/Flow Contract registry contained placeholders instead of real contract references for company-create-wizard, representative-create, representative-authority-wizard, partner-create, ownership-transactions, branch-create, document-upload, employee-create, themes-management and generic-lifecycle-operations.
- Security guard failed on unresolved contracts: setup wizard signed intent binding, upload/image/AI endpoint guards and large reference endpoint bounded-query rules.
- OpenAPI drift was real after upload and representative authority schema changes. `backend/openapi.json` and `lib/generated/backend-client/types.ts` must stay intentionally updated with schema changes.

## P1 Findings

- Some frontend flows still shape payloads manually instead of using generated OpenAPI types.
- Performance guard failed on alias/list-query contracts in company, employee, partners, representatives, stakeholders and vehicles list endpoints.
- Operation payload registry rejects unregistered operation types. Every new operation type needs a typed payload model.
- The tenant sequence counter migration should be applied before relying on high-volume concurrent representative authority writes.
- DB schema contract tests needed live introspection coverage for tenant_id NOT NULL, FK, lifecycle constraints, soft delete, audit fields and tenant-scoped indexes.

## P2 Findings

- Turkish display labels should be centralized through display label maps while canonical enum values remain internal.
- Document upload OpenAPI needs explicit multipart metadata so generated clients do not expose misleading `requestBody?: never` upload contracts.
- `check-security-reference-contracts.js` still contains string assertions. It should continue moving toward route contract or AST-based checks.

## Changes Made Before P0 Cleanup

- `scripts/eden-quality-gate.js`: default gate is release-grade; `--quick` is the explicit reduced profile.
- `scripts/check-page-flow-contracts.js`: rejects placeholder text and requires real file/symbol, backend class, generated client and test references.
- `backend/app/core/config.py`, `backend/app/core/security.py`, `middleware.ts`, `scripts/check-release-env-safety.js`, `lib/env/releaseSafety.ts`, `lib/release/environment.ts`: preview/staging are remote protected; auth/trusted proxy secret rules hardened; login bypass limited to localhost with `EDEN_LOCAL_DEV_ADMIN_FALLBACK=true`.
- `app/api/documents/_upload.ts`, `backend/app/api/v1/documents.py`: Next no longer converts multipart files to base64 JSON; FastAPI enforces size limit, MIME allowlist, file-name sanitization and rejects client-controlled storage paths.
- `backend/app/domains/operations/payload_registry.py`, `backend/app/domains/operations/service.py`: typed operation payload registry and stricter duplicate key.
- `backend/app/domains/representatives/schemas.py`, `backend/app/domains/representatives/authority.py`: representative authority transaction type normalized to canonical enum values; `base_updated_at` is datetime; transaction numbers use tenant-scoped counter plus advisory lock.
- `backend/migrations/versions/20260610_0200_operation_contract_hardening.py`: tenant sequence counter table and operation request idempotency index.
- `backend/app/tests/test_operation_contract_hardening.py`, `backend/app/tests/test_representative_authority_transactions.py`: backend tests for canonical transaction type, datetime normalization, operation registry rejection and no `count(*) + 1` transaction number strategy.
- `scripts/check-security-reference-contracts.js`: stale safeCrudService and frontend workflow guard references replaced with current CRUD client, backend delete policy and FastAPI upload contracts.

## Verification Snapshot Before P0 Cleanup

Passed:

- `npm run typecheck`
- `npm run env:safety`
- `npm run release:check`
- `npm run db:target:check`
- `npm run boundaries:check` with one existing warning
- `npm run smoke:test:dry`
- `npm run theme:hikmet:validate`
- `cd backend && .venv/bin/python -m ruff check ...` on changed backend files
- `npm run backend:typecheck`
- `cd backend && .venv/bin/python -m pytest app/tests/test_operation_contract_hardening.py app/tests/test_representative_authority_transactions.py -q`

Failing items that this cleanup targets:

- `npm run page-flow:contract:check`
- `npm run eden:quality-gate -- --quick`
- `npm run security:guard`
- `npm run perf:guard`
- `npm run openapi:drift`

## Next Required Fixes

1. Replace each page-flow placeholder with a real schema/test/generated-client reference.
2. Add explicit multipart OpenAPI metadata for document upload endpoints or accept and commit the generated upload contract change.
3. Resolve security guard failures for setup wizard, reference endpoints, image variants and AI CV extraction.
4. Resolve perf guard failures by removing aliases and standardizing count-free list pagination.
5. Expand live DB schema contract tests for tenant scope, FK, lifecycle, soft-delete, audit and index constraints.
