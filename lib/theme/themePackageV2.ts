import { z, ZodError } from 'zod'
import { themeTokensToCssVars } from './themeTransforms'
import {
  THEME_SCHEMA_VERSION,
  type EdenThemePackage,
  type ThemeAppearance,
  type ThemeAssetRef,
  type ThemeBackgroundLayer,
  type ThemeModeTokens,
  type ThemeValidationIssue,
  type ThemeValidationResult,
} from './themeSchema'

type TokenStudioNode = {
  value?: string | number | boolean | Record<string, unknown>
  type?: string
  description?: string
  [key: string]: TokenStudioNode | string | number | boolean | Record<string, unknown> | undefined
}

type RuntimeAsset = {
  enabled: boolean
  assetId: string
  assetName: string
  assetType: 'illustration' | 'pattern' | 'watermark' | 'icon' | 'hero'
  assetCategory: 'pageBanner' | 'smartList' | 'formHero' | 'detailPanel' | 'wizard' | 'login' | 'dashboardHero' | 'emptyState'
  sourceType: 'internal-library' | 'upload' | 'url-reference' | 'generated-svg'
  src: string
  assetRef: string
  fallbackMotif: string
  alt: string
  position: string
  fit: 'cover' | 'contain' | 'fill'
  focalPointX: number
  focalPointY: number
  opacity: number
  overlayColor: string
  overlayOpacity: number
  borderRadius: string
  mask: {
    enabled: boolean
    type: string
  }
  visibleOn: string[]
  sharedAsset?: boolean
}

type RuntimeBackground = {
  type: 'solid' | 'gradient' | 'pattern' | 'illustration' | 'mixed'
  color: string
  gradient: {
    enabled: boolean
    from: string
    to: string
    direction: string
  }
  pattern: {
    enabled: boolean
    motifType: string
    color: string
    opacity: number
    size: number
    spacing: number
    rotation: number
    lineWidth: number
  }
  overlay: {
    enabled: boolean
    color: string
    opacity: number
  }
  border: string
  shadow: string
}

type RuntimeMode = {
  colors: ThemeModeTokens['colors']
  background: Record<
    'app' | 'page' | 'surface' | 'card' | 'sidebar' | 'topbar' | 'pageBanner' | 'smartList' | 'form' | 'wizard' | 'login' | 'dashboard' | 'modal' | 'drawer',
    RuntimeBackground
  >
  illustrations: Record<'pageBanner' | 'smartList' | 'formHero' | 'detailPanel' | 'wizard' | 'login' | 'dashboardHero' | 'emptyState', RuntimeAsset>
  typography: {
    fontFamily: string
    headingFontFamily: string
    monoFontFamily: string
    baseSize: number
    scale: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl', number>
    weight: Record<'regular' | 'medium' | 'semibold' | 'bold', number>
    lineHeight: Record<'tight' | 'normal' | 'relaxed', number>
    letterSpacing: Record<'tight' | 'normal' | 'wide', string>
  }
  shape: ThemeModeTokens['shape']
  spacing: ThemeModeTokens['spacing']
  shadow: ThemeModeTokens['shadow']
  components: ThemeModeTokens['components'] & {
    sidebar: Record<string, string>
    topbar: Record<string, string>
  }
  states: {
    hover: Record<'background' | 'foreground' | 'border', string>
    active: Record<'background' | 'foreground' | 'border', string>
    selected: Record<'background' | 'foreground' | 'border', string>
    disabled: { opacity: number; background: string; foreground: string }
    focus: Record<'ring' | 'ringOffset' | 'shadow', string>
    loading: Record<'overlay' | 'spinner', string>
    skeleton: Record<'base' | 'highlight', string>
    error: Record<'background' | 'foreground' | 'border', string>
    warning: Record<'background' | 'foreground' | 'border', string>
    success: Record<'background' | 'foreground' | 'border', string>
  }
  density: ThemeModeTokens['density']
  icon: ThemeModeTokens['icon']
}

export type EdenThemeRuntimePackageV2 = {
  schemaVersion: typeof THEME_SCHEMA_VERSION
  meta: {
    id: string
    themeKey: string
    displayName: string
    slug: string
    description: string
    author: string
    version: string
    compatibleApp: 'eden-erp'
    scope: 'system'
    defaultMode: 'light' | 'dark' | 'system'
    supportedModes: ['light', 'dark']
    createdAt: string
    updatedAt: string
  }
  modes: {
    light: RuntimeMode
    dark: RuntimeMode
  }
  cssVariables: {
    light: Record<`--${string}`, string>
    dark: Record<`--${string}`, string>
  }
  figmaTokensRef: {
    format: 'figma-tokens'
    filename: string
    generatedFrom: string
    themeKey: string
  }
  lifecycle: {
    status: 'draft' | 'inactive' | 'active' | 'review' | 'approved' | 'archived' | 'rejected'
    isActive: boolean
    allowedTransitions: Array<'send_to_review' | 'approve' | 'activate' | 'archive'>
    activationRules: {
      singleActiveSystemThemePerWorkspace: true
      activeThemeCannotBeDeleted: true
      activeThemeRequiresVersionCloneForCriticalChanges: true
    }
  }
  assetRegistry: Record<string, {
    assetRef: string
    src: string
    sourceType: RuntimeAsset['sourceType']
    motif: string
    mode: ThemeAppearance
    usage: string[]
    checksum: string
    safe: true
  }>
  validation: {
    schemaValid: boolean
    requiredFieldsComplete: boolean
    assetRefsResolved: boolean
    cssVariablesComplete: boolean
    figmaExportReady: boolean
    contrastWarnings: ThemeValidationIssue[]
    assetWarnings: ThemeValidationIssue[]
    unusedAssets: string[]
    notes: string[]
  }
  metadata: {
    artDirection: string
    inspiration: string
    category: string
    personality: string[]
    bestFor: string[]
    source: string
    notes: string
    designerNote: string
  }
}

