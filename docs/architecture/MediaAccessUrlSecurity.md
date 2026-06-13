# Media Access URL Security

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06

## Canonical Rule

Document media is not public static storage. Browser access goes through Next BFF and FastAPI-controlled media endpoints.

## Path

```text
Browser
-> /api/media/open
-> Next proxy
-> /api/v1/documents/media/open
-> FastAPI access context
-> local filesystem under DOCUMENT_STORAGE_ROOT
```

## Security Rules

- `storage_path` must be relative.
- `storage_path` must not include `..`.
- `storage_path` must include the current tenant id.
- Local filesystem resolution must remain inside the bucket root.
- Storage path is never returned raw in document payloads; masked path is allowed for diagnostics.
- `signedUrl` is a legacy response alias. New UI must use `mediaAccessUrl`.
- Media route requires auth/session/trusted proxy context.

## P0 Risks

- Authless media route.
- Public storage directory exposure.
- Path traversal.
- Cross-tenant storage path access.

## Verification

Smoke tests must cover valid access, unauthenticated access, wrong tenant path and path traversal attempts.
