import { DEFAULT_VISUAL_THEME_ID, themeConcepts, type ThemeConceptId } from '@/components/design-lab/themeConcepts'
import { themeConceptToEdenTheme, themeTokensToCssVars } from './themeTransforms'
import { validateEdenThemePackage } from './themeValidation'
import type { EdenThemePackage, ThemeAppearance, ThemeValidationResult } from './themeSchema'

export const THEME_MANAGEMENT_STORAGE_KEY = 'eden.themeManagement.records'
export const THEME_MANAGEMENT_CHANGE_EVENT = 'eden:theme-management-change'

export type ManagedThemeStatus = 'draft' | 'preview' | 'active' | 'inactive' | 'archived' | 'rejected'
export type ManagedThemeSource = 'system' | 'imported' | 'user_created' | 'generated'
export type ManagedThemeDensity = 'minimal' | 'balanced' | 'rich'
export type ManagedMotifType =
  | 'none'
  | 'geometric'
  | 'botanical'
  | 'horizon'
  | 'circles'
  | 'skyline'
  | 'broken_grid'
  | 'custom_svg'

export interface ManagedThemeComponentTokens {
  shell: Record<string, string>
  pageBanner: Record<string, string>
  cards: Record<string, string>
  forms: Record<string, string>
  tables: Record<string, string>
  badges: Record<string, string>
  wizard: Record<string, string>
  interaction: Record<string, string>
  shape: Record<string, string>
  shadow: Record<string, string>
  density: Record<string, string>
  icon: Record<string, string>
}

export interface ManagedThemeMotifConfig {
  motifType: ManagedMotifType
  bannerEnabled: boolean
  contentEnabled: boolean
  emptyStateEnabled: boolean
  wizardEnabled: boolean
  primaryColor: string
  secondaryColor: string
  warmColor: string
  opacityLight: number
  opacityDark: number
  lineWidth: number
  placement: 'top-right' | 'top-left' | 'bottom-right' | 'background-center' | 'corner-frame'
  density: ManagedThemeDensity
  inlineSvgTemplate: string
  cssBackgroundTemplate: string
}

export interface ManagedThemeAuditEvent {
  eventType: string
  timestamp: string
  summary: string
}

export interface ManagedThemeRecord {
  id: string
  themeKey: string
  displayName: string
  description: string
  status: ManagedThemeStatus
  source: ManagedThemeSource
  artDirection: string
  inspiration: string
  category: string
  supportsLight: boolean
  supportsDark: boolean
  canBeDefault: boolean
  notes: string
  author: string
  version: string
  package: EdenThemePackage
  componentTokens: ManagedThemeComponentTokens
  motif: ManagedThemeMotifConfig
  validation: ThemeValidationResult | null
  createdAt: string
  updatedAt: string
  createdBy: string
  audit: ManagedThemeAuditEvent[]
}

export const SAFE_THEME_KEY_PATTERN = /^[a-z0-9][a-z0-9_]{1,63}$/

export function normalizeManagedThemeKey(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!SAFE_THEME_KEY_PATTERN.test(trimmed)) return null
  return trimmed
}

export function getSystemThemeRecords(): ManagedThemeRecord[] {
  return themeConcepts.map(theme => {
    const themePackage = themeConceptToEdenTheme(theme)
    const validation = validateEdenThemePackage(themePackage).validation
    const now = '2026-06-09T00:00:00.000Z'
    const isDefaultActive = theme.id === DEFAULT_VISUAL_THEME_ID
    return {
      id: `system_${theme.id}`,
      themeKey: theme.id,
      displayName: theme.name,
      description: theme.description,
      status: isDefaultActive ? 'active' : 'inactive',
      source: 'system',
      artDirection: theme.artDirection,
      inspiration: theme.inspiration,
      category: 'system',
      supportsLight: true,
      supportsDark: true,
      canBeDefault: true,
      notes: theme.designerNote,
      author: 'EDEN Teknoloji',
      version: '1.0.0',
      package: themePackage,
      componentTokens: componentTokensFromPackage(themePackage, 'light'),
      motif: {
        motifType: motifTypeFromSystemTheme(theme.id),
        bannerEnabled: theme.motif.useOnHero,
        contentEnabled: theme.motif.useOnSectionHeaders,
        emptyStateEnabled: theme.motif.useOnEmptyStates,
        wizardEnabled: theme.motif.useOnFeaturedCards,
        primaryColor: theme.colors.accentPrimary,
        secondaryColor: theme.colors.accentSecondary,
        warmColor: theme.colors.accentWarm,
        opacityLight: theme.motif.opacity.light,
        opacityDark: theme.motif.opacity.dark,
        lineWidth: theme.motif.lineWeight,
        placement: 'corner-frame',
        density: 'balanced',
        inlineSvgTemplate: '',
        cssBackgroundTemplate: '',
      },
      validation,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      audit: [{ eventType: isDefaultActive ? 'theme_activated' : 'theme_approved', timestamp: now, summary: isDefaultActive ? 'Default system theme is active.' : 'System theme is approved but not active.' }],
    }
  })
}

