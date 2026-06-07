# Art-Directed Theme System Fix Audit

Date: 2026-06-07

## Scope

This audit covers the selectable visual theme system after the art-directed token fix. It is not a new business module. The goal is to move Eden ERP themes from a header/navbar color change into a root-level visual identity system.

## Runtime Model

- Theme is applied on the root html element.
- Runtime attributes:
  - `data-visual-theme`
  - `data-appearance-mode`
  - `data-eden-theme`
  - `data-appearance`
- Appearance remains separate from theme: `light` and `dark` choose the mode token set; theme chooses the visual identity family.

## Themes

System themes:

| Key | Release label | Direction |
| --- | --- | --- |
| `classic` | Klasik | neutral SaaS baseline |
| `art_deco` | Art Deco Premium | premium executive Art Deco |
| `anatolian_60s` | Anadolu Modern | warm mid-century Anatolian modern |
| `command_bauhaus` | Yeşil Atölye | green atelier and botanical workshop calm |
| `pop_studio` | Pop Studio | controlled Pop Art studio energy |

Legacy preference keys are mapped:

- `executive_premium` -> `art_deco`
- `anatolian_modern` -> `anatolian_60s`
- `technical_command` -> `command_bauhaus`
- old camelCase design-lab keys map to the same new keys.

## Findings

- Before this fix, most themes shared a global dark palette and only `technical_command` had a distinct dark character.
- Header/sidebar were visibly affected, but many cards, forms, tables, badges, status panels, document slots, action center and audit surfaces still depended on hardcoded Tailwind colors.
- Design Lab already had real comparison preview categories, but it previewed the selected theme mostly in one appearance.
- Release theme labels are professional; Design Lab language is limited to development/internal routes.

## Remediation Implemented

- Added five art-directed theme identities with independent light/dark token sets.
- Expanded runtime CSS variables beyond the initial minimum.
- Added token bridge selectors for common shared/core Tailwind color utilities.
- Bound root attributes to the recommended `data-eden-theme` and `data-appearance` model.
- Added Design Lab light/dark preview control for 5 x 2 comparison.
- Updated CSS variable export for system themes to emit the full runtime token set.

## Risks

- P0: none identified after token bridge; navigation and primary actions retain contrast.
- P1: individual feature pages still contain hardcoded Tailwind colors; bridge covers common cases but not every custom state.
- P2: Design Lab uses representative previews and shared component samples; it is not yet a full screenshot diff suite.
