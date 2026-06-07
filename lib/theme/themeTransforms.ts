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
        muted: vars['--eden-text-muted'],
      },
      accent: {
        primary: vars['--eden-accent'],
        secondary: theme.colors.accentSecondary,
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
  const lightVars = themeTokensToCssVars(theme.tokens.light)
  const darkVars = themeTokensToCssVars(theme.tokens.dark)

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
    '--eden-surface': tokens.color.surface,
    '--eden-surface-muted': tokens.color.surfaceMuted,
    '--eden-surface-raised': tokens.color.surfaceRaised,
    '--eden-border': tokens.color.border,
    '--eden-border-strong': tokens.color.borderStrong,
    '--eden-text': tokens.color.text.primary,
    '--eden-text-muted': tokens.color.text.secondary,
    '--eden-accent': tokens.color.accent.primary,
    '--eden-accent-soft': tokens.color.accent.soft,
    '--eden-success': tokens.color.success,
    '--eden-warning': tokens.color.warning,
    '--eden-danger': tokens.color.danger,
    '--eden-info': tokens.color.info,
    '--eden-radius-card': tokens.radius.card,
    '--eden-shadow-card': tokens.shadow.card,
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
