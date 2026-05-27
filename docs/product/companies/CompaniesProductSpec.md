# Companies Product Spec

## Purpose

`Sirketlerimiz` is the legal entity command center for Eden ERP. It is not only a company list. It is the product surface where company identity, official lifecycle, public registration, capital, branches, NACE/activity, ownership and representative summaries meet.

## Scope

The module supports:

- company card draft creation,
- company opening lifecycle operation,
- active company detail view,
- card-safe profile/contact updates,
- operation-controlled field locking,
- title change,
- address change,
- public/registration update,
- NACE/activity code update,
- activity subject change,
- capital increase,
- capital decrease precheck/preparation,
- branch opening,
- branch closing,
- liquidation,
- deregistration,
- company detail summaries for ownership, representatives, branches, public registration, NACE/activity, lifecycle/history, pending actions and audit context.

Out of scope:

- ownership rights detail management, which belongs to Partners/Ownership operations,
- representative authority detail management, which belongs to Representatives/Authority operations,
- branch staff and positions, which belong to Organization,
- physical location operations, which belong to Facilities/Locations,
- capital payment/accounting reconciliation, which belongs to Accounting.

## User Roles

- company viewer: can read company cards and summaries,
- company editor: can update card-safe profile/contact fields and start allowed operations,
- company lifecycle operator: can complete opening/liquidation/deregistration flows,
- compliance/audit user: can inspect history, official changes and pending actions,
- admin: can verify module readiness, permissions and fallback removal.

## Page Structure

The current page structure is:

- list view with server-side pagination, status filters and dashboard widget,
- draft create form with explicit draft notice,
- detail/edit form with field-control locking,
- product readiness panel with lifecycle, opening, capital, ownership, representative, branch, public/registration and document signals,
- pending actions panel,
- lifecycle/related tabs,
- official operation actions.

The target information architecture remains:

1. General / Card Information
2. Contact
3. Public / Registration
4. Capital
5. Ownership Summary
6. Representative / Authority Summary
7. Branches / Locations
8. NACE / Activity
9. Documents
10. History / Audit

## Lifecycle

Lifecycle states:

- `draft`: created by `+ Ekle`; not an active company.
- `active`: official opening completed.
- `liquidation`: liquidation started, normal official changes are blocked.
- `deregistered`: read-only/history state.

Rules:

- `draft -> active` only through Company Opening.
- `active -> liquidation` only through Liquidation.
- `liquidation -> deregistered` only through Deregistration.
- Active or operation-history records cannot be directly hard deleted.

## Field Control

Active company fields controlled by official operations include:

- title/name fields,
- tax/public registration fields,
- MERSIS/trade registry fields,
- address fields,
- capital fields,
- NACE/risk/activity fields,
- lifecycle status fields.

Normal card PATCH only updates safe profile/contact/settings fields. FastAPI rejects operation-controlled writes with `OPERATION_CONTROLLED_FIELDS`. The UI surfaces field-level errors and routes the user to the related wizard.

## Official Operations

Standard wizard behavior:

- precheck before mutation,
- current values shown before new values,
- no-op changes rejected,
- document slots visible where relevant,
- summary and explicit confirmation,
- completion refreshes detail/list caches,
- audit/outbox/transaction history created by backend where available.

Operations:

- Company Opening
- Title Change
- Address Change
- Public / Registration Update
- NACE / Activity Code Update
- Activity Subject Change
- Capital Increase
- Capital Decrease Precheck
- Branch Opening
- Branch Closing
- Liquidation
- Deregistration

## Dependencies

- Partners/Ownership is required for capital increase.
- Branches is required for branch opening/closing.
- Representatives is required for authority readiness signals.
- Organization and Facilities are optional warnings for branch operations.
- Action Center provides pending action context.
- Field Control Registry explains locked fields.
- Action Guide points user intent to the correct operation.

## API Contract

Canonical FastAPI endpoints:

- `GET /api/v1/companies`
- `POST /api/v1/companies`
- `GET /api/v1/companies/{company_id}`
- `PATCH /api/v1/companies/{company_id}`
- `DELETE /api/v1/companies/{company_id}`
- `POST /api/v1/companies/{company_id}/official-changes/*`
- `GET/POST /api/v1/companies/{company_id}/capital-increases`
- `GET/POST /api/v1/companies/{company_id}/branch-openings`
- `GET/POST /api/v1/companies/{company_id}/branch-closings`
- `GET /api/v1/companies/{company_id}/current-ownership`

Next.js routes remain BFF/proxy compatibility routes.

## Acceptance Criteria

- `+ Ekle` clearly creates a draft card.
- Draft records show Company Opening as the next meaningful action.
- Active official fields are locked and explain the required wizard.
- Official operations use precheck/summary/completion.
- Capital increase blocks without current ownership readiness.
- Branch opening/closing is launched as an official operation, not card CRUD.
- Liquidation/deregistration prechecks explain open dependencies.
- Company detail shows readiness summary and pending actions.
- Technical backend errors are normalized into business-language messages.
- `npm run typecheck`, `npm run build`, backend lint/typecheck/tests pass.
