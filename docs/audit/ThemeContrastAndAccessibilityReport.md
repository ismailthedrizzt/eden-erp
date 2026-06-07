# Theme Contrast And Accessibility Report

Date: 2026-06-07

## Checks

Reviewed token pairs:

- body text on background
- card text on surface
- muted text on surface
- primary button text on accent
- input text/border/focus
- table header and row hover
- success/warning/danger/info badges
- dark-mode borders and surfaces
- focus ring visibility

## Results

| Theme | Mode | Result |
| --- | --- | --- |
| classic | light/dark | safe baseline; no P0 issue |
| art_deco | light/dark | premium contrast preserved; gold accent used with dark text where needed |
| anatolian_60s | light/dark | warm palette remains readable; copper focus visible |
| command_bauhaus | light/dark | strongest operational contrast; status colors remain distinct |
| pop_studio | light/dark | energetic accents limited to controlled surfaces; text remains neutral/cream |

## Fixes Included

- Primary button text token `--eden-accent-text`.
- Focus ring token `--eden-focus-ring` / `--eden-shadow-focus`.
- Status soft tokens for success, warning, danger and info.
- Dark-mode card/header/input/table variables per theme.
- Common hardcoded status utility bridge.

## Remaining Risks

- P1: some custom page-level status badges may still use hardcoded colors outside the bridge.
- P1: color-only status should continue to receive icon/text support in business components.
- P2: disabled states are covered globally but individual custom controls may require targeted QA.

