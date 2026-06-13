# Audit Coverage Matrix

<!-- source-of-truth-standard: contract overrides markdown -->

| module | event | audit exists? | old/new values? | masked? | user/tenant? | operation/process link? | UI visible? | priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Company | draft create | partial | partial | yes | yes | optional | yes | P1 DB fixture verification |
| Company | card update | partial | yes | yes | yes | optional | yes | P1 |
| Company | draft delete | partial | partial | yes | yes | optional | yes | P1 |
| Company | opening/title/address/public/NACE/activity | yes | yes | yes | yes | operation | yes | P1 staging E2E |
| Company | capital increase | yes | yes | yes | yes | operation/process optional | yes | P1 integration test |
| Company | liquidation/deregistration | partial | partial | yes | yes | operation | yes | P1 |
| Ownership | partner draft/card update | partial | partial | yes | yes | optional | yes | P1 |
| Ownership | initial entry/share transfer/exit/correction/reversal | yes | yes | yes | yes | operation | yes | P1 current ownership integration test |
| Representatives | draft/card update | partial | partial | yes | yes | optional | yes | P1 |
| Representatives | start/scope/limit/suspend/resume/terminate | yes | yes | yes | yes | operation | yes | P1 staging E2E |
| Branches | opening/card update/closing | yes | yes | yes | yes | operation | yes | P1 branch fixture E2E |
| Organization | unit create/update/position create | partial | partial | yes | yes | optional | yes | P1 |
| Organization | unit deactivate | missing | n/a | n/a | n/a | n/a | no | P1 |
| Facilities | facility create/update | partial | partial | yes | yes | optional | yes | P1 |
| Facilities | deactivate/reuse | missing | n/a | n/a | n/a | n/a | no | P1 |
| Process | process start/task complete/approval approve-reject/process complete-fail | partial | partial | yes | yes | process/task/approval | yes | P1 |
| Platform | permission/policy/scope denied | partial | yes | yes | yes | request | yes | P1 auth denial audit hardening |
| Platform | outbox failure/audit write failure/module setup actions | partial | partial | yes | yes | outbox/request | admin only | P2 |
| Export | audit report export | missing | n/a | n/a | user/tenant required | request | no | P1 |

Notes:

- UI eligibility checks must not create audit noise.
- Audit Admin UI displays what exists; missing coverage remains technical debt until DB-backed integration tests prove every action writes audit consistently.
