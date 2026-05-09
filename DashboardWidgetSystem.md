# Dashboard Widget System

The ERP dashboard widget system is a reusable module-agnostic layer for compact operational summaries above SmartLists and module pages.

Core components:

- `DashboardGrid`
- `DashboardWidgetShell`
- `KPIWidget`
- `StackedBarWidget`
- `DistributionWidget`
- `TrendWidget`
- `ActionListWidget`

Widgets are driven by config objects. They do not know about employees, companies, accounting, vehicles, or any future module.

Grid sizing:

- Desktop: 12 columns
- Tablet: 6 columns
- Mobile: 1 stacked column

Each widget declares:

- `size.w`
- `size.h`
- optional `minWidth`
- optional `minHeight`

The current implementation uses fixed configurable layouts. The config shape is ready for future drag and drop, resizing, saved layouts, role-based layouts, and module-specific dashboards.

`StackedBarWidget` renders one compact 100% horizontal bar. Segments are normalized when values do not sum to 100, support hover tooltips, and emit generic filter events through `onSegmentClick`.

Permission behavior:

- Widgets can define `permissions`.
- `DashboardGrid` hides unauthorized widgets by default.
- It can also show a limited placeholder through `unauthorizedMode="placeholder"`.

Backend integration contract:

- `GET /api/dashboard/{module}/summary`
- `GET /api/dashboard/{module}/widgets/{widgetId}`

The first implementation uses local employee-derived mock data on the page while keeping the API contract ready for backend-driven summaries.
