# Process / Action Center E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Action Center

- Action Center bell renders in the app header.
- Bell count reflects total open work.
- Panel opens and closes with click/outside click.
- Tabs filter all work, tasks, approvals, operations and warnings.
- Empty state says "Bekleyen isiniz yok" or category equivalent.
- Failed operation shows retry disabled reason when not retry-safe.
- Admin/system warning does not leak technical stack or SQL details to normal users.

## Process Center

- `/app/surecler` loads.
- Summary cards load from Action Center.
- Process list shows status, module, record, current step and update time.
- Task tab lists open/in-progress/overdue tasks.
- Approval tab lists pending approvals.
- Operation/warning tab lists failed/stuck operations and system warnings.

## Process Detail

- `/app/surecler/{id}` loads process detail.
- Hero shows process label, status, current step, source record and operation id.
- Step timeline renders process events or current step fallback.
- Tasks tab completes an open task.
- Tasks tab adds a comment.
- Approvals tab approves a pending approval with optional note.
- Approvals tab rejects with a decision note.
- Related record link opens the source record.
- History tab shows process events.
- Cancel action cancels an open process.

## Seed Data

- one active process instance
- one open task
- one overdue task
- one pending approval
- one failed operation request
- one failed outbox event for admin/system user
- one company or branch record linked to pending work

## Regression Guard

- Normal user cannot see technical outbox error body.
- Completed task cannot be completed again.
- Non-pending approval cannot be approved/rejected again.
- Process/task/approval endpoints preserve tenant scope.
- RecordPendingActionsPanel handles both FastAPI and legacy fallback envelopes.
