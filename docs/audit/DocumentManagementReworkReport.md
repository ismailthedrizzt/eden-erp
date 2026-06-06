# Document Management Rework Report

Date: 2026-06-06
Branch: main
Working environment: remote server, local PostgreSQL/local DB

## Scope

This phase strengthened existing document management without introducing a new business module.

## Changes

- Added fallback checksum reuse through existing `documents` rows when `document_files` is unavailable.
- Added relation idempotency to avoid duplicate relations for the same document/context/slot/relation.
- Added migration `20260606_0200_document_relation_idempotency.py`.
- Expanded document type registry to cover company, employee, ownership/capital, representative, branch, accounting, service and contract types.
- Expanded default document requirement registry for capital decrease, initial partnership, representative limit change, branch closing, employment exit and contract operations.
- Document upload response now carries `relation_reused`.

## Canonical Behavior

1. User uploads in `DocumentSlot` or a contextual wizard/form.
2. FastAPI sanitizes and validates file metadata.
3. FastAPI calculates checksum.
4. Same tenant checksum reuses existing physical file.
5. A new document metadata record can be created for the new business meaning.
6. A relation attaches the document/file to the entity/operation/slot.
7. Same document/context/slot/relation returns the existing relation.

## Test Baseline

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Pass | Targeted TypeScript check passed for changed file. |
| `npm run build` | Pass | Existing ESLint warnings only. |
| `npm run release:check` | Pass | Release registry/page route guard passed. |
| `npm run env:safety` | Pass | Release env safety guard passed. |
| `npm run db:target:check` | Pass | `app1db` classified as release target. |
| `npm run openapi:drift` | Pass | OpenAPI export/generate produced no committed diff. |
| `cd backend && python -m ruff check .` | Fail baseline | Existing 93 formatting/import/line-length findings; no new document-domain finding surfaced. |
| `cd backend && python -m mypy app` | Fail baseline | Existing `app/api/v1/accounting.py:596` type error. |
| `cd backend && python -m pytest` | Fail baseline | 225 passed, 2 observability tests return 401 under release auth. |

## Remaining Work

- Add dedicated backend tests for duplicate reuse and relation idempotency.
- Convert all lifecycle wizard document steps to `DocumentRequirementList` / `DocumentSlot`.
- Add Data Quality findings and Action Center items for expired/rejected/type-conflict reuse.
- Prefer `mediaAccessUrl` everywhere and keep `signedUrl` only as legacy field.
