# Standardization + Data Security + Conceptual Architecture Audit

Date: 2026-06-10
Scope: Eden ERP frontend to BFF to FastAPI to PostgreSQL delivery contract, data security, upload security, operation request lifecycle, representative authority flow, release visibility and quality gates.

## Executive Summary

This audit hardened gates and corrected several concrete risks. The repo no longer treats page/flow contract placeholder text as a valid contract. The default eden:quality-gate is now release-grade. Preview and staging are no longer local development. Uploads no longer pass through the Next BFF as base64 JSON. Operation requests now run through a typed payload registry and representative authority transaction types are canonical values rather than Turkish labels.

The important result is intentionally uncomfortable: eden:quality-gate now fails early on real page-flow contract debt. That is correct. Previously those flows looked documented while still containing placeholder strings such as Required: ..., P1: ... and Future: ....

## P0 Findings

- Page/Flow Contract registry contains placeholders instead of real contract references. The hardened checker now fails company-create-wizard, 
epresentative-create, 
epresentative-authority-wizard, partner-create, ownership-transactions, ranch-create, document-upload, employee-create, 	hemes-management, and generic-lifecycle-operations until they point to real frontend schemas, backend Pydantic classes, generated OpenAPI references and test files.
- Security guard now fails on real unresolved contracts: setup wizard signed intent binding, some upload/image/AI endpoints, and large reference endpoint bounded-query rules. The previous failure was a stale file reference; it is now a real guard failure.
- OpenAPI drift is real after upload and representative authority schema changes. ackend/openapi.json and lib/generated/backend-client/types.ts were regenerated and now reflect canonical authority enum/date-time changes and the removal of JSON body contracts from upload endpoints. This must be staged/committed with the code change or redesigned with explicit multipart OpenAPI metadata.

## P1 Findings

- Many frontend flows still shape payloads manually instead of using generated OpenAPI types. The new page-flow gate makes this visible.
- Performance guard fails on alias/list-query contracts in several API routes, including company, employee, partners, representatives, stakeholders and vehicles list endpoints. This matches the user directive to stop loose alias habits.
- Operation payload registry now rejects unregistered operation types. Current mapped families cover representative authority, ownership, company and branch operations, but every new operation type must be added with a typed payload model.
- The new tenant sequence counter table is protected by migration and runtime safety, but migration should be applied before relying on high-volume concurrent representative authority writes.
- DB schema contract tests are still partial. Unit tests verify payload normalization and transaction number strategy; full live DB introspection should be expanded for tenant_id NOT NULL, FK, lifecycle constraints, soft delete and audit indexes.

## P2 Findings

- Some existing user-facing messages now rely on canonical transaction values internally. Turkish display labels should be centralized through AUTHORITY_TRANSACTION_DISPLAY_LABELS wherever UI labels are rendered.
- Document upload OpenAPI needs a formal multipart schema so generated clients do not show 
equestBody?: never for upload routes.
- check-security-reference-contracts.js now follows the current code layout, but its assertions should continue moving away from brittle string checks toward AST or route contract checks.

## Changes Made

- scripts/eden-quality-gate.js: default gate is release-grade; --quick is the explicit reduced profile.
- scripts/check-page-flow-contracts.js: rejects placeholder text and requires real file/symbol, backend class, generated client and test references.
- ackend/app/core/config.py, ackend/app/core/security.py, middleware.ts, scripts/check-release-env-safety.js, lib/env/releaseSafety.ts, lib/release/environment.ts: preview/staging are remote protected; auth/trusted proxy secret rules hardened; login bypass limited to localhost with EDEN_LOCAL_DEV_ADMIN_FALLBACK=true.
- pp/api/documents/_upload.ts, ackend/app/api/v1/documents.py: Next no longer converts multipart files to base64 JSON; FastAPI enforces size limit, MIME allowlist, file-name sanitization and rejects client-controlled storage paths.
- ackend/app/domains/operations/payload_registry.py, ackend/app/domains/operations/service.py: typed operation payload registry and stricter duplicate key.
- ackend/app/domains/representatives/schemas.py, ackend/app/domains/representatives/authority.py: representative authority transaction type normalized to canonical enum values; ase_updated_at is datetime; transaction numbers use tenant-scoped counter plus advisory lock.
- ackend/migrations/versions/20260610_0200_operation_contract_hardening.py: tenant sequence counter table and operation request idempotency index.
- ackend/app/tests/test_operation_contract_hardening.py, ackend/app/tests/test_representative_authority_transactions.py: backend tests for canonical transaction type, datetime normalization, operation registry rejection and no count(*) + 1 transaction number strategy.
- scripts/check-security-reference-contracts.js: stale safeCrudService and frontend workflow guard references replaced with current CRUD client, backend delete policy and FastAPI upload contracts.

## Verification

Passed:

- 
pm run typecheck
- 
pm run env:safety
- 
pm run release:check
- 
pm run db:target:check
- 
pm run boundaries:check with one existing warning
- 
pm run smoke:test:dry
- 
pm run theme:hikmet:validate
- cd backend && .venv/bin/python -m ruff check ... on changed backend files
- 
pm run backend:typecheck
- cd backend && .venv/bin/python -m pytest app/tests/test_operation_contract_hardening.py app/tests/test_representative_authority_transactions.py -q

Failing by design / remaining debt:

- 
pm run page-flow:contract:check fails because existing registry entries use placeholders instead of real files/symbols/tests/generated client references.
- 
pm run eden:quality-gate -- --quick fails at page-flow contracts for the same reason.
- 
pm run security:guard fails on real unresolved setup wizard, reference endpoint, image upload and AI CV extraction contracts.
- 
pm run perf:guard fails on existing alias/list pagination contracts.
- 
pm run openapi:drift reports real generated OpenAPI/client changes after this patch.

## Next Required Fixes

1. Replace each page-flow placeholder with a real schema/test/generated-client reference.
2. Add explicit multipart OpenAPI metadata for document upload endpoints or accept the generated upload contract change and commit it.
3. Resolve security guard failures for setup wizard, reference endpoints, image variants and AI CV extraction.
4. Resolve perf guard failures by removing aliases and standardizing count-free list pagination.
5. Expand live DB schema contract tests for tenant scope, FK, lifecycle, soft-delete, audit and index constraints.
