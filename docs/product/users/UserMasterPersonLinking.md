# User Master Person Linking

<!-- source-of-truth-standard: contract overrides markdown -->

## Target Model

`tenant_memberships` should carry:

- `tenant_id`
- `user_id`
- `master_person_id`
- role/status fields

## Current Compatibility

The deployed schema can represent the link with `tenant_memberships.user_id` pointing to the tenant person record. The resolver treats this as a compatibility fallback only.

## Future Migration

Add `master_person_id` explicitly, backfill it from current membership/person links, and preserve tenant-scoped uniqueness.

