# Tenant Scoped Avatar Model

## Principle

Avatar is not a global user property. Avatar is an active-tenant master person property.

## Resolution

1. Resolve active tenant.
2. Resolve current user.
3. Resolve active `tenant_memberships` row.
4. Use `master_person_id` when present.
5. Fall back to current schema where `tenant_memberships.user_id` is the person id.
6. Resolve avatar from the tenant master person or tenant-scoped HR employee photo.
7. Use initials fallback when no stored photo exists.

## Multi-Tenant Behavior

The same global login user can have different memberships in different tenants. Each tenant can point to a different master person and therefore a different avatar.

## Security

Cross-tenant avatar leakage is P0. Avatar cache keys must include tenant id, user id, master person id, and updated timestamp when available.

