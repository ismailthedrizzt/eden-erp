# Document Requirement Registry

<!-- source-of-truth-standard: contract overrides markdown -->

Document requirements describe which contextual document slots should appear for a module, entity and operation.

Core fields:

- `module_key`
- `entity_type`
- `operation_key`
- `document_type`
- `required`
- `condition_json`
- `accepted_file_types`
- `max_file_size`
- `expiry_required`
- `verification_required`

The backend returns table-backed requirements when available and merges in default requirements from `backend/app/domains/documents/requirements.py`.

Examples:

- Company opening: trade registry gazette, signature circular, tax certificate.
- Capital increase: capital increase resolution and registry document.
- Share transfer: share transfer agreement.
- Representative authority: power of attorney, signature authority, bank authority document.
- Employment start: identity document, SGK entry, signed contract.
- Service record: service photo and service report.
# Document Requirement Registry

Date: 2026-06-06

## Model

Requirement fields:

- `module_key`
- `entity_type`
- `operation_key`
- `document_slot_key`
- `document_type`
- `label`
- `required`
- `condition_json`
- `accepted_file_types`
- `max_file_size`
- `expiry_required`
- `verification_required`
- `active`
- `description`

## Default Coverage

- Company opening: trade registry required; signature circular and tax certificate recommended.
- Capital increase/decrease: resolution and registry evidence; payment evidence optional for increase.
- Initial partnership and share transfer: partnership entry/share transfer agreement.
- Representative authority: power of attorney, signature authority, bank authority, limit change document.
- Branch opening/closing: opening decision, registry gazette, lease/usage document, closing document.
- Employment start/exit: identity, SGK entry, employment contract, SGK exit.
- Service record: service photo optional, service report required when completed.
- Contract lifecycle: signed contract, amendment, termination notice.