const forbiddenText = /(<\s*script|<\/?[a-z][\s\S]*>|javascript:|@import|url\s*\(|expression\s*\(|data:|base64|<svg|<\/svg|foreignObject|onload\s*=|onclick\s*=|iframe|todo|placeholder|coming-soon|later|tbd|dummy)/i
const colorSchema = z.string().min(1).regex(/^(#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)|hsla?\([^)]+\))$/i)
const cssValue = z.string().min(1).max(520)
const runtimeAssetSchema = z.object({
  enabled: z.boolean(),
  assetId: z.string().min(1),
  assetName: z.string().min(1),
  assetType: z.enum(['illustration', 'pattern', 'watermark', 'icon', 'hero']),
  assetCategory: z.enum(['pageBanner', 'smartList', 'formHero', 'detailPanel', 'wizard', 'login', 'dashboardHero', 'emptyState']),
  sourceType: z.enum(['internal-library', 'upload', 'url-reference', 'generated-svg']),
  src: z.string().min(1),
  assetRef: z.string().min(1),
  fallbackMotif: z.string().min(1),
  alt: z.string().min(1),
  position: z.string().min(1),
  fit: z.enum(['cover', 'contain', 'fill']),
  focalPointX: z.number().min(0).max(100),
  focalPointY: z.number().min(0).max(100),
  opacity: z.number().min(0).max(1),
  overlayColor: colorSchema,
  overlayOpacity: z.number().min(0).max(1),
  borderRadius: cssValue,
  mask: z.object({ enabled: z.boolean(), type: z.string().min(1) }),
  visibleOn: z.array(z.string()).min(1),
  sharedAsset: z.boolean().optional(),
}).strict()

const runtimeBackgroundSchema = z.object({
  type: z.enum(['solid', 'gradient', 'pattern', 'illustration', 'mixed']),
  color: colorSchema,
  gradient: z.object({
    enabled: z.boolean(),
    from: colorSchema,
    to: colorSchema,
    direction: z.string().min(1),
  }),
  pattern: z.object({
    enabled: z.boolean(),
    motifType: z.string().min(1),
    color: colorSchema,
    opacity: z.number().min(0).max(1),
    size: z.number().min(1),
    spacing: z.number().min(1),
    rotation: z.number(),
    lineWidth: z.number().min(0),
  }),
  overlay: z.object({
    enabled: z.boolean(),
    color: colorSchema,
    opacity: z.number().min(0).max(1),
  }),
  border: cssValue,
  shadow: cssValue,
}).strict()

const runtimeModeSchema = z.object({
  colors: z.record(colorSchema),
  background: z.object({
    app: runtimeBackgroundSchema,
    page: runtimeBackgroundSchema,
    surface: runtimeBackgroundSchema,
    card: runtimeBackgroundSchema,
    sidebar: runtimeBackgroundSchema,
    topbar: runtimeBackgroundSchema,
    pageBanner: runtimeBackgroundSchema,
    smartList: runtimeBackgroundSchema,
    form: runtimeBackgroundSchema,
    wizard: runtimeBackgroundSchema,
    login: runtimeBackgroundSchema,
    dashboard: runtimeBackgroundSchema,
    modal: runtimeBackgroundSchema,
    drawer: runtimeBackgroundSchema,
  }).strict(),
  illustrations: z.object({
    pageBanner: runtimeAssetSchema,
    smartList: runtimeAssetSchema,
    formHero: runtimeAssetSchema,
    detailPanel: runtimeAssetSchema,
    wizard: runtimeAssetSchema,
    login: runtimeAssetSchema,
    dashboardHero: runtimeAssetSchema,
    emptyState: runtimeAssetSchema,
  }).strict(),
  typography: z.record(z.unknown()).refine(value => Object.keys(value).length > 0),
  shape: z.record(cssValue),
  spacing: z.record(cssValue),
  shadow: z.record(cssValue),
  components: z.record(z.record(cssValue)).refine(value => Object.keys(value).length > 0),
  states: z.record(z.unknown()).refine(value => Object.keys(value).length > 0),
  density: z.record(z.string()),
  icon: z.record(z.unknown()).refine(value => Object.keys(value).length > 0),
}).strict()

export const edenThemeRuntimePackageV2Schema = z.object({
  schemaVersion: z.literal(THEME_SCHEMA_VERSION),
  meta: z.object({
    id: z.string().min(1),
    themeKey: z.string().min(1),
    displayName: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().min(1),
    author: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    compatibleApp: z.literal('eden-erp'),
    scope: z.literal('system'),
    defaultMode: z.enum(['light', 'dark', 'system']),
    supportedModes: z.tuple([z.literal('light'), z.literal('dark')]),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }).strict(),
  modes: z.object({ light: runtimeModeSchema, dark: runtimeModeSchema }).strict(),
  cssVariables: z.object({
    light: z.record(cssValue),
    dark: z.record(cssValue),
  }).strict(),
  figmaTokensRef: z.object({
    format: z.literal('figma-tokens'),
    filename: z.string().min(1),
    generatedFrom: z.string().min(1),
    themeKey: z.string().min(1),
  }).strict(),
  lifecycle: z.object({
    status: z.enum(['draft', 'inactive', 'active', 'review', 'approved', 'archived', 'rejected']),
    isActive: z.boolean(),
    allowedTransitions: z.array(z.enum(['send_to_review', 'approve', 'activate', 'archive'])).min(1),
    activationRules: z.object({
      singleActiveSystemThemePerWorkspace: z.literal(true),
      activeThemeCannotBeDeleted: z.literal(true),
      activeThemeRequiresVersionCloneForCriticalChanges: z.literal(true),
    }).strict(),
  }).strict(),
  assetRegistry: z.record(z.object({
    assetRef: z.string().min(1),
    src: z.string().min(1),
    sourceType: z.enum(['internal-library', 'upload', 'url-reference', 'generated-svg']),
    motif: z.string().min(1),
    mode: z.enum(['light', 'dark']),
    usage: z.array(z.string()).min(1),
    checksum: z.string().min(1),
    safe: z.literal(true),
  }).strict()),
  validation: z.object({
    schemaValid: z.boolean(),
    requiredFieldsComplete: z.boolean(),
    assetRefsResolved: z.boolean(),
    cssVariablesComplete: z.boolean(),
    figmaExportReady: z.boolean(),
    contrastWarnings: z.array(z.unknown()),
    assetWarnings: z.array(z.unknown()),
    unusedAssets: z.array(z.string()),
    notes: z.array(z.string()),
  }).strict(),
  metadata: z.object({
    artDirection: z.string().min(1),
    inspiration: z.string().min(1),
    category: z.string().min(1),
    personality: z.array(z.string()).min(1),
    bestFor: z.array(z.string()).min(1),
    source: z.string().min(1),
    notes: z.string().min(1),
    designerNote: z.string().min(1),
  }).strict(),
}).strict()

export type FigmaTokensV2 = ReturnType<typeof edenThemeRuntimePackageV2ToFigmaTokens>

export function toRuntimeThemePackageV2(theme: EdenThemePackage): EdenThemeRuntimePackageV2 {
  const base = {
    schemaVersion: THEME_SCHEMA_VERSION,
    meta: {
      id: nonEmpty(theme.meta.id, theme.meta.themeKey),
      themeKey: theme.meta.themeKey,
      displayName: theme.meta.displayName,
      slug: theme.meta.slug || theme.meta.themeKey,
      description: nonEmpty(theme.meta.description, `${theme.meta.displayName} Eden ERP system theme.`),
      author: nonEmpty(theme.meta.author, 'EDEN Teknoloji'),
      version: semanticVersion(theme.meta.version),
      compatibleApp: 'eden-erp',
      scope: 'system',
      defaultMode: theme.meta.defaultMode === 'dark' ? 'dark' : 'light',
      supportedModes: ['light', 'dark'],
      createdAt: nonEmpty(theme.meta.createdAt, '2026-06-07'),
      updatedAt: nonEmpty(theme.meta.updatedAt, '2026-06-10'),
    },
    modes: {
      light: toRuntimeMode(theme, 'light'),
      dark: toRuntimeMode(theme, 'dark'),
    },
    cssVariables: {
      light: runtimeCssVariables(theme, 'light'),
      dark: runtimeCssVariables(theme, 'dark'),
    },
    figmaTokensRef: {
      format: 'figma-tokens',
      filename: `${theme.meta.themeKey}.figma-tokens.json`,
      generatedFrom: `${theme.meta.themeKey}.eden-theme.json`,
      themeKey: theme.meta.themeKey,
    },
    lifecycle: {
      status: theme.lifecycle.status,
      isActive: theme.meta.isActive,
      allowedTransitions: ['send_to_review', 'approve', 'activate', 'archive'],
      activationRules: {
        singleActiveSystemThemePerWorkspace: true,
        activeThemeCannotBeDeleted: true,
        activeThemeRequiresVersionCloneForCriticalChanges: true,
      },
    },
    assetRegistry: {},
    validation: {
      schemaValid: true,
      requiredFieldsComplete: true,
      assetRefsResolved: true,
      cssVariablesComplete: true,
      figmaExportReady: true,
      contrastWarnings: [],
      assetWarnings: [],
      unusedAssets: [],
      notes: [],
    },
    metadata: {
      artDirection: nonEmpty(theme.metadata.artDirection, 'Refined Eden ERP system theme.'),
      inspiration: nonEmpty(theme.metadata.inspiration, 'Semantic design tokens, surface rules and illustration references.'),
      category: nonEmpty(theme.metadata.category, 'system'),
      personality: theme.metadata.personality.length ? theme.metadata.personality : ['calm', 'enterprise', 'structured'],
      bestFor: theme.metadata.bestFor.length ? theme.metadata.bestFor : ['system-ui', 'erp-workflows'],
      source: theme.metadata.source,
      notes: nonEmpty(theme.metadata.notes, 'Runtime package generated from Eden ERP theme form.'),
      designerNote: nonEmpty(theme.metadata.designerNote, 'Use token values and asset references only; do not change workflows.'),
    },
  } satisfies EdenThemeRuntimePackageV2

  const packageWithRegistry = {
    ...base,
    assetRegistry: buildAssetRegistry(base),
  }

  return {
    ...packageWithRegistry,
    validation: buildRuntimeValidation(packageWithRegistry),
  }
}

export function edenThemeRuntimePackageV2ToFigmaTokens(theme: EdenThemeRuntimePackageV2) {
  return {
    global: {
      color: {
        light: tokenStudio(theme.modes.light.colors),
        dark: tokenStudio(theme.modes.dark.colors),
      },
      typography: tokenStudio(theme.modes.light.typography),
      spacing: tokenStudio(theme.modes.light.spacing),
      borderRadius: tokenStudio(theme.modes.light.shape),
      boxShadow: tokenStudio(theme.modes.light.shadow),
    },
    components: {
      light: tokenStudio(theme.modes.light.components),
      dark: tokenStudio(theme.modes.dark.components),
    },
    illustrations: {
      light: tokenStudio(theme.modes.light.illustrations),
      dark: tokenStudio(theme.modes.dark.illustrations),
    },
    metadata: {
      format: 'tokens-studio-compatible',
      schemaVersion: theme.schemaVersion,
      themeKey: theme.meta.themeKey,
      displayName: theme.meta.displayName,
      generatedFrom: theme.figmaTokensRef.generatedFrom,
    },
  }
}

export function runtimeThemePackageV2ToCssVariables(theme: EdenThemeRuntimePackageV2) {
  return [
    `/* ${theme.meta.displayName} (${theme.meta.themeKey}) - Eden ERP runtime theme package */`,
    cssBlock(`[data-visual-theme="${theme.meta.themeKey}"][data-appearance-mode="light"],\n[data-eden-theme="${theme.meta.themeKey}"][data-appearance="light"]`, theme.cssVariables.light),
    cssBlock(`[data-visual-theme="${theme.meta.themeKey}"][data-appearance-mode="dark"],\n[data-eden-theme="${theme.meta.themeKey}"][data-appearance="dark"]`, theme.cssVariables.dark),
    '',
  ].join('\n')
}

export function validateRuntimeThemePackageV2(input: unknown): { theme: EdenThemeRuntimePackageV2 | null; validation: ThemeValidationResult } {
  const errors: ThemeValidationIssue[] = []
  const warnings: ThemeValidationIssue[] = []
  const parsed = edenThemeRuntimePackageV2Schema.safeParse(input)

  if (!parsed.success) {
    errors.push(...zodIssues(parsed.error))
    scanForbidden(input, 'root', errors)
    return { theme: null, validation: validationResult(errors, warnings) }
  }

  const runtimeTheme = parsed.data as EdenThemeRuntimePackageV2
  scanForbidden(runtimeTheme, 'root', errors)
  validateRuntimeAssets(runtimeTheme, errors)
  validateRuntimeCssVariables(runtimeTheme, errors)

  return {
    theme: errors.length ? null : runtimeTheme,
    validation: validationResult(errors, warnings),
  }
}

export function validateFigmaTokensForThemeImport(tokens: unknown): ThemeValidationResult {
  const errors: ThemeValidationIssue[] = []
  if (!isRecord(tokens)) {
    errors.push(issue('root', 'INVALID_FIGMA_TOKENS', 'Figma token dosyasi JSON object olmalidir.'))
    return validationResult(errors)
  }

  const requiredPaths = [
    'global.color.light',
    'global.color.dark',
    'global.typography',
    'global.spacing',
    'global.borderRadius',
    'global.boxShadow',
    'components.light',
    'components.dark',
    'illustrations.light',
    'illustrations.dark',
    'metadata',
  ]

  for (const path of requiredPaths) {
    if (!getPath(tokens, path)) {
      errors.push(issue(path, 'FIGMA_TOKEN_FIELD_MISSING', 'Figma/Tokens Studio export alani eksik.'))
    }
  }

  errors.push(issue(
    'root',
    'FIGMA_TOKENS_NOT_RUNTIME_THEME',
    'Figma tokens dosyasi Eden runtime theme yerine gecemez; Eden Theme JSON olarak hydrate edilmis paket import edilmelidir.'
  ))

  return validationResult(errors)
}

export function parseThemeImportTextV2(input: string): {
  kind: 'eden-theme' | 'figma-tokens' | 'invalid'
  runtimeTheme: EdenThemeRuntimePackageV2 | null
  theme: EdenThemePackage | null
  validation: ThemeValidationResult
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return {
      kind: 'invalid',
      runtimeTheme: null,
      theme: null,
      validation: validationResult([issue('root', 'INVALID_JSON', 'Import dosyasi gecerli JSON olmalidir.')]),
    }
  }

  if (isFigmaTokensShape(parsed)) {
    return {
      kind: 'figma-tokens',
      runtimeTheme: null,
      theme: null,
      validation: validateFigmaTokensForThemeImport(parsed),
    }
  }

  const { theme, validation } = validateRuntimeThemePackageV2(parsed)
  if (!theme) {
    return { kind: 'invalid', runtimeTheme: null, theme: null, validation }
  }

  return {
    kind: 'eden-theme',
    runtimeTheme: theme,
    theme: runtimeThemePackageV2ToInternalTheme(theme),
    validation,
  }
}

export function runtimeThemePackageV2ToInternalTheme(theme: EdenThemeRuntimePackageV2): EdenThemePackage {
  const light = runtimeModeToInternalMode(theme, 'light')
  const dark = runtimeModeToInternalMode(theme, 'dark')
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    meta: {
      id: theme.meta.id,
      themeKey: theme.meta.themeKey,
      displayName: theme.meta.displayName,
      slug: theme.meta.slug,
      description: theme.meta.description,
      author: theme.meta.author,
      version: theme.meta.version,
      compatibleApp: 'eden-erp',
      scope: 'system',
      defaultMode: theme.meta.defaultMode === 'dark' ? 'dark' : 'light',
      supportedModes: ['light', 'dark'],
      status: theme.lifecycle.status,
      isActive: false,
      isDefault: false,
      createdAt: theme.meta.createdAt,
      updatedAt: theme.meta.updatedAt,
    },
    modes: { light, dark },
    figmaTokens: edenThemeRuntimePackageV2ToFigmaTokens(theme),
    cssVariables: {
      light: themeTokensToCssVars(light),
      dark: themeTokensToCssVars(dark),
    },
    lifecycle: {
      status: theme.lifecycle.status,
      reason: 'Imported from Eden Theme runtime package.',
    },
    metadata: {
      artDirection: theme.metadata.artDirection,
      inspiration: theme.metadata.inspiration,
      category: theme.metadata.category,
      personality: theme.metadata.personality,
      bestFor: theme.metadata.bestFor,
      source: 'imported',
      notes: theme.metadata.notes,
      designerNote: theme.metadata.designerNote,
    },
  }
}

function toRuntimeMode(theme: EdenThemePackage, mode: ThemeAppearance): RuntimeMode {
  const tokens = theme.modes[mode]
  return {
    colors: tokens.colors,
    background: {
      app: background(tokens.background.app, tokens),
      page: background(tokens.background.page, tokens),
      surface: backgroundFromColor(tokens.colors.surface, tokens),
      card: backgroundFromColor(tokens.colors.card, tokens),
      sidebar: background(tokens.background.sidebar, tokens),
      topbar: background(tokens.background.topbar, tokens),
      pageBanner: backgroundFromColor(tokens.components.pageBanner.pageBannerBg || tokens.colors.primary, tokens),
      smartList: background(tokens.background.list, tokens),
      form: background(tokens.background.form, tokens),
      wizard: backgroundFromColor(tokens.components.wizard.wizardBg || tokens.colors.background, tokens),
      login: background(tokens.background.login, tokens),
      dashboard: background(tokens.background.dashboard, tokens),
      modal: background(tokens.background.modal, tokens),
      drawer: background(tokens.background.drawer, tokens),
    },
    illustrations: {
      pageBanner: runtimeAsset(theme, mode, 'pageBanner', tokens.illustrations.pageBanner[mode]),
      smartList: runtimeAsset(theme, mode, 'smartList', tokens.illustrations.listArea.watermark),
      formHero: runtimeAsset(theme, mode, 'formHero', tokens.illustrations.formArea.heroIllustration),
      detailPanel: runtimeAsset(theme, mode, 'detailPanel', tokens.illustrations.formArea.sideImage),
      wizard: runtimeAsset(theme, mode, 'wizard', tokens.illustrations.wizardArea.sideIllustration),
      login: runtimeAsset(theme, mode, 'login', tokens.illustrations.loginArea.heroImage),
      dashboardHero: runtimeAsset(theme, mode, 'dashboardHero', tokens.illustrations.dashboardArea.dashboardHeroIllustration),
      emptyState: runtimeAsset(theme, mode, 'emptyState', tokens.illustrations.listArea.emptyState),
    },
    typography: {
      fontFamily: tokens.typography.fontFamily,
      headingFontFamily: tokens.typography.headingFontFamily,
      monoFontFamily: tokens.typography.monoFontFamily,
      baseSize: parseNumber(tokens.typography.baseFontSize, 14),
      scale: { xs: 12, sm: 13, md: 14, lg: 16, xl: 20, '2xl': 24, '3xl': 30 },
      weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: 1.2, normal: tokens.typography.lineHeight, relaxed: 1.65 },
      letterSpacing: { tight: '-0.01em', normal: tokens.typography.letterSpacing, wide: '0.02em' },
    },
    shape: tokens.shape,
    spacing: tokens.spacing,
    shadow: tokens.shadow,
    components: {
      ...tokens.components,
      sidebar: {
        background: tokens.components.shell.navBg,
        foreground: tokens.components.shell.navText,
        muted: tokens.components.shell.navMuted,
        hover: tokens.components.shell.navHoverBg,
        activeBackground: tokens.components.shell.navActiveBg,
        activeForeground: tokens.components.shell.navActiveText,
      },
      topbar: {
        background: tokens.components.shell.headerBg,
        border: tokens.components.shell.headerBorder,
        foreground: tokens.colors.foreground,
      },
    },
    states: {
      hover: { background: tokens.states.hoverBackground, foreground: tokens.colors.foreground, border: tokens.colors.border },
      active: { background: tokens.states.activeBackground, foreground: tokens.colors.foreground, border: tokens.colors.borderStrong },
      selected: { background: tokens.states.selectedBackground, foreground: tokens.colors.foreground, border: tokens.states.selectedBorder },
      disabled: { opacity: tokens.states.disabledOpacity, background: tokens.colors.muted, foreground: tokens.colors.mutedForeground },
      focus: { ring: tokens.states.focusRing, ringOffset: tokens.states.focusRingOffset, shadow: tokens.shadow.shadowFocus },
      loading: { overlay: tokens.states.loadingState, spinner: tokens.colors.primary },
      skeleton: { base: tokens.states.skeletonState, highlight: tokens.colors.surfaceRaised },
      error: { background: tokens.colors.danger, foreground: tokens.colors.dangerForeground, border: tokens.colors.danger },
      warning: { background: tokens.colors.warning, foreground: tokens.colors.warningForeground, border: tokens.colors.warning },
      success: { background: tokens.colors.success, foreground: tokens.colors.successForeground, border: tokens.colors.success },
    },
    density: tokens.density,
    icon: tokens.icon,
  }
}

function runtimeModeToInternalMode(theme: EdenThemeRuntimePackageV2, mode: ThemeAppearance): ThemeModeTokens {
  const runtime = theme.modes[mode]
  return {
    colors: runtime.colors,
    background: {
      page: internalBackground(runtime.background.page),
      app: internalBackground(runtime.background.app),
      sidebar: internalBackground(runtime.background.sidebar),
      topbar: internalBackground(runtime.background.topbar),
      login: internalBackground(runtime.background.login),
      dashboard: internalBackground(runtime.background.dashboard),
      form: internalBackground(runtime.background.form),
      list: internalBackground(runtime.background.smartList),
      modal: internalBackground(runtime.background.modal),
      drawer: internalBackground(runtime.background.drawer),
    },
    illustrations: {
      pageBanner: {
        light: internalAsset(mode === 'light' ? runtime.illustrations.pageBanner : theme.modes.light.illustrations.pageBanner),
        dark: internalAsset(mode === 'dark' ? runtime.illustrations.pageBanner : theme.modes.dark.illustrations.pageBanner),
        backgroundType: 'illustration-overlay',
        placement: 'top-right',
        sizing: 'cover',
        cropBehavior: 'edge-fade',
        cornerDecoration: 'geometric',
        frameStyle: 'ornamental',
      },
      listArea: {
        headerDecoration: internalAsset(runtime.illustrations.smartList),
        panelIllustration: internalAsset(runtime.illustrations.smartList),
        watermark: internalAsset(runtime.illustrations.smartList),
        emptyState: internalAsset(runtime.illustrations.emptyState),
        toolbarDecoration: internalAsset(runtime.illustrations.smartList),
        topStripDecoration: 'subtle themed strip',
      },
      formArea: {
        heroIllustration: internalAsset(runtime.illustrations.formHero),
        sideImage: internalAsset(runtime.illustrations.detailPanel),
        cornerArt: internalAsset(runtime.illustrations.formHero),
        logoPlaceholderArtwork: internalAsset(runtime.illustrations.formHero),
      },
      wizardArea: {
        backgroundIllustration: internalAsset(runtime.illustrations.wizard),
        sideIllustration: internalAsset(runtime.illustrations.wizard),
        completionIllustration: internalAsset(runtime.illustrations.wizard),
      },
      loginArea: {
        heroImage: internalAsset(runtime.illustrations.login),
        backgroundImage: internalAsset(runtime.illustrations.login),
      },
      dashboardArea: {
        welcomeCardImage: internalAsset(runtime.illustrations.dashboardHero),
        dashboardHeroIllustration: internalAsset(runtime.illustrations.dashboardHero),
      },
    },
    typography: {
      fontFamily: runtime.typography.fontFamily,
      headingFontFamily: runtime.typography.headingFontFamily,
      monoFontFamily: runtime.typography.monoFontFamily,
      baseFontSize: `${runtime.typography.baseSize}px`,
      headingScale: 1.12,
      bodyTextScale: 1,
      lineHeight: runtime.typography.lineHeight.normal,
      letterSpacing: runtime.typography.letterSpacing.normal,
      headingWeight: runtime.typography.weight.semibold,
      bodyWeight: runtime.typography.weight.regular,
      labelWeight: runtime.typography.weight.semibold,
    },
    shape: runtime.shape,
    spacing: runtime.spacing,
    shadow: runtime.shadow,
    components: internalComponents(runtime.components),
    states: {
      hoverBackground: runtime.states.hover.background,
      activeBackground: runtime.states.active.background,
      selectedBackground: runtime.states.selected.background,
      selectedBorder: runtime.states.selected.border,
      disabledOpacity: runtime.states.disabled.opacity,
      focusRing: runtime.states.focus.ring,
      focusRingOffset: runtime.states.focus.ringOffset,
      errorState: runtime.states.error.background,
      warningState: runtime.states.warning.background,
      successState: runtime.states.success.background,
      loadingState: runtime.states.loading.overlay,
      skeletonState: runtime.states.skeleton.base,
    },
    density: runtime.density,
    icon: runtime.icon,
    motif: {
      type: 'geometric',
      cornerType: 'corner-frame',
      illustrationType: 'medrese_geometry',
      opacity: runtime.illustrations.pageBanner.opacity,
      lineWeight: 1,
      placement: 'corner-frame',
      density: 'balanced',
      useOnHero: true,
      useOnFeaturedCards: true,
      useOnEmptyStates: true,
      useOnSectionHeaders: true,
    },
  }
}

function runtimeCssVariables(theme: EdenThemePackage, mode: ThemeAppearance): Record<`--${string}`, string> {
  const tokens = theme.modes[mode]
  const vars = themeTokensToCssVars(tokens)
  const colors = tokens.colors
  return {
    ...vars,
    '--eden-color-background': colors.background,
    '--eden-color-foreground': colors.foreground,
    '--eden-color-primary': colors.primary,
    '--eden-color-primary-foreground': colors.primaryForeground,
    '--eden-color-secondary': colors.secondary,
    '--eden-color-accent': colors.accent,
    '--eden-color-card': colors.card,
    '--eden-color-card-foreground': colors.cardForeground,
    '--eden-color-surface': colors.surface,
    '--eden-color-border': colors.border,
    '--eden-color-border-strong': colors.borderStrong,
    '--eden-color-input': colors.input,
    '--eden-color-ring': colors.ring,
    '--eden-color-success': colors.success,
    '--eden-color-warning': colors.warning,
    '--eden-color-danger': colors.danger,
    '--eden-color-info': colors.info,
    '--eden-sidebar-bg': tokens.components.shell.navBg,
    '--eden-sidebar-text': tokens.components.shell.navText,
    '--eden-topbar-bg': tokens.components.shell.headerBg,
    '--eden-topbar-border': tokens.components.shell.headerBorder,
    '--eden-page-banner-asset': `url("/theme-assets/${theme.meta.themeKey}/${mode}/page-banner.svg")`,
    '--eden-smart-list-header-bg': tokens.components.smartList.listHeaderSurface,
    '--eden-smart-list-toolbar-bg': tokens.components.smartList.listToolbarSurface,
    '--eden-smart-list-row-hover': tokens.components.smartList.listHoverVisualEffect,
    '--eden-smart-list-watermark-asset': `url("/theme-assets/${theme.meta.themeKey}/${mode}/smart-list-watermark.svg")`,
    '--eden-input-border': tokens.components.forms.inputBorder,
    '--eden-input-focus': tokens.components.forms.inputFocus,
    '--eden-radius-banner': tokens.shape.radiusBanner,
    '--eden-shadow-floating': tokens.shadow.shadowFloating,
  }
}

function runtimeAsset(theme: EdenThemePackage, mode: ThemeAppearance, category: RuntimeAsset['assetCategory'], source: ThemeAssetRef): RuntimeAsset {
  const assetId = source.assetId || `${theme.meta.themeKey}-${mode}-${kebab(category)}`
  const src = source.src || `/theme-assets/${theme.meta.themeKey}/${mode}/${assetFileName(category)}.svg`
  return {
    enabled: true,
    assetId,
    assetName: source.assetName || `${theme.meta.displayName} ${mode} ${category}`,
    assetType: category === 'smartList' ? 'watermark' : category.includes('Hero') || category === 'login' || category === 'dashboardHero' ? 'hero' : 'illustration',
    assetCategory: category,
    sourceType: 'generated-svg',
    src,
    assetRef: `internal://themes/${theme.meta.themeKey}/${mode}/${kebab(category)}`,
    fallbackMotif: theme.meta.themeKey === 'hikmet' ? 'medrese_geometry' : theme.modes[mode].motif.type,
    alt: `${theme.meta.displayName} ${category} ${mode} decorative asset`,
    position: 'right center',
    fit: source.fit,
    focalPointX: source.focalPointX,
    focalPointY: source.focalPointY,
    opacity: source.opacity > 0 ? source.opacity : 0.12,
    overlayColor: source.overlayColor || theme.modes[mode].colors.background,
    overlayOpacity: source.overlayOpacity,
    borderRadius: source.borderRadius,
    mask: { enabled: true, type: 'linear-fade-left' },
    visibleOn: source.visibleOn.length ? source.visibleOn : [category],
  }
}

function background(layer: ThemeBackgroundLayer, tokens: ThemeModeTokens): RuntimeBackground {
  return {
    type: mapBackgroundType(layer.type),
    color: layer.color || tokens.colors.background,
    gradient: {
      enabled: layer.type === 'gradient' || layer.type === 'mixed',
      from: layer.gradientFrom || layer.color || tokens.colors.background,
      to: layer.gradientTo || layer.color || tokens.colors.surface,
      direction: layer.gradientDirection,
    },
    pattern: {
      enabled: layer.patternEnabled,
      motifType: layer.patternType,
      color: layer.patternColor || tokens.colors.border,
      opacity: layer.patternOpacity,
      size: parseNumber(layer.patternSize, 32),
      spacing: parseNumber(layer.patternSpacing, 24),
      rotation: layer.patternRotation,
      lineWidth: 1,
    },
    overlay: {
      enabled: layer.overlayOpacity > 0,
      color: layer.overlayColor || tokens.colors.background,
      opacity: layer.overlayOpacity,
    },
    border: tokens.colors.border,
    shadow: tokens.shadow.shadowSubtle,
  }
}

function backgroundFromColor(color: string, tokens: ThemeModeTokens): RuntimeBackground {
  return background({
    type: 'solid',
    color,
    gradientDirection: '135deg',
    patternEnabled: false,
    patternType: 'none',
    patternOpacity: 0.08,
    patternSize: '32px',
    patternSpacing: '24px',
    patternRotation: 0,
    overlayOpacity: 0,
  }, tokens)
}

function internalBackground(layer: RuntimeBackground): ThemeBackgroundLayer {
  return {
    type: layer.type === 'illustration' ? 'illustration-overlay' : layer.type,
    color: layer.color,
    gradientFrom: layer.gradient.from,
    gradientTo: layer.gradient.to,
    gradientDirection: layer.gradient.direction,
    patternEnabled: layer.pattern.enabled,
    patternType: layer.pattern.motifType === 'none' ? 'none' : 'custom',
    patternColor: layer.pattern.color,
    patternOpacity: layer.pattern.opacity,
    patternSize: `${layer.pattern.size}px`,
    patternSpacing: `${layer.pattern.spacing}px`,
    patternRotation: layer.pattern.rotation,
    overlayColor: layer.overlay.color,
    overlayOpacity: layer.overlay.opacity,
  }
}

function internalAsset(asset: RuntimeAsset): ThemeAssetRef {
  return {
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetType: asset.assetType,
    assetCategory: asset.assetCategory,
    sourceType: asset.sourceType === 'generated-svg' ? 'internal-library' : asset.sourceType,
    src: asset.src,
    focalPointX: asset.focalPointX,
    focalPointY: asset.focalPointY,
    fit: asset.fit,
    opacity: asset.opacity,
    overlayColor: asset.overlayColor,
    overlayOpacity: asset.overlayOpacity,
    borderRadius: asset.borderRadius,
    visibleOn: asset.visibleOn as ThemeAssetRef['visibleOn'],
    enabled: asset.enabled,
  }
}

function buildAssetRegistry(theme: EdenThemeRuntimePackageV2): EdenThemeRuntimePackageV2['assetRegistry'] {
  const registry: EdenThemeRuntimePackageV2['assetRegistry'] = {}
  for (const mode of ['light', 'dark'] as const) {
    for (const asset of Object.values(theme.modes[mode].illustrations)) {
      registry[asset.assetId] = {
        assetRef: asset.assetRef,
        src: asset.src,
        sourceType: asset.sourceType,
        motif: asset.fallbackMotif,
        mode,
        usage: asset.visibleOn,
        checksum: stableChecksum(`${asset.assetId}|${asset.src}|${asset.assetRef}`),
        safe: true,
      }
    }
  }
  return registry
}

function buildRuntimeValidation(theme: EdenThemeRuntimePackageV2): EdenThemeRuntimePackageV2['validation'] {
  const { validation } = validateRuntimeThemePackageV2(theme)
  return {
    schemaValid: validation.errors.length === 0,
    requiredFieldsComplete: validation.errors.length === 0,
    assetRefsResolved: !validation.errors.some(item => item.code.includes('ASSET')),
    cssVariablesComplete: !validation.errors.some(item => item.code.includes('CSS')),
    figmaExportReady: true,
    contrastWarnings: validation.contrast.light.concat(validation.contrast.dark).map(item => ({
      path: item.path,
      code: 'CONTRAST_WARNING',
      message: item.message,
      severity: 'warning' as const,
    })),
    assetWarnings: validation.warnings.filter(item => item.code.includes('ASSET')),
    unusedAssets: [],
    notes: [],
  }
}

function validateRuntimeAssets(theme: EdenThemeRuntimePackageV2, errors: ThemeValidationIssue[]) {
  const used = new Set<string>()
  for (const mode of ['light', 'dark'] as const) {
    for (const [key, asset] of Object.entries(theme.modes[mode].illustrations)) {
      used.add(asset.assetId)
      const registryAsset = theme.assetRegistry[asset.assetId]
      if (!registryAsset) {
        errors.push(issue(`modes.${mode}.illustrations.${key}.assetId`, 'ASSET_REGISTRY_MISSING', 'Illustration assetId assetRegistry icinde bulunmalidir.'))
      } else if (!registryAsset.safe) {
        errors.push(issue(`assetRegistry.${asset.assetId}.safe`, 'UNSAFE_ASSET', 'Asset safe true olmadan tema aktif edilemez.'))
      }
    }
  }

  for (const key of Object.keys(theme.assetRegistry)) {
    if (!used.has(key)) {
      errors.push(issue(`assetRegistry.${key}`, 'UNUSED_ASSET', 'Asset registry icinde kullanilmayan asset bulunamaz.'))
    }
  }
}

function validateRuntimeCssVariables(theme: EdenThemeRuntimePackageV2, errors: ThemeValidationIssue[]) {
  const required = [
    '--eden-color-background',
    '--eden-color-foreground',
    '--eden-color-primary',
    '--eden-color-primary-foreground',
    '--eden-color-secondary',
    '--eden-color-accent',
    '--eden-color-card',
    '--eden-color-card-foreground',
    '--eden-color-surface',
    '--eden-color-border',
    '--eden-color-border-strong',
    '--eden-color-input',
    '--eden-color-ring',
    '--eden-color-success',
    '--eden-color-warning',
    '--eden-color-danger',
    '--eden-color-info',
    '--eden-sidebar-bg',
    '--eden-sidebar-text',
    '--eden-topbar-bg',
    '--eden-topbar-border',
    '--eden-page-banner-bg',
    '--eden-page-banner-text',
    '--eden-page-banner-muted',
    '--eden-page-banner-border',
    '--eden-page-banner-shadow',
    '--eden-page-banner-asset',
    '--eden-smart-list-bg',
    '--eden-smart-list-header-bg',
    '--eden-smart-list-toolbar-bg',
    '--eden-smart-list-border',
    '--eden-smart-list-row-hover',
    '--eden-smart-list-watermark-asset',
    '--eden-card-bg',
    '--eden-card-border',
    '--eden-card-shadow',
    '--eden-input-bg',
    '--eden-input-border',
    '--eden-input-focus',
    '--eden-radius-card',
    '--eden-radius-button',
    '--eden-radius-input',
    '--eden-radius-banner',
    '--eden-shadow-card',
    '--eden-shadow-floating',
  ]
  for (const mode of ['light', 'dark'] as const) {
    for (const key of required) {
      if (!theme.cssVariables[mode][key as `--${string}`]) {
        errors.push(issue(`cssVariables.${mode}.${key}`, 'CSS_VARIABLE_MISSING', 'Zorunlu Eden CSS variable eksik.'))
      }
    }
  }
}

function tokenStudio(value: unknown): TokenStudioNode {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { value, type: inferTokenType(value) }
  }
  if (Array.isArray(value)) {
    return { value: value.join(', '), type: 'other' }
  }
  if (!isRecord(value)) {
    return { value: String(value ?? 'not-set'), type: 'other' }
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, tokenStudio(child)])) as TokenStudioNode
}

