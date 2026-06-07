# User Avatar Security Test Report

Date: 2026-06-07

## Checks

- Active tenant context is required for `/api/v1/users/me/profile`.
- Current user id is required for `/api/v1/users/me/profile`.
- Membership lookup is constrained by `tenant_id`.
- Person lookup asserts `tenant_id` when the person table has a `tenant_id` column.
- HR employee avatar lookup requires `hr_employees.tenant_id`.
- Raw relative storage paths are not returned as avatar URLs.
- `javascript:`, `data:`, `file:`, path traversal, and HTML-like values are rejected by the safe avatar URL helper.
- Unicode display names are sent through an encoded header, avoiding proxy failure.
- Avatar content is served through `/api/v1/users/me/avatar/content` after active tenant and current user resolution.
- Upload accepts only jpg, png, and webp MIME types and rejects unsupported file types before storage.
- Upload filenames are normalized to a basename before being stored in metadata.

## Manual Remote Probe

- `tenant-access` for `5011005035`: 200.
- Workspace count from `/api/v1/security/tenants/options`: 2.
- Current profile from `/api/v1/users/me/profile`: 200.
- Legacy profile from `/api/v1/security/me`: 200.
- Display name: `İsmail ILGAR`.
- Initials fallback: `İI`.
- Avatar result: no stored media yet, `avatar.type = initials` expected.
- `/api/v1/users/me/avatar/content` without stored photo: 404 expected.
- Invalid `text/plain` upload to `/api/v1/users/me/avatar`: 422 `AVATAR_TYPE_NOT_ALLOWED`.

## Remaining Negative Tests

- Tenant A session against Tenant B media URL should be tested with real two-tenant avatar fixtures.
- SVG/script upload should be tested explicitly; it is expected to be rejected because `image/svg+xml` is not whitelisted.
- Path traversal filename upload should be tested explicitly; filenames are currently reduced to `Path(filename).name`.
