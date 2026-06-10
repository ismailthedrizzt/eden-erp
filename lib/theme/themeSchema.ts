import { z } from 'zod'

export const THEME_SCHEMA_VERSION = '2.0.0'
export const SUPPORTED_THEME_SCHEMA_VERSIONS = [THEME_SCHEMA_VERSION] as const
export const THEME_IMPORT_PREVIEW_STORAGE_KEY = 'eden.themeImportPreview.v2'
export const MAX_THEME_JSON_BYTES = 512 * 1024

export const THEME_MODE_VALUES = ['light', 'dark'] as const
export const DENSITY_VALUES = ['compact', 'balanced', 'comfortable'] as const
export const ICON_CONTAINER_STYLES = ['soft', 'outlined', 'solid', 'minimal'] as const
export const THEME_LIFECYCLE_STATUSES = ['draft', 'review', 'approved', 'active', 'archived', 'rejected'] as const
export const THEME_ASSET_SOURCE_TYPES = ['upload', 'internal-library', 'url-reference'] as const
export const THEME_ASSET_FITS = ['cover', 'contain', 'fill'] as const
export const THEME_ASSET_VISIBILITY = ['banner', 'list', 'form', 'wizard', 'login', 'dashboard'] as const
export const THEME_BACKGROUND_TYPES = ['solid', 'gradient', 'pattern', 'illustration', 'illustration-overlay', 'mixed'] as const
export const THEME_PATTERN_TYPES = ['none', 'finance', 'bank', 'abstract', 'grid', 'dots', 'custom'] as const
export const THEME_MOTIF_TYPES = ['none', 'geometric', 'botanical', 'horizon', 'circles', 'skyline', 'broken_grid', 'custom_svg'] as const

export type ThemeAppearance = typeof THEME_MODE_VALUES[number]
export type ThemeModeName = ThemeAppearance
export type ThemeDensity = typeof DENSITY_VALUES[number]
export type IconContainerStyle = typeof ICON_CONTAINER_STYLES[number]
export type ThemeLifecycleStatus = typeof THEME_LIFECYCLE_STATUSES[number]
export type ThemeAssetSourceType = typeof THEME_ASSET_SOURCE_TYPES[number]
export type ThemeAssetFit = typeof THEME_ASSET_FITS[number]
export type ThemeAssetVisibility = typeof THEME_ASSET_VISIBILITY[number]
export type ThemeBackgroundType = typeof THEME_BACKGROUND_TYPES[number]
export type ThemePatternType = typeof THEME_PATTERN_TYPES[number]
export type ThemeMotifType = typeof THEME_MOTIF_TYPES[number]
export type ThemeExportFormat = 'eden' | 'figma' | 'css' | 'readme'

