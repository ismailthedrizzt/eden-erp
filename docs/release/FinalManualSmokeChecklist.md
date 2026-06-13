# Final Manual Smoke Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-05-29

Use this checklist before every pilot/demo release. Mark each item `pass`, `fail` or `blocked`; attach notes and screenshots when useful.

## Auth / Admin

| item | pass/fail | notes | blocker? |
| --- | --- | --- | --- |
| Login works with demo/admin user |  |  |  |
| Dashboard opens after login |  |  |  |
| Admin Console opens for system admin |  |  |  |
| Normal user cannot open system technical page |  |  |  |
| Module readiness page shows configured/setup-required modules |  |  |  |
| User role/permission page shows demo roles |  |  |  |

## Core Company Operations

| item | pass/fail | notes | blocker? |
| --- | --- | --- | --- |
| Company draft can be created |  |  |  |
| Active company detail opens |  |  |  |
| Locked official fields show helper/disabled reason |  |  |  |
| Address change wizard/precheck opens |  |  |  |
| Capital increase precheck blocks when requirements missing |  |  |  |
| Partner initial entry scenario opens |  |  |  |
| Representative authority scenario opens |  |  |  |
| Branch opening/closing scenario opens |  |  |  |

## Operational Work

| item | pass/fail | notes | blocker? |
| --- | --- | --- | --- |
| Action Center count/list works |  |  |  |
| Assigned task can be opened |  |  |  |
| Task status/action can be completed where allowed |  |  |  |
| Approval approve/reject screen works |  |  |  |
| Audit timeline opens for a record |  |  |  |
| Document upload/download/preview flow works in Development storage |  |  |  |
| Global Search opens with Ctrl+K/Cmd+K |  |  |  |
| Scope-hidden record does not appear in search |  |  |  |

## Business Modules

| item | pass/fail | notes | blocker? |
| --- | --- | --- | --- |
| Cari account list/detail works |  |  |  |
| Cari transaction list/detail works |  |  |  |
| Employee draft/detail/lifecycle screen works |  |  |  |
| SGK pending/manual completion scenario can be shown |  |  |  |
| Project/task list and Kanban can be shown |  |  |  |
| Product catalog and installed asset can be shown |  |  |  |
| Service request and service record can be shown |  |  |  |
| CRM stakeholder and master lookup can be shown |  |  |  |
| Reporting dashboard has non-empty KPI cards |  |  |  |

## System / Governance

| item | pass/fail | notes | blocker? |
| --- | --- | --- | --- |
| `/health` and `/api/v1/health` respond |  |  |  |
| Admin health dashboard shows backend/DB/storage/outbox status |  |  |  |
| Outbox failed event can be inspected by admin |  |  |  |
| Notification bell/panel shows demo notifications |  |  |  |
| Import template/list flow opens |  |  |  |
| Export job flow opens with permission warning/masking note |  |  |  |
| Data Quality dashboard shows duplicate/finding examples |  |  |  |
| Demo mode badge appears when `NEXT_PUBLIC_DEMO_MODE=true` |  |  |  |

## Release Verdict

| field | value |
| --- | --- |
| Smoke owner |  |
| Environment |  |
| Date/time |  |
| Overall result |  |
| P0 blockers found |  |
| P1 issues accepted |  |
| Release allowed? |  |

