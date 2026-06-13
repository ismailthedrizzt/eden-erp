# Branch Known Gaps

<!-- source-of-truth-standard: contract overrides markdown -->

## P1

- Temporary Next BFF fallbacks for branch opening/closing and branch CRUD should be removed after staging E2E with production-like data.
- Branch detail representative authority summary needs staging fixtures for branch-scoped plus company-wide authority coverage.
- Branch closing impact policy for active representative authorities must be finalized as warning vs blocking.
- Company detail `branch_summary` should be verified after every branch opening/closing operation in E2E.

## P2

- Branch address change operation is not yet a dedicated product wizard.
- Branch document update operation is MVP-level; required document configuration and validation should be hardened.
- Facility multi-branch relationship decision remains open.
- Warehouse/stock/service/project impact integrations are not connected to branch closing.
- Official tax/SGK/government integrations are not implemented.
- Advanced map/coordinate support is deferred.

## P3

- Branch dashboard charts.
- GIS/map based branch exploration.
- Advanced facility utilization analytics.
