# Theme Token Editor

<!-- source-of-truth-standard: contract overrides markdown -->

## General

The editor separates theme identity from appearance mode.

- Theme: visual identity and component character.
- Appearance: light, dark or system display mode.

## Token Areas

- Light tokens: base, accent, status, radius, shadow, typography, density and icon tokens.
- Dark tokens: same contract as light; missing dark tokens block activation.
- Component tokens: shell, PageBanner, cards, forms, tables/smart lists, badges, wizard, interaction, shape, shadow, density and icon tokens.
- Motif tokens: motif type, placement, opacity, line width and usage flags.

## Mapping

The MVP maps Eden JSON token values to existing CSS variables such as:

- `--eden-bg`
- `--eden-surface`
- `--eden-border`
- `--eden-text`
- `--eden-accent`
- `--eden-nav-bg`
- `--eden-table-header-bg`
- `--eden-radius-card`
- `--eden-shadow-card`

Component token editing is stored with the theme record and exported as metadata until backend schema persistence is implemented.