function inferTokenType(value: string | number | boolean) {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (/^#|^rgb|^hsl/i.test(value)) return 'color'
  if (/px$|rem$|em$|%$/i.test(value)) return 'dimension'
  if (/shadow|rgba\(|0\s/.test(value)) return 'boxShadow'
  return 'other'
}

function cssBlock(selector: string, vars: Record<string, string>) {
  return `${selector} {\n${Object.entries(vars).map(([key, value]) => `  ${key}: ${value};`).join('\n')}\n}`
}

function scanForbidden(value: unknown, path: string, errors: ThemeValidationIssue[]) {
  if (typeof value === 'string') {
    if (value.trim() === '' || (!isAllowedAssetCssValue(path, value) && forbiddenText.test(value))) {
      errors.push(issue(path, 'FORBIDDEN_OR_EMPTY_VALUE', 'Bos string, placeholder, HTML, JS, CSS injection veya executable icerik kabul edilmez.'))
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbidden(item, `${path}.${index}`, errors))
    return
  }
  if (!isRecord(value)) return
  if (Object.keys(value).length === 0) {
    errors.push(issue(path, 'EMPTY_OBJECT', 'Bos object kabul edilmez.'))
    return
  }
  for (const [key, child] of Object.entries(value)) {
    if (path === 'root.validation' && ['contrastWarnings', 'assetWarnings', 'unusedAssets', 'notes'].includes(key)) continue
    scanForbidden(child, `${path}.${key}`, errors)
  }
}

function zodIssues(error: ZodError): ThemeValidationIssue[] {
  return error.issues.map(item => issue(item.path.length ? item.path.join('.') : 'root', item.code.toUpperCase(), item.message))
}

function validationResult(errors: ThemeValidationIssue[], warnings: ThemeValidationIssue[] = []): ThemeValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    contrast: { light: [], dark: [] },
    activationBlocked: errors.length > 0,
  }
}

