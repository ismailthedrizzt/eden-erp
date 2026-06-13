# Customer Portal / External User Access MVP

<!-- source-of-truth-standard: contract overrides markdown -->

## Purpose

Customer Portal lets external customer users access only their own Eden ERP records: installed assets, service requests, shared service records, portal-visible documents, and limited notifications. It is not an internal ERP shell and must never grant broad company, audit, security, accounting, or admin access.

## Scope

- External customer user model linked to CRM stakeholder/customer records.
- Portal-specific auth and scope dependency.
- Portal dashboard, installed assets, service requests, service records, documents, notifications, and profile pages.
- Internal admin invitation/user management API.
- Portal activity audit logs for login, view, create, upload, download, and denied access.

## External User Model

Canonical tables:

- `portal_external_users`
- `portal_invitations`
- `portal_shared_documents`
- `portal_activity_logs`

External users are linked with `auth_user_id`, `tenant_id`, `stakeholder_id`, optional customer account/master entity IDs, `portal_role`, `status`, and JSON access scope.

Portal roles:

- `customer_admin`
- `customer_user`
- `customer_viewer`
- `service_contact`

## Customer Scope

Every portal endpoint uses `get_portal_access_context` and enforces:

- active portal user status
- tenant boundary
- stakeholder/customer account scope
- optional `allowed_asset_ids`
- optional `allowed_service_request_ids`
- per-capability scope flags such as `can_create_service_request`, `can_view_service_records`, `can_download_documents`, and `can_upload_documents`

Internal ERP permissions are not used for portal self-service access.

## Portal UI

Routes:

- `/portal/dashboard`
- `/portal/products`
- `/portal/products/[id]`
- `/portal/service-requests`
- `/portal/service-requests/[id]`
- `/portal/service-records`
- `/portal/documents`
- `/portal/profile`

The portal has a separate, simple shell with customer-facing language and no internal ERP sidebar.

## API Endpoints

Portal:

- `GET /api/v1/portal/me`
- `GET /api/v1/portal/dashboard`
- `GET /api/v1/portal/products`
- `GET /api/v1/portal/products/{asset_id}`
- `GET /api/v1/portal/service-requests`
- `POST /api/v1/portal/service-requests`
- `GET /api/v1/portal/service-requests/{request_id}`
- `POST /api/v1/portal/service-requests/{request_id}/comments`
- `POST /api/v1/portal/service-requests/{request_id}/attachments`
- `GET /api/v1/portal/service-records`
- `GET /api/v1/portal/service-records/{service_id}`
- `GET /api/v1/portal/documents`
- `POST /api/v1/portal/documents/upload`
- `GET /api/v1/portal/documents/{document_id}/download-url`
- `GET /api/v1/portal/notifications`
- `POST /api/v1/portal/notifications/{id}/read`

Internal admin:

- `POST /api/v1/admin/portal/invitations`
- `GET /api/v1/admin/portal/users`
- `PATCH /api/v1/admin/portal/users/{portal_user_id}`

## Security

Portal users cannot access:

- internal admin pages
- ERP-wide CRM/After-Sales endpoints
- audit/security/reporting APIs
- internal notes
- internal costs
- technician private notes
- other customer records
- raw storage paths or service secrets

Document download returns a scope-checked placeholder for signed URL integration; the actual signed URL service remains document-domain controlled.

## Acceptance Criteria

- External portal user records can be invited and managed.
- Active portal users can load `/portal/me` and scoped dashboard data.
- Product, service request, service record, and document endpoints deny other-customer records.
- Portal service request creation writes an After-Sales service request with `source = customer_portal`.
- Internal notes and costs are stripped from portal payloads.
- Portal activity logs are written best-effort.
- Next proxy routes mirror FastAPI endpoints.

