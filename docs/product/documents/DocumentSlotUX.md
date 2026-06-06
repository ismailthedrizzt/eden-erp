# Document Slot UX

Document slots are contextual. A user uploads a file from the card or wizard where the document is needed.

## Slot Props

- `entityType`
- `entityId`
- `moduleKey`
- `operationKey`
- `operationId`
- `documentSlotKey`
- `documentType`
- `required`
- `relationType`
- `readOnly`

## Behavior

- Missing required slots show an explicit missing state.
- Uploaded documents show preview/download actions.
- Duplicate reuse shows a small informational notice.
- Duplicate type conflict shows a warning notice.
- The user is not asked to browse the central document pool.

Central Documents is an audit/search/management surface, not the normal upload entry point.
