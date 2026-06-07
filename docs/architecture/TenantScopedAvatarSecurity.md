# Tenant Scoped Avatar Security

## Boundary

Avatar access is tenant-scoped. A user, admin, or media URL must not cross tenant boundaries.

## Backend Requirements

- Resolve avatar through active tenant membership.
- Assert master person tenant when the person table has `tenant_id`.
- Do not return raw storage paths.
- Do not use unscoped employee/person photo fallback.
- Use controlled Document/Media routes for avatar upload and serving.

## Frontend Requirements

- Header uses `/api/users/me/profile`.
- Initials fallback uses tenant master person display name.
- Browser cache must not reuse avatar responses across tenants.

