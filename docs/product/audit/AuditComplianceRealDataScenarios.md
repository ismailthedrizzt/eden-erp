# Audit Compliance Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Company Address Change Audit

1. Active company address change is completed.
2. Audit log is written with `operation_id`.
3. Old/new address values appear masked/labelled.
4. Audit detail links to operation/process when available.

## Scenario 2 - Representative Authority Audit

1. Representation is started with scope and limits.
2. Audit shows actor, scope type, limits and result.
3. Raw document URLs are not exposed.

## Scenario 3 - Ownership Share Transfer Audit

1. Share transfer is completed.
2. Audit shows old/new ownership values.
3. Related ownership transaction/operation is visible.

## Scenario 4 - Permission Denied Audit

1. Unauthorized user attempts a real API action.
2. API returns permission denied.
3. Audit record appears as `permission_denied`.
4. UI eligibility checks do not write audit.

## Scenario 5 - Process Approval Audit

1. Approval is approved or rejected.
2. Audit shows approver, decision note summary and process id.
3. Process detail can filter by `process_instance_id`.

## Scenario 6 - Export Audit

1. Authorized admin exports an audit report.
2. Export event is audited separately.
3. Sensitive values remain masked.

## Scenario 7 - Record Timeline

1. Branch detail opens Denetim Izi tab/panel.
2. Branch opening, card update and closing audit records appear.
3. Detail drawer shows masked old/new values.
