# User Selectable Theme Architecture

<!-- source-of-truth-standard: contract overrides markdown -->

## Scope

Visual theme is a user preference, not a development-only demo state. It controls the visual identity of the application. Appearance controls light, dark or system mode. These two preferences must stay separate.

## Canonical Concepts

Theme:

| Label | Canonical key | Legacy key |
| --- | --- | --- |
| Klasik | `classic` | `classicCurrent` |
| Art Deco Premium | `art_deco` | `executivePremium`, `executive_premium` |
| Anadolu Modern | `anatolian_60s` | `anatolianModern`, `anatolian_modern` |
| Yeşil Atölye | `command_bauhaus` | `technicalCommand`, `technical_command` |
| Pop Studio | `pop_studio` | - |

Appearance:

| Label | Canonical key |
| --- | --- |
| Sistem | `system` |
| Aydinlik | `light` |
| Karanlik | `dark` |

## Runtime Flow

1. Root layout reads cached `eden.uiPreferences` for first render.
2. App shell reads `/api/user/preferences`.
3. Next BFF proxies to FastAPI `/api/v1/onboarding/preferences`.
4. FastAPI persists in `public.user_workspace_state.ui_preferences`.
5. UI cache is refreshed in `localStorage` after server response.

DB/user preference wins after login. `localStorage` keys are only cache and migration fallback:

- `eden.uiPreferences`
- `eden.visualTheme`
- legacy `eden.designLab.activeTheme`
- legacy `theme`

## Profile Menu UX

Theme and appearance preferences live in the profile dropdown opened from the top-right user profile button. The profile button uses `aria-label="Profil ve tercihleri ac"` and keeps user identity, theme and appearance in one compact preference surface.

Inside the dropdown, `Tema` and `Gorunum` are separate menu items. Each item opens its choices to the left of the dropdown on desktop; narrow screens fall back to an in-menu/downward panel to avoid overflow. The profile button does not show the theme name. The nested option lists show professional labels and the selected state.

## Release Rules

Design Lab remains a development/internal route. Release users may use the theme selector, but they must not see Design Lab, concept, experimental, development or internal copy in production UI.

## Token Application

Theme config is centralized in `components/design-lab/themeConcepts.ts`. It exports canonical theme ids, migration aliases, labels and root CSS variable helpers. App shell applies:

- `data-visual-theme`
- `data-appearance-mode`
- minimum `--eden-*` tokens

Existing Tailwind hardcoded colors remain a migration debt and are tracked in the audit reports.

## Decorative Motif Model

Visual themes carry a decorative motif profile in addition to color, shape, shadow, density and icon tokens. Motif config is centralized with the theme:

- `motif.style`
- `motif.cornerType`
- `motif.illustrationType`
- `motif.opacity`
- `motif.lineWeight`
- `motif.useOnHero`
- `motif.useOnFeaturedCards`
- `motif.useOnEmptyStates`
- `motif.useOnSectionHeaders`

Motifs are decorative only. They may support hero, section header, featured card, empty state and wizard summary surfaces, but they must not appear inside dense table rows, narrow input interiors or critical accounting detail lines.
