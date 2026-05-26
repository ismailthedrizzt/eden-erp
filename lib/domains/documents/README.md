# Document Domain

Document Domain owns uploaded documents, entity document links, media assets and document lifecycle.

Business domains can require documents or publish document-related events, but raw upload/delete/versioning behavior belongs here. Signed URLs and sensitive storage details must not leak to audit or user-facing help text.

## Owns

- Documents
- Entity document links
- Media assets
- Upload lifecycle

## Does Not Own

- Official operation decision
- Branch lifecycle
- Representative authority mutation

## Service Functions

- Placeholder only in this phase.
- Future: `uploadDocument`, `deleteDocument`, `updateDocumentVersion`, `linkDocumentToEntity`.

## Cross-Domain Rules

- Business domains may reference documents; storage lifecycle belongs here.
- Raw signed URLs must not be written into audit or user-facing help text.

## Events

- `document.uploaded`
- `document.deleted`
- `document.version_updated`

## Business Rules

- Document update can be required by an operation, but document storage mechanics remain in Document Domain.
