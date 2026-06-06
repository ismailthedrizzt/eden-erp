# Document Management Rework Audit

Date: 2026-06-06
Branch: main
Working environment: remote server, local PostgreSQL/local DB

## Purpose

Audit the current document management model before strengthening central documents, contextual upload and duplicate file reuse.

## Current State

| Area | Finding |
| --- | --- |
| `documents` | Carries tenant, company/branch, owner entity, document type/category, title, file metadata, checksum, storage metadata, status, verification, expiry, tags, audit metadata and soft delete. |
| `document_files` | Exists via `20260606_0100_document_file_dedup.py`; canonical file identity is `tenant_id + checksum`. |
| `document_relations` | Exists and carries document/file/entity/operation/module/slot/relation metadata after dedup migration. |
| `document_requirements` | Exists; default registry also exists in Python for environments where table data is not seeded. |
| Storage | `storage_provider` is normalized to `local`; files are under `DOCUMENT_STORAGE_ROOT`. |
| Checksum | SHA-256 is calculated when upload includes bytes/base64. |
| Duplicate reuse | Implemented through `document_files`; this phase added fallback reuse through existing `documents.checksum` if `document_files` is unavailable. |
| Physical duplicate write | Avoided for same-tenant checksum reuse. |
| Relation idempotency | This phase added service-level reuse and migration-backed unique context index. |
| User selects existing document? | Not required. User uploads in context; system reuses existing file silently. |
| UI | `DocumentSlot`, `DocumentLoader`, `DocumentRequirementList`, `DocumentPreview`, `DocumentDuplicateNotice`, `DocumentStatusBadge` exist. |
| Wizard alignment | Partially aligned; wizard-by-wizard replacement with `DocumentRequirementList` remains burn-down work. |
| Media route | Next `/api/media/open` is a thin FastAPI proxy. FastAPI validates tenant in storage path and serves through `FileResponse`. |
| Signed URL terminology | `signedUrl` remains as backward-compatible alias; `mediaAccessUrl` is preferred. |

## P0/P1/P2 Risks

| Priority | Risk | Status | Next Action |
| --- | --- | --- | --- |
| P0 | Cross-tenant duplicate reuse. | Guarded by `tenant_id + checksum` lookup. | Keep tests for Tenant A/B reuse. |
| P0 | Path traversal / public storage path. | Guarded by `validate_storage_path` and local root containment. | Add media access regression tests. |
| P0 | Authless media access. | Next route proxies to FastAPI route with access context dependency. | Smoke with and without session. |
| P1 | Wizard document steps not uniformly on `DocumentRequirementList`. | Partial. | Burn down lifecycle wizard families. |
| P1 | Data-quality/action-center document findings not complete. | Planned. | Add findings for duplicate type conflict, rejected/expired reuse. |
| P2 | `signedUrl` naming remains. | Legacy compatibility. | Prefer `mediaAccessUrl` in new UI. |

## Impact

The document backend now better matches the target principle: users upload in context, files are centrally deduplicated per tenant, and relations attach files/documents to each business context.
