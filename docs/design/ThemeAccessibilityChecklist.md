# Theme Accessibility Checklist

Run this checklist for every visual theme and appearance combination.

## Matrix

- `classic` + light/dark
- `executive_premium` + light/dark
- `anatolian_modern` + light/dark
- `technical_command` + light/dark

## Components

- Header
- Sidebar
- Table row
- Primary and secondary button
- Input and select
- Status badge
- Warning/error panel
- Document slot
- Action Center item
- Wizard stepper
- Audit timeline
- Disabled/locked field

## Checks

- Text contrast is readable.
- Success, warning, danger and info are distinguishable.
- Borders remain visible in dark mode.
- Cards are not too faint in light mode.
- Focus ring is visible.
- Disabled state is understandable.
- Status is not communicated by color alone.

## Severity

- P0: login, main navigation or primary action becomes unreadable.
- P1: status badge, warning/error or focus state has weak contrast.
- P2: minor hover/border/density issue that does not block use.
