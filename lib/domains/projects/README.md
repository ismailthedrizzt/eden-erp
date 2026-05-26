# Project / Task Domain

Project Domain owns projects, work tasks and issue/work tracking.

It does not own Process Engine internal tasks. Process tasks are platform workflow tasks; project tasks are business execution work.

## Owns

- Projects
- Project tasks
- Issues/work tracking

## Does Not Own

- Process Engine tasks
- Official operation lifecycle
- Approval source-of-truth

## Service Functions

- Placeholder only in this phase.
- Future: `createProject`, `createTask`, `assignTask`, `closeTask`.

## Cross-Domain Rules

- Project tasks may be created from events or process outcomes.
- Project task completion must not directly change process approvals.

## Events

- `project.created`
- `project.task_created`
- `project.task_completed`

## Business Rules

- Project tasks are business work items; process tasks are platform workflow items.
