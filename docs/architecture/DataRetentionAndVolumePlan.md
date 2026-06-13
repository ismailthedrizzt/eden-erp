# Data Retention And Volume Plan

<!-- source-of-truth-standard: contract overrides markdown -->

Audit, outbox, process and action center data will grow faster than card tables. This document defines the first volume strategy.

## Outbox Events

- `pending` and `processing` rows are active queue state.
- `failed` rows are retained until reviewed or replayed.
- `completed` rows can be archived after an agreed retention period.
- `retry_count`, `max_retries`, `locked_at` and `created_at` must remain indexed.
- Worker dashboards should track pending backlog, failed count and oldest pending age.

## Audit Logs

- Audit logs are not business history replacement, but they are compliance trace.
- Default posture is no hard delete.
- Long-term production should archive or partition by tenant/time according to customer plan.
- Query paths must stay indexed by tenant, company, entity, operation, process and user.

## Process Data

- Process instances and events remain part of workflow history.
- Completed processes can move to colder storage if volume becomes high.
- Open tasks and pending approvals stay hot and indexed by assignee/status/due date.

## Action Center

- MVP action center remains source-based and virtual.
- If source queries become expensive, introduce a materialized action item table fed by outbox/process events.
- Failed/stuck operation and outbox warnings should not require scanning entire history.

## Retention Debt

- Define customer-plan audit retention policy.
- Add archive jobs for completed outbox events.
- Add partition plan for audit logs before high-volume production onboarding.