export function readManagedThemeRecords(): ManagedThemeRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(THEME_MANAGEMENT_STORAGE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.map(sanitizeManagedThemeRecord).filter(Boolean) as ManagedThemeRecord[]
  } catch {
    return []
  }
}

export function writeManagedThemeRecords(records: ManagedThemeRecord[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_MANAGEMENT_STORAGE_KEY, JSON.stringify(records.map(sanitizeManagedThemeRecord).filter(Boolean)))
  window.dispatchEvent(new CustomEvent(THEME_MANAGEMENT_CHANGE_EVENT))
}

export function upsertManagedThemeRecord(record: ManagedThemeRecord) {
  const records = readManagedThemeRecords()
  const next = records
    .filter(item => item.id !== record.id && item.themeKey !== record.themeKey)
    .map(item => record.status === 'active' && item.status === 'active'
      ? withThemeLifecycle(item, 'inactive', 'Automatically deactivated because another system theme was activated.')
      : item)
  writeManagedThemeRecords([record, ...next])
}

export function deleteManagedThemeRecord(recordId: string) {
  writeManagedThemeRecords(readManagedThemeRecords().filter(item => item.id !== recordId))
}

export function listActiveManagedThemeRecords() {
  return readManagedThemeRecords().filter(record => record.status === 'active')
}

export function findManagedThemeRecord(themeKey: string | null | undefined) {
  if (!themeKey) return null
  return readManagedThemeRecords().find(record => record.themeKey === themeKey && record.status === 'active') || null
}

export function getManagedThemeCssVars(themeKey: string, appearance: ThemeAppearance) {
  const record = findManagedThemeRecord(themeKey)
  if (!record) return null
  return themeTokensToCssVars(record.package.tokens[appearance])
}

export function createDraftThemeRecord(options: {
  displayName: string
  themeKey: string
  description?: string
  artDirection?: string
  inspiration?: string
  category?: string
  baseThemeId?: ThemeConceptId
  createdBy?: string
}) {
  const baseTheme = themeConcepts.find(theme => theme.id === options.baseThemeId) || themeConcepts[0]
  const themePackage = {
    ...themeConceptToEdenTheme(baseTheme),
    themeKey: options.themeKey,
    displayName: options.displayName,
    description: options.description || '',
    author: options.createdBy || 'development_admin',
    version: '0.1.0',
    metadata: {
      personality: options.artDirection || baseTheme.artDirection,
      bestFor: options.category || 'custom_theme',
      decorativeMotif: themeConceptToEdenTheme(baseTheme).metadata?.decorativeMotif,
      createdAt: new Date().toISOString(),
      source: 'generated',
    },
  } satisfies EdenThemePackage

  const validation = validateEdenThemePackage(themePackage).validation
  const now = new Date().toISOString()
  return {
    id: `draft_${options.themeKey}_${Date.now()}`,
    themeKey: options.themeKey,
    displayName: options.displayName,
    description: options.description || '',
    status: 'draft',
    source: 'user_created',
    artDirection: options.artDirection || '',
    inspiration: options.inspiration || '',
    category: options.category || 'custom',
    supportsLight: true,
    supportsDark: true,
    canBeDefault: false,
    notes: '',
    author: options.createdBy || 'development_admin',
    version: '0.1.0',
    package: themePackage,
    componentTokens: componentTokensFromPackage(themePackage, 'light'),
    motif: defaultMotifFromPackage(themePackage),
    validation,
    createdAt: now,
    updatedAt: now,
    createdBy: options.createdBy || 'development_admin',
    audit: [{ eventType: 'theme_created', timestamp: now, summary: 'Draft theme created.' }],
  } satisfies ManagedThemeRecord
}

