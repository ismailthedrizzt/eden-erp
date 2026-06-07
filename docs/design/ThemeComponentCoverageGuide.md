# Theme Component Coverage Guide

## Core Rule

Every shared component should derive visual decisions from `--eden-*` tokens. Layout, spacing and responsive behavior can remain Tailwind-driven.

## Required Coverage

- App shell: background, content, header, sidebar
- Cards: background, border, shadow, radius
- Buttons: primary, secondary, ghost, destructive, disabled, focus
- Forms: background, border, focus, helper/error text, disabled/read-only
- Tables: header, row, hover, selected, border, pagination
- Badges: neutral, success, warning, danger, info, lifecycle states
- Wizard: active/completed/blocked steps, warning panels, summary cards
- DocumentSlot: missing, loaded, verified, rejected, expired and duplicate states
- Action Center: priority, due date, related entity and action button states
- Audit Timeline: event icon, line, actor, timestamp, old/new comparisons
- Empty/Error State: container, warning panel and safe error copy
- Decorative Frame / Corner Art: dashboard hero corner motifs, featured card corner art, section header border accents, empty state decorative illustrations, wizard summary decorative frame and themed shell ornaments

## Migration Pattern

1. Keep component API stable.
2. Replace visual color classes with token styles or token-backed classnames.
3. Keep icon/text support for status; do not rely on color only.
4. Keep decorative motifs out of dense table rows, narrow inputs, accounting detail rows and audit row bodies.
5. Verify all five themes in light and dark.

## Motif Coverage Rule

Motifs are controlled by theme config, not one-off hardcoded illustrations:

- `motif.style`
- `motif.cornerType`
- `motif.illustrationType`
- `motif.opacity`
- `motif.lineWeight`
- `motif.useOnHero`
- `motif.useOnFeaturedCards`
- `motif.useOnEmptyStates`
- `motif.useOnSectionHeaders`

The default density target is 1-3 visible decorative focal points per screen.
