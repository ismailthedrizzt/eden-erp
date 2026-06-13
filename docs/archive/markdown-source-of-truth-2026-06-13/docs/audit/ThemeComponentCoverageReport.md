# Theme Component Coverage Report

Date: 2026-06-07

## Covered By Runtime Tokens

| Area | Coverage |
| --- | --- |
| App shell | `--eden-bg`, `--eden-text` |
| Header | `--eden-header-bg`, `--eden-header-border` |
| Sidebar | `--eden-nav-*` |
| Cards | `--eden-card-bg`, `--eden-card-border`, `--eden-card-shadow`, radius |
| Buttons | `--eden-accent`, hover, text, border |
| Forms | input background, border, focus, field height |
| Tables | header, hover, selected, row height |
| Badges | neutral/success/warning/danger/info soft colors |
| Alerts | alert background and border |
| Icons | icon container/module/status token variables |
| Shadows | subtle/card/floating/focus token variables |

## Design Lab Coverage

Design Lab includes representative previews:

- Dashboard Preview
- List/Table Preview
- Form Preview
- Wizard Preview
- Document Slot Preview
- Action Center Preview
- Audit Timeline Preview
- Icon Language Preview
- Empty/Error State Preview

It now supports light/dark preview for each of the five system themes.

## Smoke Matrix

Required smoke matrix:

- `classic` light/dark
- `art_deco` light/dark
- `anatolian_60s` light/dark
- `command_bauhaus` light/dark
- `pop_studio` light/dark

## Remaining Gaps

- Some page-level tables and wizard states still declare direct Tailwind status colors.
- Full page screenshot automation is still future work.
- Imported themes can be previewed, but activation workflow remains admin-controlled as documented in the theme package docs.

