# Theme System Fix Report

Date: 2026-06-07

## Summary

The selectable theme system now operates as a root-level visual identity layer. It is no longer limited to header/navbar color changes. The shell, sidebar, header, cards, buttons, badges, tables, KPI cards, form controls and common status surfaces are connected to `--eden-*` variables.

## Is Only The Navbar Changing?

No. The runtime now updates an expanded token set on the root element and global CSS consumes those variables across shared/core UI surfaces.

## Components Connected

- App shell body/background/content
- Header
- Sidebar and navigation items
- Cards and KPI cards
- Buttons
- Inputs/selects/textareas through global bridge and shared form control classes
- Tables and table hover/selected states
- Badges and status colors
- Common alert/status color utilities
- Modal/card shadows through shared shadow bridge
- Icon container/module/status token variables
- Decorative motif token variables and Design Lab preview surfaces

## Theme Tokens

Each theme has separate `light` and `dark` runtime token sets:

- `classic`
- `art_deco`
- `anatolian_60s`
- `command_bauhaus`
- `pop_studio`

## Visual Separation

The themes are now intentionally differentiated:

- Classic is the safe reference baseline.
- Art Deco Premium uses ivory, graphite/navy, muted gold and thin geometric corner frames.
- Anadolu Modern uses stone, cream, petrol blue, copper and a controlled retro sun motif.
- Yeşil Atölye uses deep green, warm neutral surfaces and flat botanical linework.
- Pop Studio uses controlled graphic accents, dots/blocks and warm neutral surfaces.

## Decorative Frame Coverage

- Theme config now includes motif style, corner type, illustration type, opacity, line weight and usage flags.
- Design Lab shows hero corner art, featured card border, section header accent and empty state motif previews.
- Production token export includes `--eden-motif-opacity`, `--eden-motif-line-width` and `--eden-motif-corner-size`.
- Motif usage remains decorative and should avoid dense tables, narrow inputs, accounting detail rows and audit row bodies.

## Remaining Debt

Hardcoded colors remain in many page-level components. The new token bridge reduces visible mismatch in shared/core UI, but complete cleanup still requires page-by-page replacement of Tailwind color decisions with semantic token utilities.

## Release Safety

Theme labels are release-safe. Design Lab and concept/debug language remain development/internal surface area and must stay guarded by route/license visibility.
