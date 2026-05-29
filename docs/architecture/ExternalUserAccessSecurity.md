# External User Access Security

## Principle

External portal users are not internal ERP users. They receive a separate access context and can only call portal APIs that enforce stakeholder/customer scope.

## Enforcement Layers

1. `get_portal_access_context` authenticates the Supabase auth user and loads an active portal user row.
2. Portal scope is derived from `stakeholder_id`, `customer_account_id`, master entity IDs, and optional explicit allowlists.
3. Each portal domain function applies asset/request/document scope before returning data.
4. Public payload helpers strip internal notes, private metadata, and cost-like fields.
5. Admin portal management uses internal permissions: `portal.manageUsers`, `portal.inviteUsers`, `portal.suspendUsers`, `portal.viewActivity`, and `portal.shareDocuments`.

## Blockers

- Other-customer asset/service/document access must return scope denied.
- Suspended or revoked portal users must be rejected.
- Internal ERP endpoints must not accept portal self-service identity as an internal permission grant.
- Raw secrets, signed storage URLs, and service role credentials must not be returned to the frontend.

## Audit Events

- `portal_login`
- `portal_view_asset`
- `portal_view_service_request`
- `portal_create_service_request`
- `portal_download_document`
- `portal_upload_document`
- `portal_access_denied`

Audit is best-effort and writes to `portal_activity_logs`.