export function createImportedThemeRecord(themePackage: EdenThemePackage, validation: ThemeValidationResult, createdBy = 'development_admin') {
  const now = new Date().toISOString()
  return {
    id: `imported_${themePackage.themeKey}_${Date.now()}`,
    themeKey: themePackage.themeKey,
    displayName: themePackage.displayName,
    description: themePackage.description || '',
    status: validation.valid ? 'preview' : 'rejected',
    source: 'imported',
    artDirection: textMetadata(themePackage.metadata?.personality),
    inspiration: '',
    category: textMetadata(themePackage.metadata?.bestFor) || 'imported',
    supportsLight: true,
    supportsDark: true,
    canBeDefault: false,
    notes: 'Imported JSON theme. Activation requires validation.',
    author: themePackage.author || createdBy,
    version: themePackage.version,
    package: {
      ...themePackage,
      metadata: {
        ...(themePackage.metadata || {}),
        source: 'imported',
        importedAt: now,
      },
    },
    componentTokens: componentTokensFromPackage(themePackage, 'light'),
    motif: defaultMotifFromPackage(themePackage),
    validation,
    createdAt: now,
    updatedAt: now,
    createdBy,
    audit: [{ eventType: 'theme_imported', timestamp: now, summary: validation.valid ? 'Theme imported as preview.' : 'Theme import rejected.' }],
  } satisfies ManagedThemeRecord
}

export function withThemeLifecycle(record: ManagedThemeRecord, status: ManagedThemeStatus, summary: string) {
  const now = new Date().toISOString()
  const next = {
    ...record,
    status,
    updatedAt: now,
    audit: [
      { eventType: `theme_${status}`, timestamp: now, summary },
      ...record.audit,
    ],
  }
  return validateManagedTheme(next)
}

export function validateManagedTheme(record: ManagedThemeRecord) {
  const validation = validateEdenThemePackage(record.package).validation
  return {
    ...record,
    validation,
    package: {
      ...record.package,
      themeKey: record.themeKey,
      displayName: record.displayName,
      description: record.description,
      author: record.author,
      version: record.version,
    },
  }
}

export function componentTokensFromPackage(themePackage: EdenThemePackage, appearance: ThemeAppearance): ManagedThemeComponentTokens {
  const vars = themeTokensToCssVars(themePackage.tokens[appearance])
  return {
    shell: pickVars(vars, {
      navBg: '--eden-nav-bg',
      navText: '--eden-nav-text',
      navMuted: '--eden-nav-muted',
      navHoverBg: '--eden-nav-hover-bg',
      navActiveBg: '--eden-nav-active-bg',
      navActiveText: '--eden-nav-active-text',
      headerBg: '--eden-header-bg',
      headerBorder: '--eden-header-border',
    }),
    pageBanner: pickVars(vars, {
      pageBannerBg: '--eden-accent',
      pageBannerText: '--eden-accent-text',
      pageBannerMuted: '--eden-text-soft',
      pageBannerAccent: '--eden-accent-warm',
      pageBannerBorder: '--eden-border',
      pageBannerShadow: '--eden-shadow-card',
    }),
    cards: pickVars(vars, {
      cardBg: '--eden-card-bg',
      cardBorder: '--eden-card-border',
      cardShadow: '--eden-card-shadow',
      cardHoverBg: '--eden-surface-muted',
    }),
    forms: pickVars(vars, {
      inputBg: '--eden-input-bg',
      inputBorder: '--eden-input-border',
      inputFocus: '--eden-input-focus',
      inputPlaceholder: '--eden-text-soft',
      inputDisabledBg: '--eden-surface-muted',
    }),
    tables: pickVars(vars, {
      tableHeaderBg: '--eden-table-header-bg',
      tableHeaderText: '--eden-text',
      tableBorder: '--eden-border',
      tableRowHover: '--eden-table-row-hover',
      tableRowSelected: '--eden-table-row-selected',
      smartListBg: '--eden-surface-muted',
      smartListBorder: '--eden-border',
      smartListHover: '--eden-table-row-hover',
    }),
    badges: {
      badgeNeutralBg: vars['--eden-badge-bg'],
      badgeNeutralText: vars['--eden-text'],
      badgeSuccessBg: vars['--eden-success-soft'],
      badgeSuccessText: vars['--eden-success'],
      badgeWarningBg: vars['--eden-warning-soft'],
      badgeWarningText: vars['--eden-warning'],
      badgeDangerBg: vars['--eden-danger-soft'],
      badgeDangerText: vars['--eden-danger'],
      badgeInfoBg: vars['--eden-info-soft'],
      badgeInfoText: vars['--eden-info'],
    },
    wizard: {
      wizardBg: vars['--eden-bg'],
      wizardPanelBg: vars['--eden-surface'],
      wizardPanelBorder: vars['--eden-border'],
      wizardStepBg: vars['--eden-surface-muted'],
      wizardStepActiveBg: vars['--eden-accent'],
      wizardStepActiveText: vars['--eden-accent-text'],
      wizardStepCompleteBg: vars['--eden-success-soft'],
      wizardStepLine: vars['--eden-border'],
      wizardSummaryBg: vars['--eden-surface-raised'],
      wizardSidebarBg: vars['--eden-surface-muted'],
      wizardSidebarBorder: vars['--eden-border'],
    },
    interaction: {
      focusRing: vars['--eden-focus-ring'],
      hoverOverlay: vars['--eden-surface-muted'],
      selectedOverlay: vars['--eden-accent-soft'],
    },
    shape: {
      radiusSmall: vars['--eden-radius-sm'],
      radiusMedium: vars['--eden-radius-md'],
      radiusLarge: vars['--eden-radius-lg'],
      radiusCard: vars['--eden-radius-card'],
      radiusButton: vars['--eden-radius-button'],
      radiusInput: vars['--eden-radius-input'],
      radiusBanner: vars['--eden-radius-card'],
      radiusWizard: vars['--eden-radius-lg'],
    },
    shadow: {
      shadowSubtle: vars['--eden-shadow-subtle'],
      shadowCard: vars['--eden-shadow-card'],
      shadowFloating: vars['--eden-shadow-floating'],
      shadowFocus: vars['--eden-shadow-focus'],
      shadowBanner: vars['--eden-shadow-card'],
    },
    density: {
      tableRowHeight: vars['--eden-table-row-height'],
      formFieldHeight: vars['--eden-form-field-height'],
      cardPadding: vars['--eden-card-padding'],
      sectionGap: vars['--eden-section-gap'],
    },
    icon: {
      iconStroke: vars['--eden-icon-stroke'],
      iconContainerBg: vars['--eden-icon-container-bg'],
      iconContainerBorder: vars['--eden-icon-container-border'],
      moduleIconBg: vars['--eden-module-icon-bg'],
      statusIconBg: vars['--eden-status-icon-bg'],
    },
  }
}

