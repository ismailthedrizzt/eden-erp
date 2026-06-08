# Theme Hardcoded Style Inventory

Date: 2026-06-08

## High Impact Items Addressed

- `bg-blue-*`, `text-blue-*`, `border-blue-*` in core/shared surfaces now bridge to `--eden-accent`, `--eden-info`, or banner/smart list tokens.
- `bg-gray-*`, `bg-slate-*`, `dark:bg-*`, `text-gray-*`, `text-slate-*`, `border-gray-*`, and `border-slate-*` are bridged for root themed screens.
- SmartDataTable toolbar, table, card, filter panel, pagination, chips and active controls are covered by `.eden-smart-list-*` selectors.
- PageBanner uses `.eden-page-banner-*` selectors and no longer depends on a default blue family.
- Dashed empty panels are mapped to themed card/accent surfaces.

## Remaining Debt

| Area | Example | Severity | Plan |
| --- | --- | --- | --- |
| SmartDataTable internal status tone constants | direct amber/emerald/slate/blue classes | P2 | Token bridge handles runtime; future refactor can replace class maps |
| Page-specific wizard/detail states | local Tailwind status colors | P2 | Migrate to badge/card token variants as pages are touched |
| Dashboard widget skeletons | local gray/blue utility classes | P2 | Covered by global bridge, component cleanup future |
| Some text labels | direct gray/slate text utilities | P2 | Covered by bridge, cleanup future |

The release-critical issue was not every hardcoded class; it was hardcoded classes escaping the theme family. The central bridge now keeps those surfaces inside the selected theme.
