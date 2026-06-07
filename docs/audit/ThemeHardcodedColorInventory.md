# Theme Hardcoded Color Inventory

Date: 2026-06-07

## Inventory Method

Target patterns:

- `bg-white`, `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- `text-gray-*`, `text-slate-*`, `text-zinc-*`
- `border-gray-*`, `border-slate-*`
- status colors such as `blue`, `emerald`, `amber`, `red`
- `dark:bg-*`, `dark:text-*`, `dark:border-*`
- `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-2xl`

## High-Risk Shared/Core Areas

- `app/app/layout.tsx`
- `components/layout/Sidebar.tsx`
- `components/ui/formControlStyles.ts`
- `components/ui/DataTable.tsx`
- `components/ui/SmartDataTable.tsx`
- `components/ui/DocumentSlotUploader.tsx`
- `components/action-center/*`
- `components/audit/*`
- wizard components under `components/ui/*Wizard*.tsx`

## Mitigation Added

Global token bridge selectors now map common hardcoded utility classes to semantic theme variables when `html[data-eden-theme]` is present.

Examples:

- `bg-white` -> `--eden-card-bg`
- `bg-gray-100` -> `--eden-surface-muted`
- `text-gray-900` -> `--eden-text`
- `text-gray-500` -> `--eden-text-soft`
- `border-gray-200` -> `--eden-border`
- `bg-emerald-50` -> `--eden-success-soft`
- `bg-amber-50` -> `--eden-warning-soft`
- `bg-red-50` -> `--eden-danger-soft`
- common shadow utilities -> token shadows

## Remaining Work

The bridge is a stabilization layer, not a complete cleanup. Page-level classes should gradually be replaced with semantic component APIs or token-backed utility classes.

Severity:

- P1: feature pages with custom status colors can still feel less art-directed.
- P2: development-only previews may retain local mock-specific colors.

