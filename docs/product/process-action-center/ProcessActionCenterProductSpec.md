# Process Center + Action Center Product Spec

## Purpose

Process Center and Action Center are Eden ERP's daily work hub. They answer:

- What should I do today?
- Which tasks are assigned to me?
- Which approvals are waiting for a decision?
- Which operation failed or is stuck?
- Which record has pending work or warnings?

Action Center is not a technical notification feed. It converts process tasks, approvals,
failed operations, system updates and integrity warnings into business-language work items.

## Scope

Productized capabilities:

- open process list
- process detail with current step, tasks, approvals and event timeline
- my/open task list
- pending approval list
- task completion
- task comments
- approve/reject decisions with note
- process cancellation
- failed/stuck operation visibility
- admin/system warning visibility
- record pending actions panel for company and branch detail surfaces

First hardened process families:

- branch opening
- branch closing
- capital increase
- representative authority
- ownership transactions

## Concepts

- Process instance: business workflow state and step timeline.
- Task: a user or role action required to move a process forward.
- Approval: a decision gate for an operation/process.
- Operation request: the actual business data mutation boundary.
- Outbox event: background system update; technical detail is admin-only.
- Action item: normalized business-language work item shown to the user.

## UI Structure

Action Center bell:

- total open count
- urgent/error badge
- tabs for all work, tasks, approvals, failed operations and warnings
- compact action item cards

Process Center page:

- summary cards
- status/module/assigned filters
- tabs: overview, processes, tasks, approvals, operation/warnings
- source links into process detail or source record

Process detail page:

- hero with status, current step, source record and operation id
- tabs: summary, steps, tasks, approvals, related record, history, debug
- task complete/comment actions
- approval approve/reject actions
- cancellation action for open processes

## Source Normalization

UnifiedActionItem fields:

- id
- source_type
- source_id
- title
- description
- status
- severity
- priority
- module_key
- company_id
- branch_id
- entity_type
- entity_id
- record_label
- due_at
- created_at
- target_page
- suggested_actions

Source labels shown to users:

- process_task: Gorev
- approval: Onay
- operation: Tamamlanamayan islem
- outbox: Sistem guncellemesi
- integrity_warning: Dikkat gerektiren durum
- module_readiness: Kurulum uyarisi

## Permissions

- Viewing tasks/processes follows normal module visibility permissions.
- Task mutation requires edit/operation permissions.
- Approval decisions require the relevant approver role/permission.
- Outbox/system technical detail is shown only to admin/system users.

## API Endpoints

- GET /api/v1/processes
- POST /api/v1/processes
- GET /api/v1/processes/{process_id}
- POST /api/v1/processes/{process_id}/steps/{step_key}/complete
- POST /api/v1/processes/{process_id}/cancel
- GET /api/v1/tasks
- GET /api/v1/tasks/{task_id}
- POST /api/v1/tasks/{task_id}/complete
- POST /api/v1/tasks/{task_id}/assign
- POST /api/v1/tasks/{task_id}/comment
- GET /api/v1/approvals
- POST /api/v1/approvals/{approval_id}/approve
- POST /api/v1/approvals/{approval_id}/reject
- GET /api/v1/action-center
- GET /api/v1/action-center/counts
- GET /api/v1/action-center/summary
- GET /api/v1/action-center/by-record

## Acceptance Criteria

- Action Center shows tasks, approvals, failed operations and warnings in business language.
- Process Center no longer shows placeholder-only content.
- Process detail shows current step, tasks, approvals and history.
- Task completion and approval decisions work through FastAPI/Next proxy.
- Record pending actions panels read normalized Action Center items.
- Technical outbox details are not leaked to normal users.