function pickVars(vars: Record<`--${string}`, string>, mapping: Record<string, `--${string}`>) {
  return Object.fromEntries(Object.entries(mapping).map(([key, token]) => [key, vars[token] || ''])) as Record<string, string>
}

function defaultMotifFromPackage(themePackage: EdenThemePackage): ManagedThemeMotifConfig {
  const motif = themePackage.metadata?.decorativeMotif
  const light = themePackage.tokens.light.color
  return {
    motifType: motif ? motifTypeFromDecorativeStyle(motif.style) : 'geometric',
    bannerEnabled: motif?.useOnHero ?? true,
    contentEnabled: motif?.useOnSectionHeaders ?? true,
    emptyStateEnabled: motif?.useOnEmptyStates ?? true,
    wizardEnabled: motif?.useOnFeaturedCards ?? true,
    primaryColor: light.accent.primary,
    secondaryColor: light.accent.secondary,
    warmColor: light.warning,
    opacityLight: motif?.opacity.light ?? 0.16,
    opacityDark: motif?.opacity.dark ?? 0.1,
    lineWidth: motif?.lineWeight ?? 1,
    placement: 'corner-frame',
    density: 'balanced',
    inlineSvgTemplate: '',
    cssBackgroundTemplate: '',
  }
}

function motifTypeFromSystemTheme(id: ThemeConceptId): ManagedMotifType {
  if (id === 'tabiat') return 'botanical'
  if (id === 'bozkir') return 'horizon'
  if (id === 'esitlik') return 'circles'
  if (id === 'atlas') return 'skyline'
  if (id === 'avangard') return 'broken_grid'
  return 'geometric'
}

function motifTypeFromDecorativeStyle(style: string): ManagedMotifType {
  if (style.includes('botanical')) return 'botanical'
  if (style.includes('horizon') || style.includes('sun')) return 'horizon'
  if (style.includes('rings')) return 'circles'
  if (style.includes('deco')) return 'skyline'
  if (style.includes('grid')) return 'broken_grid'
  return 'geometric'
}

function textMetadata(value: unknown) {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join(', ')
  return typeof value === 'string' ? value : ''
}

function sanitizeManagedThemeRecord(value: unknown): ManagedThemeRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as ManagedThemeRecord
  const themeKey = normalizeManagedThemeKey(record.themeKey)
  if (!themeKey || !record.package) return null
  const status: ManagedThemeStatus = ['draft', 'preview', 'active', 'inactive', 'archived', 'rejected'].includes(record.status)
    ? record.status
    : 'draft'
  return {
    ...record,
    themeKey,
    status,
    displayName: String(record.displayName || themeKey).slice(0, 80),
    description: String(record.description || '').slice(0, 280),
    source: ['system', 'imported', 'user_created', 'generated'].includes(record.source) ? record.source : 'user_created',
    componentTokens: record.componentTokens || componentTokensFromPackage(record.package, 'light'),
    motif: record.motif || defaultMotifFromPackage(record.package),
    audit: Array.isArray(record.audit) ? record.audit.slice(0, 100) : [],
  }
}
