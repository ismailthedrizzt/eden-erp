# Master Data Governance

<!-- source-of-truth-standard: contract overrides markdown -->

## Principle

Master data governance in Eden ERP prevents silent data drift. Duplicate candidates are detected, reviewed and audited before any merge action. Official or transaction-producing records are protected from automatic merge.

## Canonical Responsibilities

CRM master data owns normal CRUD for:

- `master_persons`
- `master_organizations`
- `crm_stakeholders`

Data Quality owns:

- quality rules
- quality scores
- duplicate candidate groups
- merge operation records
- findings and review state

Accounting, HR, Partners, Representatives, Documents and After-Sales keep domain ownership of their own records.

## Merge Policy

Allowed MVP merge targets:

- master person
- master organization
- stakeholder
- duplicate document metadata

Blocked by default:

- official company records
- ownership transactions
- authority transactions
- confirmed accounting transactions
- active employment records
- audit logs

Blocked records require link correction, domain cleanup operation or official wizard.

## Audit

Merge audit must include:

- source ids
- target id
- selected fields
- relation impact
- user id
- timestamp
- reason
- request id when available

Signed URLs, raw storage links and sensitive identity values must not be written into general-purpose logs.

## Import Relationship

Import may surface duplicate warnings and existing master suggestions, but import does not merge existing records or mutate operation-controlled fields.

