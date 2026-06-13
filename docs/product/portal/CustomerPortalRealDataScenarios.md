# Customer Portal Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Customer Portal Invitation

1. Internal user opens a CRM customer stakeholder.
2. User creates a portal invitation with `customer_user` role.
3. Portal external user is linked to the stakeholder and auth user.
4. Customer signs in and opens `/portal/dashboard`.
5. Customer sees only their own products and service data.

## Scenario 2 - Installed Asset View

1. Portal user opens `Urunlerim`.
2. API filters installed assets by stakeholder/customer scope.
3. Warranty, serial number, last service, and next maintenance are visible.
4. Another customer's asset ID returns `PORTAL_SCOPE_DENIED`.

## Scenario 3 - Service Request Creation

1. Portal user selects an installed asset.
2. User submits a fault request with contact details.
3. Backend asserts asset scope.
4. After-Sales service request is created with `source = customer_portal`.
5. Portal activity log records `portal_create_service_request`.

## Scenario 4 - Service Record View

1. Internal technician completes a service record.
2. Portal user opens service records.
3. Work performed, result, warranty coverage, and report file reference are visible.
4. Internal notes and cost fields are hidden.

## Scenario 5 - Document Download

1. Internal user shares a service report through `portal_shared_documents`.
2. Portal user sees the document in `Belgeler`.
3. Download URL endpoint checks stakeholder scope.
4. Activity log records `portal_download_document`.

## Scenario 6 - Suspended Portal User

1. Admin sets portal user status to `suspended`.
2. User calls any portal endpoint.
3. Backend returns `PORTAL_USER_NOT_ACTIVE`.

## Scenario 7 - Portal Document Upload

1. Portal user uploads customer-side evidence metadata.
2. Backend checks `can_upload_documents`.
3. Document metadata is created with `document_category = portal_upload`.
4. Document is shared back to the same stakeholder.

