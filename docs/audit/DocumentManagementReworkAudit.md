# Document Management Rework Audit

Audit date: 2026-06-06

## Current State

- `documents` stores document metadata plus current storage fields: `storage_bucket`, `storage_path`, `storage_provider`, `checksum`, `mime_type`, `file_size`, status, verification status, owner entity and version fields.
- `document_relations` exists and links a document to an entity. Before this rework it did not carry `document_file_id`, module, operation, slot or relation metadata.
- `document_requirements` exists and is backed by default in-code requirements when the table is unavailable.
- Local storage is already used through `backend/app/domains/documents/storage.py`; path traversal is blocked with tenant path validation and `commonpath`.
- Media access is controlled through FastAPI and the Next BFF `/api/media/open` proxy.
- The previous upload service calculated checksum but wrote the physical file before duplicate lookup, so duplicate physical file reuse was not enforced.
- UI upload is contextual through `DocumentLoader` and `DocumentSlot`; users are not required to pick from a central document pool.
- `signedUrl` terminology still existed as a compatibility name. This rework introduces `mediaAccessUrl` while keeping alias fields for older consumers.
- Supabase Storage is not used by the canonical upload/media route. One client default still sent `storage_provider=supabase`; this was changed to `local`.

## Changes In This Rework

- Added `document_files` physical file registry.
- Added tenant-scoped checksum lookup before file write.
- Added `documents.document_file_id`.
- Extended `document_relations` with file, module, operation, slot, creator and metadata fields.
- Upload response now includes `document_file_id`, `relation_id`, `reused_existing_file`, `duplicate_warning` and a user-safe message.
- Duplicate files are reused only inside the same tenant.
- Added `mediaAccessUrl` / `media_access_url` response fields.
- Added a document type registry and expanded default requirement registry.
- Added UI duplicate notice in contextual document slots.

## P0/P1/P2 Risks

- P0: cross-tenant checksum reuse must never happen. The lookup is scoped by `tenant_id`.
- P0: media route must stay authenticated and scoped. The BFF route remains a thin proxy to FastAPI.
- P0: storage path must not be public or user-controlled. Existing validation remains in place.
- P1: old documents without checksum cannot be deduplicated until reuploaded or backfilled with checksum.
- P1: relation finalization for operation drafts still depends on each wizard passing operation context consistently.
- P2: old consumers may still read `signedUrl`; alias remains, but new code should use `mediaAccessUrl`.

## Field Test Checklist

- Upload the same PDF twice to the same entity slot and verify the second response has `reused_existing_file=true`.
- Upload the same PDF to a different document type in the same tenant and verify a warning appears.
- Upload the same PDF in a different tenant and verify a new `document_files` row is created.
- Open preview/download and verify no raw filesystem path is exposed.
