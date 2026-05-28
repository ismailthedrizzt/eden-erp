# Process / Action Center Known Gaps

## P1

- Complex approval matrix and delegation rules need staging data validation.
- Task required-document/required-field blockers are not fully configurable yet.
- Operation retry policy is conservative; most retries remain disabled until idempotency is verified.
- Outbox retry/skip admin UI is still primarily system tooling.
- Process Center needs seeded E2E data and Playwright coverage.

## P2

- SLA/escalation rules for overdue tasks.
- Email, mobile push and Teams/Slack notification channels.
- Advanced process analytics and dashboards.
- Process designer UI for non-developer process definitions.
- Bulk task assignment and role queue management.
- Admin-only debug panel should be hidden by real permission checks in the UI layer.

## P3

- Kanban-style work queue.
- Calendar view for due dates.
- AI assisted task summary and next-best-action suggestions.
