# Central Theme Engine Architecture

Date: 2026-06-08

## Model

Theme is the visual identity layer. Appearance is the light/dark layer. They are stored and applied separately.

Runtime attributes:

```html
<html data-eden-theme="green_atelier" data-appearance="dark">
```

Compatibility attributes remain supported:

```html
<html data-visual-theme="command_bauhaus" data-appearance-mode="dark">
```

## Registry

The canonical registry facade is `lib/theme/themeRegistry.ts`.

Current selectable release themes:

| Canonical key | Internal compatibility id | Release label |
| --- | --- | --- |
| `classic` | `classic` | Klasik |
| `art_deco_premium` | `art_deco` | Art Deco Premium |
| `anatolian_60s` | `anatolian_60s` | Anadolu 60'lar |
| `green_atelier` | `command_bauhaus` | Yesil Atolye |
| `pop_studio` | `pop_studio` | Pop Studio |

`command_bauhaus`, `executive_premium`, `technical_command`, `green_atelier`, and related legacy ids are normalized so existing user preferences do not fall back to Classic.

## Token Flow

1. User selects theme and appearance.
2. `app/app/layout.tsx` resolves the internal theme definition.
3. `getEdenThemeCssVars()` emits the runtime CSS variable contract.
4. Root attributes and CSS variables are applied to `document.documentElement`.
5. Shared components consume `var(--eden-...)` tokens instead of fixed blue/slate defaults.

## Component Binding

The high-priority shared surfaces are bound through `app/globals.css`:

- shell, body and main background
- sidebar and nav items
- top header and header controls
- page banner and primary banner action
- cards and bordered panels
- SmartDataTable toolbar, filters, table, cards and pagination
- inputs, selects, textarea, focus rings
- badges and status colors
- dashed empty states
- decorative corner art and motif colors

New themes should add a single registry definition and satisfy `EDEN_REQUIRED_THEME_TOKENS` from `lib/theme/themeTokens.ts`.

## Release Rule

Release UI must show professional theme labels only. Design Lab, debug, concept, internal, and development language stays outside normal user navigation.
