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
# Theme Contrast And Accessibility Report

Date: 2026-06-08

## Current Status

The central theme engine now exposes explicit text, muted text, banner text, badge text and focus tokens for each theme/mode. The CSS bridge also maps focus-visible states to `--eden-shadow-focus`.

## Smoke Findings

| Theme | Area | Severity | Status |
| --- | --- | --- | --- |
| Classic | Header/sidebar/card/table | P0 | No known critical issue |
| Art Deco Premium | Gold accents on dark | P1 | Kept as accent, not body text |
| Anadolu 60'lar | Warm badge tones | P1 | Soft status backgrounds with colored text |
| Green Atelier | Dark header and cards | P0 | Moved to forest/sage token family |
| Pop Studio | Magenta accents | P1 | Accent-heavy areas constrained to banner/action/badges |

## Requirements

- Banner text uses `--eden-page-banner-text`.
- Normal text uses `--eden-text`.
- Muted text uses `--eden-text-muted` or `--eden-text-soft`.
- Primary action text uses `--eden-accent-text`.
- Focus ring uses `--eden-shadow-focus`.
- Status badges use status text plus soft background, not color alone.

## Remaining Risk

Some deeply nested feature pages still contain local Tailwind status colors. They are bridged at runtime, but component-level replacement remains a P2 cleanup item.
