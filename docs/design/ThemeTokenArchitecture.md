# Theme Token Architecture

## Principle

Theme is visual identity. Appearance is light/dark mode. They are separate preferences and must not share one state variable.

Runtime root model:

```html
<html data-eden-theme="art_deco" data-appearance="light">
```

Legacy compatibility attributes are also kept:

```html
<html data-visual-theme="art_deco" data-appearance-mode="light">
```

## Minimum Runtime Tokens

Color:

- `--eden-bg`
- `--eden-bg-subtle`
- `--eden-surface`
- `--eden-surface-muted`
- `--eden-surface-raised`
- `--eden-surface-inset`
- `--eden-border`
- `--eden-border-strong`
- `--eden-text`
- `--eden-text-muted`
- `--eden-text-soft`
- `--eden-accent`
- `--eden-accent-hover`
- `--eden-accent-soft`
- `--eden-accent-text`
- `--eden-accent-warm`
- `--eden-success`
- `--eden-success-soft`
- `--eden-warning`
- `--eden-warning-soft`
- `--eden-danger`
- `--eden-danger-soft`
- `--eden-info`
- `--eden-info-soft`

Navigation:

- `--eden-nav-bg`
- `--eden-nav-text`
- `--eden-nav-muted`
- `--eden-nav-active-bg`
- `--eden-nav-active-text`
- `--eden-nav-hover-bg`
- `--eden-header-bg`
- `--eden-header-border`

Components:

- `--eden-card-bg`
- `--eden-card-border`
- `--eden-card-shadow`
- `--eden-input-bg`
- `--eden-input-border`
- `--eden-input-focus`
- `--eden-table-header-bg`
- `--eden-table-row-hover`
- `--eden-table-row-selected`
- `--eden-badge-bg`
- `--eden-focus-ring`
- `--eden-alert-bg`
- `--eden-alert-border`
- `--eden-page-banner-bg`
- `--eden-page-banner-text`
- `--eden-page-banner-muted`
- `--eden-page-banner-accent`
- `--eden-page-banner-border`
- `--eden-page-banner-shadow`
- `--eden-card-hover-bg`
- `--eden-input-placeholder`
- `--eden-input-disabled-bg`
- `--eden-table-header-text`
- `--eden-table-border`
- `--eden-smart-list-bg`
- `--eden-smart-list-border`
- `--eden-smart-list-hover`
- `--eden-badge-neutral-bg`
- `--eden-badge-neutral-text`
- `--eden-badge-success-bg`
- `--eden-badge-success-text`
- `--eden-badge-warning-bg`
- `--eden-badge-warning-text`
- `--eden-badge-danger-bg`
- `--eden-badge-danger-text`
- `--eden-badge-info-bg`
- `--eden-badge-info-text`
- `--eden-hover-overlay`
- `--eden-selected-overlay`
- `--eden-motif-primary`
- `--eden-motif-secondary`
- `--eden-motif-warm`
- `--eden-motif-opacity`
- `--eden-motif-line`
- `--eden-corner-art-bg`
- `--eden-corner-art-border`

The executable token list lives in `lib/theme/themeTokens.ts`.

Shape, density and icon:

- `--eden-radius-*`
- `--eden-shadow-*`
- `--eden-table-row-height`
- `--eden-form-field-height`
- `--eden-card-padding`
- `--eden-section-gap`
- `--eden-icon-stroke`
- `--eden-icon-container-bg`
- `--eden-icon-container-border`
- `--eden-module-icon-bg`
- `--eden-status-icon-bg`

Motif and decorative frame:

- `--eden-motif-opacity`
- `--eden-motif-line-width`
- `--eden-motif-corner-size`

Theme config also owns non-CSS motif metadata:

- `motif.style`
- `motif.cornerType`
- `motif.illustrationType`
- `motif.useOnHero`
- `motif.useOnFeaturedCards`
- `motif.useOnEmptyStates`
- `motif.useOnSectionHeaders`

## Component Rule

Shared/core components should consume semantic tokens. Tailwind layout utilities are acceptable; Tailwind color decisions should be avoided or bridged.

Decorative motifs are opt-in surface language. They may be used on hero, section header, featured card, empty state and wizard summary surfaces, but must not appear in dense table rows, narrow input interiors or critical transactional detail lines.