const safeKeySchema = z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/)
const shortTextSchema = z.string().trim().min(1).max(160)
const longTextSchema = z.string().trim().max(1000)
const colorSchema = z.string().trim().regex(/^(#(?:[0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\)|hsla?\(\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}%\s*,\s*[0-9]{1,3}%(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\))$/i)
const safeCssValueSchema = z.string().trim().min(1).max(240)
const opacitySchema = z.number().min(0).max(1)

export const themeAssetRefSchema = z.object({
  assetId: z.string().trim().max(120).optional(),
  assetName: z.string().trim().max(160).optional(),
  assetType: z.string().trim().max(80).optional(),
  assetCategory: z.string().trim().max(80).optional(),
  sourceType: z.enum(THEME_ASSET_SOURCE_TYPES).default('internal-library'),
  src: z.string().trim().max(520).optional(),
  lightVariant: z.string().trim().max(520).optional(),
  darkVariant: z.string().trim().max(520).optional(),
  focalPointX: z.number().min(0).max(100).default(50),
  focalPointY: z.number().min(0).max(100).default(50),
  fit: z.enum(THEME_ASSET_FITS).default('cover'),
  opacity: opacitySchema.default(1),
  overlayColor: colorSchema.optional(),
  overlayOpacity: opacitySchema.default(0),
  borderRadius: safeCssValueSchema.default('16px'),
  visibleOn: z.array(z.enum(THEME_ASSET_VISIBILITY)).default([]),
  enabled: z.boolean().default(false),
}).strict()

export const themeBackgroundLayerSchema = z.object({
  type: z.enum(THEME_BACKGROUND_TYPES).default('solid'),
  color: colorSchema.optional(),
  gradientFrom: colorSchema.optional(),
  gradientTo: colorSchema.optional(),
  gradientDirection: z.string().trim().max(40).default('135deg'),
  patternEnabled: z.boolean().default(false),
  patternType: z.enum(THEME_PATTERN_TYPES).default('none'),
  patternColor: colorSchema.optional(),
  patternOpacity: opacitySchema.default(0.08),
  patternSize: safeCssValueSchema.default('32px'),
  patternSpacing: safeCssValueSchema.default('24px'),
  patternRotation: z.number().min(-360).max(360).default(0),
  overlayColor: colorSchema.optional(),
  overlayOpacity: opacitySchema.default(0),
  image: themeAssetRefSchema.optional(),
}).strict()

export const themeIllustrationGroupSchema = z.object({
  pageBanner: z.object({
    light: themeAssetRefSchema,
    dark: themeAssetRefSchema,
    fallback: themeAssetRefSchema.optional(),
    backgroundType: z.enum(THEME_BACKGROUND_TYPES).default('illustration-overlay'),
    placement: z.enum(['top-right', 'top-left', 'center', 'bottom-right', 'background-center']).default('top-right'),
    sizing: z.enum(['cover', 'contain', 'auto']).default('cover'),
    cropBehavior: z.enum(['safe-center', 'focal-point', 'edge-fade']).default('edge-fade'),
    cornerDecoration: z.enum(['none', 'geometric', 'botanical', 'horizon', 'skyline', 'broken_grid']).default('geometric'),
    frameStyle: z.enum(['none', 'thin', 'double', 'ornamental', 'technical']).default('thin'),
  }).strict(),
  listArea: z.object({
    headerDecoration: themeAssetRefSchema,
    panelIllustration: themeAssetRefSchema,
    watermark: themeAssetRefSchema,
    emptyState: themeAssetRefSchema,
    toolbarDecoration: themeAssetRefSchema,
    topStripDecoration: z.string().trim().max(160).default('subtle'),
  }).strict(),
  formArea: z.object({
    heroIllustration: themeAssetRefSchema,
    sideImage: themeAssetRefSchema,
    cornerArt: themeAssetRefSchema,
    logoPlaceholderArtwork: themeAssetRefSchema,
  }).strict(),
  wizardArea: z.object({
    backgroundIllustration: themeAssetRefSchema,
    sideIllustration: themeAssetRefSchema,
    completionIllustration: themeAssetRefSchema,
  }).strict(),
  loginArea: z.object({
    heroImage: themeAssetRefSchema,
    backgroundImage: themeAssetRefSchema,
  }).strict(),
  dashboardArea: z.object({
    welcomeCardImage: themeAssetRefSchema,
    dashboardHeroIllustration: themeAssetRefSchema,
  }).strict(),
}).strict()

export const themeColorTokensSchema = z.object({
  primary: colorSchema,
  primaryForeground: colorSchema,
  secondary: colorSchema,
  secondaryForeground: colorSchema,
  accent: colorSchema,
  accentForeground: colorSchema,
  background: colorSchema,
  foreground: colorSchema,
  surface: colorSchema,
  surfaceMuted: colorSchema,
  surfaceRaised: colorSchema,
  card: colorSchema,
  cardForeground: colorSchema,
  muted: colorSchema,
  mutedForeground: colorSchema,
  border: colorSchema,
  borderStrong: colorSchema,
  input: colorSchema,
  inputForeground: colorSchema,
  ring: colorSchema,
  success: colorSchema,
  successForeground: colorSchema,
  warning: colorSchema,
  warningForeground: colorSchema,
  danger: colorSchema,
  dangerForeground: colorSchema,
  info: colorSchema,
  infoForeground: colorSchema,
}).strict()

const componentTokenSchema = z.record(safeCssValueSchema)

export const themeModeTokensSchema = z.object({
  colors: themeColorTokensSchema,
  background: z.object({
    page: themeBackgroundLayerSchema,
    app: themeBackgroundLayerSchema,
    sidebar: themeBackgroundLayerSchema,
    topbar: themeBackgroundLayerSchema,
    login: themeBackgroundLayerSchema,
    dashboard: themeBackgroundLayerSchema,
    form: themeBackgroundLayerSchema,
    list: themeBackgroundLayerSchema,
    modal: themeBackgroundLayerSchema,
    drawer: themeBackgroundLayerSchema,
  }).strict(),
  illustrations: themeIllustrationGroupSchema,
  typography: z.object({
    fontFamily: safeCssValueSchema,
    headingFontFamily: safeCssValueSchema,
    monoFontFamily: safeCssValueSchema,
    baseFontSize: safeCssValueSchema,
    headingScale: z.number().min(0.75).max(2),
    bodyTextScale: z.number().min(0.75).max(1.5),
    lineHeight: z.number().min(1).max(2),
    letterSpacing: safeCssValueSchema,
    headingWeight: z.union([z.string(), z.number()]),
    bodyWeight: z.union([z.string(), z.number()]),
    labelWeight: z.union([z.string(), z.number()]),
  }).strict(),
  shape: z.object({
    radiusSmall: safeCssValueSchema,
    radiusMedium: safeCssValueSchema,
    radiusLarge: safeCssValueSchema,
    radiusXl: safeCssValueSchema,
    radiusCard: safeCssValueSchema,
    radiusInput: safeCssValueSchema,
    radiusButton: safeCssValueSchema,
    radiusBanner: safeCssValueSchema,
    radiusWizard: safeCssValueSchema,
  }).strict(),
  spacing: z.object({
    pagePadding: safeCssValueSchema,
    sectionGap: safeCssValueSchema,
    cardPadding: safeCssValueSchema,
    fieldGap: safeCssValueSchema,
    tableRowHeight: safeCssValueSchema,
    sidebarWidth: safeCssValueSchema,
    topbarHeight: safeCssValueSchema,
  }).strict(),
  shadow: z.object({
    shadowSubtle: safeCssValueSchema,
    shadowCard: safeCssValueSchema,
    shadowFloating: safeCssValueSchema,
    shadowFocus: safeCssValueSchema,
    shadowBanner: safeCssValueSchema,
    modalShadow: safeCssValueSchema,
    dropdownShadow: safeCssValueSchema,
  }).strict(),
  components: z.object({
    shell: componentTokenSchema,
    pageBanner: componentTokenSchema,
    smartList: componentTokenSchema,
    cards: componentTokenSchema,
    forms: componentTokenSchema,
    tables: componentTokenSchema,
    badges: componentTokenSchema,
    wizard: componentTokenSchema,
    tabs: componentTokenSchema,
    modal: componentTokenSchema,
    drawer: componentTokenSchema,
    buttons: componentTokenSchema,
    alerts: componentTokenSchema,
    toast: componentTokenSchema,
    interaction: componentTokenSchema,
  }).strict(),
  states: z.object({
    hoverBackground: safeCssValueSchema,
    activeBackground: safeCssValueSchema,
    selectedBackground: safeCssValueSchema,
    selectedBorder: safeCssValueSchema,
    disabledOpacity: z.number().min(0).max(1),
    focusRing: safeCssValueSchema,
    focusRingOffset: safeCssValueSchema,
    errorState: safeCssValueSchema,
    warningState: safeCssValueSchema,
    successState: safeCssValueSchema,
    loadingState: safeCssValueSchema,
    skeletonState: safeCssValueSchema,
  }).strict(),
  density: z.object({
    table: z.enum(DENSITY_VALUES),
    form: z.enum(DENSITY_VALUES),
    dashboard: z.enum(DENSITY_VALUES),
  }).strict(),
  icon: z.object({
    strokeWidth: z.number().min(1).max(3),
    containerRadius: safeCssValueSchema,
    containerStyle: z.enum(ICON_CONTAINER_STYLES),
    containerBackground: safeCssValueSchema,
    containerBorder: safeCssValueSchema,
    moduleBackgroundOpacity: opacitySchema,
  }).strict(),
  motif: z.object({
    type: z.enum(THEME_MOTIF_TYPES),
    cornerType: shortTextSchema.optional(),
    illustrationType: shortTextSchema.optional(),
    opacity: opacitySchema,
    lineWeight: z.number().min(0).max(4),
    placement: z.enum(['top-right', 'top-left', 'bottom-right', 'background-center', 'corner-frame']),
    density: z.enum(['minimal', 'balanced', 'rich']),
    useOnHero: z.boolean(),
    useOnFeaturedCards: z.boolean(),
    useOnEmptyStates: z.boolean(),
    useOnSectionHeaders: z.boolean(),
  }).strict(),
}).strict()

export const edenThemePackageSchema = z.object({
  schemaVersion: z.literal(THEME_SCHEMA_VERSION),
  meta: z.object({
    id: safeKeySchema,
    themeKey: safeKeySchema,
    displayName: shortTextSchema,
    slug: safeKeySchema,
    description: longTextSchema.default(''),
    author: shortTextSchema.default('EDEN Teknoloji'),
    version: shortTextSchema.default('1.0.0'),
    compatibleApp: z.literal('eden-erp').default('eden-erp'),
    scope: z.literal('system').default('system'),
    defaultMode: z.enum(THEME_MODE_VALUES).default('light'),
    supportedModes: z.array(z.enum(THEME_MODE_VALUES)).min(2).default(['light', 'dark']),
    status: z.enum(THEME_LIFECYCLE_STATUSES).default('draft'),
    isActive: z.boolean().default(false),
    isDefault: z.boolean().default(false),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }).strict(),
  modes: z.object({
    light: themeModeTokensSchema,
    dark: themeModeTokensSchema,
  }).strict(),
  figmaTokens: z.record(z.unknown()).default({}),
  cssVariables: z.object({
    light: z.record(safeCssValueSchema),
    dark: z.record(safeCssValueSchema),
  }).strict(),
  lifecycle: z.object({
    status: z.enum(THEME_LIFECYCLE_STATUSES),
    submittedAt: z.string().optional(),
    approvedAt: z.string().optional(),
    activatedAt: z.string().optional(),
    archivedAt: z.string().optional(),
    reason: z.string().trim().max(500).optional(),
  }).strict(),
  metadata: z.object({
    artDirection: longTextSchema.default(''),
    inspiration: longTextSchema.default(''),
    category: z.string().trim().max(80).default('system'),
    personality: z.array(z.string().trim().max(80)).default([]),
    bestFor: z.array(z.string().trim().max(80)).default([]),
    source: z.enum(['system', 'imported', 'user_created', 'generated']).default('system'),
    notes: longTextSchema.default(''),
    designerNote: longTextSchema.default(''),
  }).strict(),
}).strict()

export type ThemeAssetRef = z.infer<typeof themeAssetRefSchema>
export type ThemeBackgroundLayer = z.infer<typeof themeBackgroundLayerSchema>
export type ThemeIllustrations = z.infer<typeof themeIllustrationGroupSchema>
export type ThemeColorTokens = z.infer<typeof themeColorTokensSchema>
export type ThemeModeTokens = z.infer<typeof themeModeTokensSchema>
export type EdenThemePackage = z.infer<typeof edenThemePackageSchema>

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
  status: Extract<ThemeLifecycleStatus, 'review' | 'rejected'>
  themeKey: string | null
  displayName: string | null
  theme: EdenThemePackage | null
  validation: ThemeValidationResult
  canActivate: boolean
  activationRequiresAdmin: true
  stored: false
}
