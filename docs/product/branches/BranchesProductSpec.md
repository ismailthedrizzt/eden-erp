# Branches Product Spec

## Purpose

`Subelerimiz` is the branch operations command surface for Eden ERP. It is not a free branch creation screen. It lists and manages branch records created by the official Branch Opening operation, and it shows the organization, facility/location and representative authority links around each branch.

## Scope

The module supports:

- opened official/operational branch listing,
- branch detail view,
- card-safe branch profile/contact updates,
- Branch Opening wizard routing,
- Branch Closing wizard routing,
- official branch field locking,
- company relationship visibility,
- organization unit relationship visibility,
- facility/location relationship visibility,
- branch-scoped and company-wide representative authority summaries,
- branch documents and official change history visibility,
- branch closing impact analysis context,
- active/passive/closed branch state display,
- branch filters, summary cards and warnings,
- company detail `branch_summary` consistency checks.

Out of scope:

- legal entity creation, which belongs to Companies,
- official Branch Opening mutation outside the operation wizard,
- branch staffing and positions, which belong to Organization,
- physical location lifecycle, which belongs to Facilities/Locations,
- representative authority mutations, which belong to Representatives,
- warehouse, stock, accounting and service operations.

## Concept Boundaries

- Branch: an official or operational unit under a company. It is not a separate company.
- Facility/Location: a physical place that can be linked to a branch and can remain reusable after branch closing.
- Organization Unit: the staff/hierarchy representation used by Organization and HR-style workflows.

The UI must keep these boundaries visible. Branch detail can link to Organization and Facilities pages, but it must not manage their full lifecycle.

## Page Structure

The current page structure is:

- list view with server-side pagination,
- status, company, branch type, official/operational and city filters,
- product summary widgets for active, official, operational, closed, organization-linked, facility-linked and authority-bearing branches,
- no free create; the primary action starts Branch Opening,
- detail form with field-control locking,
- product readiness panel for company, organization unit, facility/location and authority impact,
- tabs for general data, address/location, public registration, organization links, documents, representatives and history.

Target tabs:

1. General Information
2. Address / Location
3. Public / Registration
4. Organization Link
5. Representatives / Authorities
6. Documents
7. History / Audit

## Field Control

Card-safe fields:

- `branch_short_name`
- `phone`
- `email`
- `responsible_person_id`
- `organization_unit_id`
- `facility_id`
- `notes`
- safe `metadata_json` keys

Operation-controlled fields:

- `company_id`
- `branch_name`
- `branch_type`
- `is_official_branch`
- address fields
- public registration fields
- opening/closing dates
- `status`
- `record_status`
- `start_date`
- `end_date`
- `document_files`

Normal PATCH must reject operation-controlled fields with `OPERATION_CONTROLLED_FIELDS`.

## Branch Opening

Branch Opening starts from an active company and creates the official/operational branch record through an operation wizard. The operation may create:

- organization unit,
- facility/location,
- company branch,
- official change transaction,
- lifecycle/history entry,
- audit and outbox events.

Validation includes active company, required branch identity/address fields, official registration requirements and duplicate active branch name checks.

## Branch Closing

Branch Closing can start from company detail or branch detail. The wizard must show:

- active representative authority impact,
- organization unit action,
- facility/location action,
- open process/task warnings,
- blocking reasons and warnings,
- before/after branch state.

Allowed organization actions are deactivate, reassign or keep open. Allowed facility actions are deactivate, keep open or mark reusable.

## UX Rules

- No silent disabled action is allowed; disabled actions need a tooltip/helper reason.
- `Yeni Sube Ac` must route to Branch Opening, not free create.
- Official fields must be read-only with helper text that names the correct operation.
- Branch detail must show missing organization/facility links as warnings.
- Branch representative authority panel is read-only and routes users to Representatives for authority changes.
- Closed branches are read-only/history oriented and cannot start another closing.

## API Endpoints

Canonical FastAPI endpoints:

- `GET /api/v1/branches`
- `POST /api/v1/branches` forbidden with `USE_BRANCH_OPENING_WIZARD`
- `GET /api/v1/branches/{branch_id}`
- `PATCH /api/v1/branches/{branch_id}`
- `DELETE /api/v1/branches/{branch_id}` only for safe draft/error records
- `GET /api/v1/companies/{company_id}/branch-openings/precheck`
- `POST /api/v1/companies/{company_id}/branch-openings`
- `GET /api/v1/companies/{company_id}/branch-closings/precheck`
- `POST /api/v1/companies/{company_id}/branch-closings`
- `GET /api/v1/facilities`
- `GET /api/v1/facilities/{facility_id}`
- `GET /api/v1/organization/units`
- `GET /api/v1/organization/units/{unit_id}`
- `GET /api/v1/branches/{branch_id}/representative-authorities`

## Acceptance Criteria

- Free branch create is rejected in UI, Next BFF and FastAPI.
- Branch official fields cannot be changed by normal PATCH.
- Branch detail hydrates company, organization unit, facility and representative authority summary.
- Branch Opening and Branch Closing remain operation/wizard endpoints.
- Branch Closing shows organization/facility/authority impact.
- Product docs, scenario docs and E2E checklist exist.
