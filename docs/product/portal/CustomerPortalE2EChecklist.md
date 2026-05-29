# Customer Portal E2E Checklist

Playwright spec is not added until the repo has an active Playwright setup. Use this as the regression script.

- Portal login/session resolves `/api/portal/me`.
- Portal dashboard shows scoped asset, open request, maintenance due, and recent service counts.
- Product list shows only the portal customer's installed assets.
- Product detail shows warranty, last service, next maintenance, and service history.
- Service request create form creates an After-Sales request with `source = customer_portal`.
- Service request detail maps internal status to portal-friendly status.
- Service records are visible only when `can_view_service_records` allows it.
- Internal service notes and cost fields are not rendered.
- Shared document list shows only `portal_shared_documents` for the stakeholder.
- Download URL endpoint rejects an unshared or other-customer document.
- Portal document upload creates metadata and a portal shared document relation.
- Admin invitation endpoint creates a pending invitation and optional portal external user.
- Suspended portal user receives a friendly access denied response.

Seed data:

- customer stakeholder
- portal external user
- installed asset for that stakeholder
- other customer installed asset for negative scope test
- open service request
- completed service record
- shared document

