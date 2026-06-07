import {
  findThemeConcept,
  getEdenThemeCssVars,
  themeConcepts,
  type ThemeConcept,
  type ThemeConceptId,
} from '@/components/design-lab/themeConcepts'
import { THEME_SCHEMA_VERSION, type EdenThemePackage, type ThemeModeTokens } from './themeSchema'

type TokenStudioNode = {
  value?: string | number | boolean
  type?: string
  [key: string]: TokenStudioNode | string | number | boolean | undefined
}

export function listSystemThemeKeys() {
  return themeConcepts.map(theme => theme.id)
}

export function buildEdenThemePackage(themeKey: string): EdenThemePackage | null {
  const theme = themeConcepts.find(item => item.id === themeKey)
  if (!theme) return null

  return themeConceptToEdenTheme(theme)
}

export function themeConceptToEdenTheme(theme: ThemeConcept): EdenThemePackage {
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    themeKey: theme.id,
    displayName: theme.name,
    description: theme.description,
    author: 'EDEN Teknoloji',
    version: '1.0.0',
    compatibleApp: 'eden-erp',
    tokens: {
      light: themeConceptToModeTokens(theme, 'light'),
      dark: themeConceptToModeTokens(theme, 'dark'),
    },
    metadata: {
      personality: theme.personality,
      bestFor: theme.bestFor,
      decorativeMotif: theme.motif,
      createdAt: '2026-06-07',
      source: 'eden_export',
    },
  }
}

export function themeConceptToModeTokens(theme: ThemeConcept, appearance: 'light' | 'dark'): ThemeModeTokens {
  const vars = getEdenThemeCssVars(theme, appearance)
  const density = theme.density

  return {
    color: {
      background: vars['--eden-bg'],
      foreground: vars['--eden-text'],
      surface: vars['--eden-surface'],
      surfaceMuted: vars['--eden-surface-muted'],
      surfaceRaised: vars['--eden-surface-raised'],
      border: vars['--eden-border'],
      borderStrong: vars['--eden-border-strong'],
      text: {
        primary: vars['--eden-text'],
        secondary: vars['--eden-text-muted'],
        muted: vars['--eden-text-soft'] || vars['--eden-text-muted'],
      },
      accent: {
        primary: vars['--eden-accent'],
        secondary: vars['--eden-info'] || theme.colors.accentSecondary,
        soft: vars['--eden-accent-soft'],
      },
      success: vars['--eden-success'],
      warning: vars['--eden-warning'],
      danger: vars['--eden-danger'],
      info: vars['--eden-info'],
    },
    radius: {
      small: theme.radius.radiusSmall,
      medium: theme.radius.radiusMedium,
      large: theme.radius.radiusLarge,
      card: vars['--eden-radius-card'],
      input: theme.radius.inputRadius,
      button: theme.radius.radiusMedium,
    },
    shadow: {
      subtle: theme.shadows.shadowSubtle,
      card: vars['--eden-shadow-card'],
      floating: theme.shadows.shadowFloating,
      focus: theme.shadows.shadowFocus,
    },
    typography: {
      fontFamily: 'system-ui, ui-sans-serif, sans-serif',
      headingWeight: 600,
      bodyWeight: 400,
      labelWeight: 600,
      scale: density,
    },
    density: {
      table: density,
      form: density,
      dashboard: density,
    },
    icon: {
      strokeWidth: theme.iconStyle.strokeWidth,
      containerRadius: theme.radius.radiusMedium,
      containerStyle: 'soft',
      moduleBackgroundOpacity: density === 'compact' ? 0.12 : 0.16,
    },
  }
}

export function edenThemeToFigmaTokens(theme: EdenThemePackage) {
  return {
    metadata: {
      format: 'tokens-studio-compatible',
      schemaVersion: theme.schemaVersion,
      themeKey: theme.themeKey,
      displayName: theme.displayName,
      source: 'eden_export',
    },
    eden: {
      light: modeTokensToTokenStudio(theme.tokens.light),
      dark: modeTokensToTokenStudio(theme.tokens.dark),
    },
  }
}