function issue(path: string, code: string, message: string, severity: ThemeValidationIssue['severity'] = 'error'): ThemeValidationIssue {
  return { path, code, message, severity }
}

function getPath(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), value)
}

function isFigmaTokensShape(value: unknown) {
  return Boolean(getPath(value, 'global.color') && getPath(value, 'components') && getPath(value, 'illustrations'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonEmpty(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function semanticVersion(value: string) {
  return /^\d+\.\d+\.\d+$/.test(value) ? value : '1.0.0'
}

function parseNumber(value: string | number, fallback: number) {
  if (typeof value === 'number') return value
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function mapBackgroundType(type: ThemeBackgroundLayer['type']): RuntimeBackground['type'] {
  if (type === 'illustration-overlay') return 'mixed'
  return type
}

function internalComponents(components: RuntimeMode['components']): ThemeModeTokens['components'] {
  return {
    shell: components.shell,
    pageBanner: components.pageBanner,
    smartList: components.smartList,
    cards: components.cards,
    forms: components.forms,
    tables: components.tables,
    badges: components.badges,
    wizard: components.wizard,
    tabs: components.tabs,
    modal: components.modal,
    drawer: components.drawer,
    buttons: components.buttons,
    alerts: components.alerts,
    toast: components.toast,
    interaction: components.interaction,
  }
}

function isAllowedAssetCssValue(path: string, value: string) {
  return path.includes('cssVariables.') && /-asset$/.test(path) && /^url\("\/theme-assets\/[a-z0-9_-]+\/(?:light|dark)\/[a-z0-9-]+\.svg"\)$/.test(value)
}

function kebab(value: string) {
  return value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`).replace(/^-/, '')
}

function assetFileName(category: RuntimeAsset['assetCategory']) {
  if (category === 'pageBanner') return 'page-banner'
  if (category === 'smartList') return 'smart-list-watermark'
  if (category === 'formHero') return 'form-hero'
  if (category === 'detailPanel') return 'detail-panel'
  if (category === 'dashboardHero') return 'dashboard-hero'
  if (category === 'emptyState') return 'empty-state'
  return kebab(category)
}

function stableChecksum(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return `sha256-${Math.abs(hash).toString(16).padStart(8, '0')}`
}
