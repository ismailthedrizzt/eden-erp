# Partners / Ownership Product Spec

## Purpose

`Ortaklarimiz` is the ownership command center for Eden ERP. It is not only a person/company list. It is the product surface where partner cards, current ownership, share/vote/profit/capital rights, privileges, control rights, documents and ownership transaction history meet.

## Scope

The module supports:

- partner card draft creation,
- card-safe identity/contact/profile updates,
- Initial Partnership Entry,
- Share Transfer,
- Partial Share Transfer,
- Ownership Exit,
- share ratio change,
- voting ratio change,
- profit ratio change,
- privilege/control right change,
- partner-level capital increase impact visibility,
- correction record,
- reversal record,
- current ownership summary,
- transaction-based ownership history,
- document/decision attachment context,
- pending ownership action and warning visibility.

Out of scope:

- company capital increase as the main official operation, which belongs to Companies/Capital,
- accounting collection/payment reconciliation,
- representative authority,
- master person/legal entity management outside the company-partner role,
- advanced securities/certificate modeling.

## User Roles

- partner viewer: can inspect partner cards and current ownership,
- partner card editor: can update card-safe profile/contact fields,
- ownership operator: can start ownership transactions,
- compliance/audit user: can inspect transaction history, documents and correction/reversal context,
- admin: can verify permissions, module readiness and temporary fallback removal.

## Page Structure

The current page structure is:

- list view with server-side pagination and ownership columns,
- draft create form with explicit draft notice,
- detail/edit form for card-safe fields,
- ownership product summary panel with card status, current ownership, total share warning, privilege/control flags and correct next actions,
- ownership operation actions,
- capital/current ownership tab,
- rights/representative authority tab,
- documents and history sections.

Target information architecture:

1. General / Card Information
2. Contact
3. Ownership Status
4. Rights / Privileges
5. Capital Impact
6. Documents
7. Ownership History
8. Audit Summary

## Card vs Ownership Rights

Partner card fields identify the person or organization and store profile/contact data.

Ownership rights are not card fields. The following are operation-controlled:

- share ratio,
- voting ratio,
- profit ratio,
- share units,
- nominal value,
- capital amount,
- committed capital,
- share class,
- privilege and control rights,
- beneficial ownership,
- start/end dates,
- status/record status,
- current ownership,
- ownership transaction history.

FastAPI partner card PATCH rejects these fields with `OPERATION_CONTROLLED_FIELDS`.

## Draft Behavior

`+ Ekle` creates a partner card draft.

Draft rules:

- draft card does not create share/vote/profit/capital rights,
- Initial Partnership Entry is the meaningful next action,
- Share Transfer and Ownership Exit are disabled or hidden until active ownership exists,
- clean drafts can be hard deleted,
- drafts with ownership history/current ownership/open process are not hard-deleted.

Business messages:

- clean draft delete: `Ortak karti taslagi kalici olarak silindi.`
- active/history delete block: `Ortaklik hakki veya islem gecmisi olan kayit dogrudan silinemez. Pay Devri veya Ortakliktan Cikis islemini kullanin.`

## Ownership Operations

Standard operation behavior:

- precheck before mutation,
- old values and new values visible,
- no-op changes rejected,
- document slots visible,
- summary and explicit confirmation,
- completion refreshes current ownership/list/detail,
- audit/outbox/transaction history created by backend where available.

Operations:

- Initial Partnership Entry,
- Share Transfer,
- Partial Share Transfer,
- Ownership Exit,
- Voting Right Change,
- Profit Ratio Change,
- Privilege / Control Right Change,
- Correction Record,
- Reversal Record.

## Current Ownership

The list and detail product panel read rights from current ownership/projection fields:

- `current_share_ratio`,
- `current_voting_ratio`,
- `current_profit_ratio`,
- `current_capital_amount`,
- `current_share_units`.

`record_status` is partner card lifecycle. It must not be confused with current ownership state.

If current ownership cannot be read, the UI should not crash. It shows a warning and ownership operations can return blocking precheck messages.

## Dependencies

- Companies must have an active company for ownership operations.
- Current ownership must be readable for share transfer, exit and capital impact checks.
- Capital Increase can affect current ownership but remains a Companies/Capital operation.
- Action Guide routes user intent to the correct ownership operation.
- Field Control Registry explains locked rights fields.
- Process/Outbox/Audit provide operational trace.

## API Contract

Canonical FastAPI endpoints:

- `GET /api/v1/partners`
- `POST /api/v1/partners`
- `GET /api/v1/partners/{partner_id}`
- `PATCH /api/v1/partners/{partner_id}`
- `DELETE /api/v1/partners/{partner_id}`
- `GET /api/v1/companies/{company_id}/current-ownership`
- `GET /api/v1/ownership/current`
- `POST /api/v1/ownership/transactions`
- `POST /api/v1/ownership/initial-partnership-entry`
- `POST /api/v1/ownership/share-transfer`
- `POST /api/v1/ownership/ownership-exit`

Next.js routes remain BFF/proxy compatibility routes with temporary fallbacks until staging verification.

## Acceptance Criteria

- `+ Ekle` clearly creates a draft partner card.
- Draft card does not show ownership rights as card-editable data.
- Ownership fields are locked in normal card edit.
- Initial Partnership Entry creates active ownership rights.
- Share Transfer and Ownership Exit are transaction flows, not card PATCH.
- Current ownership values feed the list and detail summary.
- Total share/vote/profit warnings are visible when read model data indicates mismatch.
- Capital increase effects are visible at partner level.
- Correction/reversal behavior is documented and routed through ownership operations.
- Technical backend errors are normalized into business-language messages.
- `npm run typecheck`, `npm run build`, backend lint/typecheck/tests pass.
