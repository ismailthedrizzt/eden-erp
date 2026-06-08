# Theme Component Binding Report

Date: 2026-06-08

## Bound Components

- `app/app/layout.tsx`: root theme attributes and runtime CSS vars.
- `components/design-lab/themeConcepts.ts`: canonical alias support and extended token export.
- `components/ui/PageBanner.tsx`: already exposes stable `.eden-page-banner-*` hooks.
- `components/ui/SmartDataTable.tsx`: already exposes stable `.eden-smart-list-*` hooks.
- `components/layout/Sidebar.tsx`: already consumes `--eden-nav-*` inline.
- `app/globals.css`: central token bridge for legacy Tailwind utility classes.

## Behavior

Theme selection now changes more than the navbar:

- app background shifts
- header surface shifts
- page banner shifts
- smart list toolbar/table/card shifts
- card borders and hover states shift
- form focus states shift
- badge/status colors shift into the theme family
- decorative corner art shifts by theme

## Compatibility

Existing preferences that store `command_bauhaus` continue to work. New or imported preferences that store `green_atelier` normalize to the same theme.
