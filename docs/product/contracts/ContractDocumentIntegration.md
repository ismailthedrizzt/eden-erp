# Contract Document Integration

<!-- source-of-truth-standard: contract overrides markdown -->


Date: 2026-06-06
Branch: main
Commit before work: 56bbffb
Environment: remote server, Next.js UI/BFF, FastAPI canonical backend, local PostgreSQL DB, local document storage.
Release status: Contract Management pages are registered as development; legacy /app/satis/sozlesmeler redirects to /app/sozlesmeler and is hidden.


## Model
No `contract_documents` table was added. Contract files are documents with relations:
- `document_relations.entity_type = contract`
- `document_relations.entity_id = contracts.id`
- `document_relations.relation_type = contract_document`

## Slots
- `contract.draft_contract`
- `contract.signed_contract` required for activation precheck
- `contract.amendment`
- `contract.termination_notice`
- `contract.guarantee_letter`

## Duplicate Reuse
The implementation relies on the existing Document Management checksum reuse flow. Same tenant duplicate files are not physically written again; a new relation is created for the contract context.