export function edenThemeToCssVariables(theme: EdenThemePackage) {
  const systemTheme = themeConcepts.find(item => item.id === theme.themeKey)
  const lightVars = systemTheme
    ? getEdenThemeCssVars(systemTheme, 'light')
    : themeTokensToCssVars(theme.tokens.light)
  const darkVars = systemTheme
    ? getEdenThemeCssVars(systemTheme, 'dark')
    : themeTokensToCssVars(theme.tokens.dark)

  return [
    `/* ${theme.displayName} (${theme.themeKey}) - Eden ERP theme tokens */`,
    cssBlock(`[data-visual-theme="${theme.themeKey}"][data-appearance-mode="light"],\n[data-eden-theme="${theme.themeKey}"][data-appearance="light"]`, lightVars),
    cssBlock(`[data-visual-theme="${theme.themeKey}"][data-appearance-mode="dark"],\n[data-eden-theme="${theme.themeKey}"][data-appearance="dark"]`, darkVars),
    '',
  ].join('\n')
}

export function themeTokensToCssVars(tokens: ThemeModeTokens): Record<`--${string}`, string> {
  return {
    '--eden-bg': tokens.color.background,
    '--eden-bg-subtle': tokens.color.surfaceMuted,
    '--eden-surface': tokens.color.surface,
    '--eden-surface-muted': tokens.color.surfaceMuted,
    '--eden-surface-raised': tokens.color.surfaceRaised,
    '--eden-surface-inset': tokens.color.surfaceMuted,
    '--eden-border': tokens.color.border,
    '--eden-border-strong': tokens.color.borderStrong,
    '--eden-text': tokens.color.text.primary,
    '--eden-text-muted': tokens.color.text.secondary,
    '--eden-text-soft': tokens.color.text.muted,
    '--eden-accent': tokens.color.accent.primary,
    '--eden-accent-hover': tokens.color.accent.primary,
    '--eden-accent-soft': tokens.color.accent.soft,
    '--eden-accent-text': '#ffffff',
    '--eden-accent-warm': tokens.color.warning,
    '--eden-success': tokens.color.success,
    '--eden-success-soft': tokens.color.surfaceMuted,
    '--eden-warning': tokens.color.warning,
    '--eden-warning-soft': tokens.color.surfaceMuted,
    '--eden-danger': tokens.color.danger,
    '--eden-danger-soft': tokens.color.surfaceMuted,
    '--eden-info': tokens.color.info,
    '--eden-info-soft': tokens.color.surfaceMuted,
    '--eden-nav-bg': tokens.color.accent.primary,
    '--eden-nav-text': '#ffffff',
    '--eden-nav-muted': tokens.color.text.muted,
    '--eden-nav-active-bg': tokens.color.accent.soft,
    '--eden-nav-active-text': '#ffffff',
    '--eden-nav-hover-bg': tokens.color.surfaceMuted,
    '--eden-header-bg': tokens.color.surface,
    '--eden-header-border': tokens.color.border,
    '--eden-card-bg': tokens.color.surface,
    '--eden-card-border': tokens.color.border,
    '--eden-card-shadow': tokens.shadow.card,
    '--eden-input-bg': tokens.color.surface,
    '--eden-input-border': tokens.color.border,
    '--eden-input-focus': tokens.color.accent.primary,
    '--eden-table-header-bg': tokens.color.surfaceMuted,
    '--eden-table-row-hover': tokens.color.surfaceMuted,
    '--eden-table-row-selected': tokens.color.accent.soft,
    '--eden-badge-bg': tokens.color.surfaceMuted,
    '--eden-focus-ring': tokens.shadow.focus,
    '--eden-alert-bg': tokens.color.surfaceMuted,
    '--eden-alert-border': tokens.color.warning,
    '--eden-radius-sm': tokens.radius.small,
    '--eden-radius-md': tokens.radius.medium,
    '--eden-radius-lg': tokens.radius.large,
    '--eden-radius-card': tokens.radius.card,
    '--eden-radius-button': tokens.radius.button,
    '--eden-radius-input': tokens.radius.input,
    '--eden-shadow-subtle': tokens.shadow.subtle,
    '--eden-shadow-card': tokens.shadow.card,
    '--eden-shadow-floating': tokens.shadow.floating,
    '--eden-shadow-focus': tokens.shadow.focus,
    '--eden-table-row-height': tokens.density.table === 'compact' ? '42px' : tokens.density.table === 'comfortable' ? '58px' : '50px',
    '--eden-form-field-height': tokens.density.form === 'compact' ? '36px' : tokens.density.form === 'comfortable' ? '44px' : '40px',
    '--eden-card-padding': tokens.density.dashboard === 'compact' ? '14px' : tokens.density.dashboard === 'comfortable' ? '22px' : '18px',
    '--eden-section-gap': tokens.density.dashboard === 'compact' ? '12px' : tokens.density.dashboard === 'comfortable' ? '22px' : '16px',
    '--eden-icon-stroke': String(tokens.icon.strokeWidth),
    '--eden-icon-container-bg': tokens.color.accent.soft,
    '--eden-icon-container-border': tokens.color.border,
    '--eden-module-icon-bg': tokens.color.accent.soft,
    '--eden-status-icon-bg': tokens.color.surfaceMuted,
    '--eden-motif-opacity': '0.18',
    '--eden-motif-line-width': '1px',
    '--eden-motif-corner-size': '112px',
  }
}

