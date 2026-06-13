# Identity Model

Eden ERP separates master identity from module-specific role records.

## Master Tables

- `persons`
- `organizations`

## Role Tables

Examples:

- `employees`
- `sirketler`
- `sirket_ortaklar`
- `sirket_temsilciler`
- `stakeholders`

Role records should reference master identity with:

- `person_id`
- `organization_id`

## Backend Rule

Frontend identity checks are UX guards. Backend create/update endpoints must still enforce:

- master uniqueness
- duplicate role prevention
- permission checks
- optimistic locking
- audit/history logging
- soft delete semantics

Create operations that touch master + role data should be transactional.
