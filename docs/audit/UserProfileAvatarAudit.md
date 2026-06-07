# User Profile Avatar Audit

Date: 2026-06-07

## Scope

This audit covers the app shell profile avatar, current-user endpoints, tenant membership resolution, master person/person records, and avatar/media storage boundaries.

## Findings

- Header/app shell previously loaded profile data from `GET /api/auth/me`, which proxied `GET /api/v1/security/me`.
- `security/me` resolved display name from session/person data, but avatar lookup was not modeled as a first-class tenant-scoped master person resolver.
- Tenant workspace options and profile resolution could diverge because workspace options used only `context.user_id`, while profile lookup also considered phone/email identity.
- Unicode display names such as `İsmail ILGAR` could not be sent as a raw `x-user-name` HTTP header from Next to FastAPI. This caused FastAPI proxy calls to fail before profile and workspace data could be resolved.
- Live probe for phone `5011005035` returned 2 login tenants and 2 workspace options after the identity fix.
- Live avatar probe found 2 matching `persons` rows for `İsmail ILGAR`, but no populated avatar/photo/media columns in `persons`, `hr_employees`, `employees`, or `security_users_profile`.

## Current Source

Avatar is now resolved by `backend/app/domains/users/profile.py`:

1. Active tenant id from request context.
2. Current user id from trusted proxy/session context.
3. `tenant_memberships` in the active tenant.
4. `tenant_memberships.master_person_id` when present.
5. Fallback to existing schema where `tenant_memberships.user_id` acts as the tenant master person id.
6. Master person/person profile fields and tenant-scoped HR employee photo fields.
7. Initials fallback from tenant master person display name.

## Endpoint Surface

- `GET /api/v1/users/me/profile`
- `PATCH /api/v1/users/me/profile`
- `GET /api/v1/users/me/avatar`
- `GET /api/v1/users/{user_id}/profile`
- `GET /api/v1/users/{user_id}/avatar`
- Compatibility: `GET /api/v1/security/me` now reads from the same resolver.

Next BFF:

- `GET/PATCH /api/users/me/profile`
- `GET /api/users/me/avatar`
- `GET /api/auth/me` tries `/api/v1/users/me/profile` first, then legacy `/api/v1/security/me`.

## Tenant Isolation

- Avatar resolution requires active tenant context.
- Master person selection is mediated by active tenant membership.
- If a future `master_persons` or `persons.tenant_id` column exists, the resolver asserts the active tenant id on person lookup.
- Unscoped cross-tenant HR employee avatar fallback was removed from the active path.
- Raw storage paths are not returned as `avatarUrl`; direct avatar URLs are accepted only when they are safe HTTP(S), `/api/`, or `/uploads/` URLs.

## Risks

- P0: Returning another tenant's avatar from an unscoped employee/person lookup. Mitigated by tenant-scoped resolver and removing cross-tenant HR fallback.
- P1: No stored avatar exists for the tested user; UI must show initials until a tenant-scoped profile photo is uploaded.
- P1: Full avatar upload still needs Document/Media integration before release-grade photo mutation.
- P2: Existing legacy `security.py` helper code remains for older security surfaces, but `security/me` no longer uses the legacy avatar path.

## Manual Probe Result

For phone `5011005035` on the remote app server:

- Login tenant count: 2.
- Workspace option count after fix: 2.
- Display name: `İsmail ILGAR`.
- Avatar source: missing stored photo; initials fallback expected.

