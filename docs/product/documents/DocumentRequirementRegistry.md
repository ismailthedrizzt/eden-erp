# Document Requirement Registry

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