export function themeTokensToDesignLabCssVars(tokens: ThemeModeTokens): Record<`--${string}`, string> {
  return {
    '--dl-background': tokens.color.background,
    '--dl-foreground': tokens.color.foreground,
    '--dl-surface-base': tokens.color.surface,
    '--dl-surface-raised': tokens.color.surfaceRaised,
    '--dl-surface-muted': tokens.color.surfaceMuted,
    '--dl-border-subtle': tokens.color.border,
    '--dl-border-strong': tokens.color.borderStrong,
    '--dl-text-primary': tokens.color.text.primary,
    '--dl-text-secondary': tokens.color.text.secondary,
    '--dl-text-muted': tokens.color.text.muted,
    '--dl-accent-primary': tokens.color.accent.primary,
    '--dl-accent-secondary': tokens.color.accent.secondary,
    '--dl-accent-warm': tokens.color.warning,
    '--dl-success': tokens.color.success,
    '--dl-warning': tokens.color.warning,
    '--dl-danger': tokens.color.danger,
    '--dl-info': tokens.color.info,
    '--dl-radius-small': tokens.radius.small,
    '--dl-radius-medium': tokens.radius.medium,
    '--dl-radius-large': tokens.radius.large,
    '--dl-card-radius': tokens.radius.card,
    '--dl-input-radius': tokens.radius.input,
    '--dl-shadow-subtle': tokens.shadow.subtle,
    '--dl-shadow-card': tokens.shadow.card,
    '--dl-shadow-floating': tokens.shadow.floating,
    '--dl-shadow-focus': tokens.shadow.focus,
    '--dl-density-row': tokens.density.table === 'compact' ? '42px' : tokens.density.table === 'comfortable' ? '58px' : '50px',
    '--dl-density-gap': tokens.density.dashboard === 'compact' ? '12px' : tokens.density.dashboard === 'comfortable' ? '20px' : '16px',
    '--dl-motif-opacity': '0.18',
    '--dl-motif-line-width': '1px',
    '--dl-motif-corner-size': '112px',
  }
}

export function resolveSystemThemePackage(themeKey: string) {
  const normalized = findThemeConcept(themeKey as ThemeConceptId).id
  return buildEdenThemePackage(normalized)
}

function modeTokensToTokenStudio(value: unknown): TokenStudioNode {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return {
      value,
      type: inferTokenType(value),
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return { value: String(value ?? ''), type: 'other' }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, modeTokensToTokenStudio(child)])
  ) as TokenStudioNode
}

function inferTokenType(value: string | number | boolean) {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (/^#|^rgb|^hsl/i.test(value)) return 'color'
  if (/px$|rem$/i.test(value)) return 'dimension'
  if (/shadow|rgba|0\s/.test(value)) return 'boxShadow'
  return 'other'
}

function cssBlock(selector: string, vars: Record<`--${string}`, string>) {
  const body = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')
  return `${selector} {\n${body}\n}`
}
