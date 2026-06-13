# Document Slot UX

<!-- source-of-truth-standard: contract overrides markdown -->

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
# Document Slot UX

Date: 2026-06-06

## Principle

`DocumentSlot` is contextual upload. It is not a "select existing central document" picker.

## Props

- `entityType`
- `entityId`
- `moduleKey`
- `operationKey`
- `operationId`
- `documentSlotKey`
- `documentType`
- `required`
- `relationType`
- `allowMultiple`
- `readOnly`
- `onUploaded`

## Behavior

- Requirements create slots.
- Existing linked documents load by entity.
- Upload happens in the same screen/wizard.
- Duplicate reuse is shown with a simple notice.
- Technical terms are hidden.
- Missing, uploaded, verified, rejected and expired states use badges.

## Wizard Rule

Lifecycle wizard document steps should use `DocumentRequirementList` and `DocumentSlot`. Operation documents attach with operation draft id when available and finalize with the operation.
