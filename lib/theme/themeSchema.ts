export const THEME_SCHEMA_VERSION = '1.0.0'
export const SUPPORTED_THEME_SCHEMA_VERSIONS = [THEME_SCHEMA_VERSION] as const
export const THEME_IMPORT_PREVIEW_STORAGE_KEY = 'eden.themeImportPreview'
export const MAX_THEME_JSON_BYTES = 256 * 1024

export type ThemePackageStatus =
  | 'system'
  | 'draft'
  | 'preview'
  | 'active'
  | 'deprecated'
  | 'archived'
  | 'rejected'

export type ThemeDensity = 'compact' | 'balanced' | 'comfortable'
export type IconContainerStyle = 'soft' | 'outlined' | 'solid' | 'minimal'
export type ThemeAppearance = 'light' | 'dark'

export interface ThemeModeTokens {
  color: {
    background: string
    foreground: string
    surface: string
    surfaceMuted: string
    surfaceRaised: string
    border: string
    borderStrong: string
    text: {
      primary: string
      secondary: string
      muted: string
    }
    accent: {
      primary: string
      secondary: string
      soft: string
    }
    success: string
    warning: string
    danger: string
    info: string
  }
  radius: {
    small: string
    medium: string
    large: string
    card: string
    input: string
    button: string
  }
  shadow: {
    subtle: string
    card: string
    floating: string
    focus: string
  }
  typography: {
    fontFamily: string
    headingWeight: string | number
    bodyWeight: string | number
    labelWeight: string | number
    scale: ThemeDensity
  }
  density: {
    table: ThemeDensity
    form: ThemeDensity
    dashboard: ThemeDensity
  }
  icon: {
    strokeWidth: number
    containerRadius: string
    containerStyle: IconContainerStyle
    moduleBackgroundOpacity: number
  }
}

export interface EdenThemePackage {
  schemaVersion: string
  themeKey: string
  displayName: string
  description?: string
  author?: string
  version: string
  compatibleApp?: 'eden-erp' | string
  tokens: {
    light: ThemeModeTokens
    dark: ThemeModeTokens
  }
  metadata?: {
    personality?: string | string[]
    bestFor?: string | string[]
    createdAt?: string
    source?: 'eden_export' | 'imported' | 'generated' | string
    [key: string]: unknown
  }
}

export interface ThemeValidationIssue {
  path: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

export interface ThemeContrastIssue {
  mode: ThemeAppearance
  path: string
  foreground: string
  background: string
  ratio: number
  minimum: number
  severity: 'critical' | 'warning'
  message: string
}

export interface ThemeValidationResult {
  valid: boolean
  errors: ThemeValidationIssue[]
  warnings: ThemeValidationIssue[]
  contrast: {
    light: ThemeContrastIssue[]
    dark: ThemeContrastIssue[]
  }
  activationBlocked: boolean
}

export interface ThemeImportPreviewRecord {
  id: string
  status: Extract<ThemePackageStatus, 'preview' | 'rejected'>
  themeKey: string | null
  displayName: string | null
  theme: EdenThemePackage | null
  validation: ThemeValidationResult
  canActivate: boolean
  activationRequiresAdmin: true
  stored: false
}

export type ThemeExportFormat = 'eden' | 'figma' | 'css' | 'readme'

export const ALLOWED_THEME_ROOT_KEYS = [
  'schemaVersion',
  'themeKey',
  'displayName',
  'description',
  'author',
  'version',
  'compatibleApp',
  'tokens',
  'metadata',
] as const

export const ALLOWED_TOKEN_TREE = {
  color: {
    background: true,
    foreground: true,
    surface: true,
    surfaceMuted: true,
    surfaceRaised: true,
    border: true,
    borderStrong: true,
    text: {
      primary: true,
      secondary: true,
      muted: true,
    },
    accent: {
      primary: true,
      secondary: true,
      soft: true,
    },
    success: true,
    warning: true,
    danger: true,
    info: true,
  },
  radius: {
    small: true,
    medium: true,
    large: true,
    card: true,
    input: true,
    button: true,
  },
  shadow: {
    subtle: true,
    card: true,
    floating: true,
    focus: true,
  },
  typography: {
    fontFamily: true,
    headingWeight: true,
    bodyWeight: true,
    labelWeight: true,
    scale: true,
  },
  density: {
    table: true,
    form: true,
    dashboard: true,
  },
  icon: {
    strokeWidth: true,
    containerRadius: true,
    containerStyle: true,
    moduleBackgroundOpacity: true,
  },
} as const

export const REQUIRED_TOKEN_PATHS = [
  'color.background',
  'color.foreground',
  'color.surface',
  'color.surfaceMuted',
  'color.surfaceRaised',
  'color.border',
  'color.borderStrong',
  'color.text.primary',
  'color.text.secondary',
  'color.text.muted',
  'color.accent.primary',
  'color.accent.secondary',
  'color.accent.soft',
  'color.success',
  'color.warning',
  'color.danger',
  'color.info',
  'radius.small',
  'radius.medium',
  'radius.large',
  'radius.card',
  'radius.input',
  'radius.button',
  'shadow.subtle',
  'shadow.card',
  'shadow.floating',
  'shadow.focus',
  'typography.fontFamily',
  'typography.headingWeight',
  'typography.bodyWeight',
  'typography.labelWeight',
  'typography.scale',
  'density.table',
  'density.form',
  'density.dashboard',
  'icon.strokeWidth',
  'icon.containerRadius',
  'icon.containerStyle',
  'icon.moduleBackgroundOpacity',
] as const

export const DENSITY_VALUES: ThemeDensity[] = ['compact', 'balanced', 'comfortable']
export const ICON_CONTAINER_STYLES: IconContainerStyle[] = ['soft', 'outlined', 'solid', 'minimal']
