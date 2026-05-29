# Representatives / Authority Product Spec

## Purpose

`Temsilcilerimiz` is the authority command center for Eden ERP. It is not only a list of authorized people. It is the product surface where representative cards, current authority, scope, signature rules, limits, documents and authority transaction history meet.

## Scope

The module supports:

- representative card draft creation,
- card-safe identity/contact/profile updates,
- Representation Start,
- Authority Renewal,
- Authority Scope Change,
- Limit Change,
- Suspension,
- Resume / Reactivation through renewal,
- Authority Termination,
- correction record,
- reversal record,
- company-wide authority,
- branch-scoped authority,
- organization-unit-scoped authority,
- facility/location-scoped authority,
- bank, GIB, SGK, contract, purchase and payment approval authority,
- current authority summary,
- transaction-based authority history,
- pending authority action and warning visibility.

Out of scope:

- ownership rights, which belong to Partners/Ownership,
- employee and SGK work lifecycle, which belongs to HR,
- branch opening/closing, which belongs to Branches/Company operations,
- organization hierarchy management, which belongs to Organization,
- physical location lifecycle, which belongs to Facilities/Locations.

## User Roles

- representative viewer: can inspect representative cards and current authority,
- representative card editor: can update card-safe identity/contact/profile fields,
- authority operator: can start authority transactions,
- compliance/audit user: can inspect authority history, documents and correction/reversal context,
- admin: can verify permissions, module readiness and temporary fallback removal.

## Page Structure

The current page structure is:

- list view with server-side pagination and authority columns,
- scope filters for company, branch, scope type and company-wide inclusion,
- draft create form with explicit draft notice,
- detail/edit form for card-safe fields,
- authority readiness panel with card status, authority status, scope target, signature rule, limits, delete behavior and warnings,
- authority operation actions,
- documents and history sections.

Target information architecture:

1. General / Card Information
2. Contact
3. Authority Status
4. Scope and Limits
5. Documents
6. Authority History
7. Audit Summary

## Card vs Authority

Representative card fields identify the person or organization and store profile/contact data.

Authority is not a card field. Authority is created and changed through authority transactions and read from current authority/projection state.

Operation-controlled fields include:

- `authority_status`,
- `authority_record_status`,
- `authority_effect_status`,
- `authority_type`,
- `authority_types`,
- `signature_type`,
- `authority_limit`,
- `transaction_limit`,
- `payment_approval_limit`,
- `purchase_approval_limit`,
- `bank_transaction_limit`,
- `contract_signature_limit`,
- `currency`,
- `requires_joint_signature`,
- `can_approve_alone`,
- `scope_type`,
- `branch_id`,
- `organization_unit_id`,
- `facility_id`,
- `current_authority`,
- `authority_transaction_history`.

FastAPI representative card PATCH rejects these fields with `OPERATION_CONTROLLED_FIELDS`.

## Draft Behavior

`+ Ekle` creates a representative card draft.

Draft rules:

- draft card does not create authority,
- Representation Start is the meaningful next action,
- Suspend, Terminate, Limit Change and Scope Change are disabled or hidden until active authority exists,
- clean drafts can be hard deleted,
- drafts with authority history/current authority/open process are not hard-deleted.

Business messages:

- clean draft delete: `Temsilci karti taslagi kalici olarak silindi.`
- active/history delete block: `Yetki veya islem gecmisi olan temsilci kaydi dogrudan silinemez. Yetki Sonlandirma islemini kullanin.`

## Authority Operations

Standard operation behavior:

- precheck before mutation,
- old values and new values visible,
- no-op changes rejected,
- document slots visible,
- summary and explicit confirmation,
- completion refreshes current authority/list/detail,
- audit/outbox/transaction history created by backend where available.

Operations:

- Representation Start,
- Authority Renewal,
- Authority Scope Change,
- Limit Change,
- Suspension,
- Resume / Reactivation through renewal,
- Authority Termination,
- Correction Record,
- Reversal Record.

## Scope Model

Supported scope types:

- `company_wide`: valid for the whole company; branch/unit/facility targets must be empty,
- `branch`: requires an active branch in the same company,
- `organization_unit`: requires an active organization unit in the same company,
- `facility`: requires an active facility/location in the same company.

Closed or passive scopes must not receive a new active authority.

## Limit and Signature Model

Authority limits:

- `transaction_limit`,
- `payment_approval_limit`,
- `purchase_approval_limit`,
- `bank_transaction_limit`,
- `contract_signature_limit`,
- `currency`.

Signature rules:

- `signature_type`,
- `requires_joint_signature`,
- `can_approve_alone`,
- `bank_authority_level`.

Validation rules:

- limits cannot be negative,
- currency is required when a limit exists,
- `requires_joint_signature` and `can_approve_alone` cannot both be true,
- bank authority should show bank scope/limit clearly.

## Current Authority

The list and detail product panel read authority values from current authority/projection fields:

- `authority_status`,
- `authority_record_status`,
- `authority_types`,
- `scope_type`,
- `branch_id`,
- `organization_unit_id`,
- `facility_id`,
- limit fields,
- signature rule fields.

`record_status` is representative card lifecycle. It must not be confused with authority state.

If current authority cannot be read, the UI should not crash. It shows a warning and authority operations can return blocking precheck messages.

## API Contract

Canonical FastAPI endpoints:

- `GET /api/v1/representatives`
- `POST /api/v1/representatives`
- `GET /api/v1/representatives/{representative_id}`
- `PATCH /api/v1/representatives/{representative_id}`
- `DELETE /api/v1/representatives/{representative_id}`
- `POST /api/v1/representatives/{representative_id}/authority-transactions`
- `GET /api/v1/representatives/{representative_id}/current-authority`
- `GET /api/v1/representatives/authorities`
- `GET /api/v1/branches/{branch_id}/representative-authorities`

Next.js routes remain BFF/proxy compatibility routes with temporary fallbacks until staging verification.

## Acceptance Criteria

- `+ Ekle` clearly creates a draft representative card.
- Draft card does not show authority as card-editable data.
- Authority fields are locked in normal card edit.
- Representation Start creates active authority.
- Scope model supports company-wide, branch, organization unit and facility.
- Closed/passive scopes are blocked for new active authority.
- Limit and signature validations are visible.
- Suspend, resume/renew and terminate flows are visible and transaction-based.
- Current authority read model feeds list/detail summaries.

## Known Gaps

Known gaps are tracked in [RepresentativeKnownGaps.md](./RepresentativeKnownGaps.md) and summarized in the final release gate risk list.
