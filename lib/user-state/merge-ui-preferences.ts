import { DEFAULT_UI_PREFERENCES } from './default-ui-preferences'
import type { UiAppearancePreference, UserUiPreferences, VisualThemePreference } from './types'

const APPEARANCE_VALUES = new Set<UiAppearancePreference>(['system', 'light', 'dark'])
const VISUAL_THEME_VALUES = new Set<VisualThemePreference>([
  'classic',
  'hikmet',
  'bozkir',
  'esitlik',
  'tabiat',
  'atlas',
  'avangard',
])
const CUSTOM_VISUAL_THEME_PATTERN = /^[a-z0-9][a-z0-9_]{1,63}$/
const LEGACY_VISUAL_THEME_ALIASES: Record<string, VisualThemePreference> = {
  classicCurrent: 'hikmet',
  executivePremium: 'atlas',
  executive_premium: 'atlas',
  art_deco: 'atlas',
  art_deco_premium: 'atlas',
  anatolianModern: 'bozkir',
  anatolian_modern: 'bozkir',
  anatolian_60s: 'bozkir',
  technicalCommand: 'avangard',
  technical_command: 'avangard',
  command: 'avangard',
  command_bauhaus: 'avangard',
  green_atelier: 'tabiat',
  yesil_atolye: 'tabiat',
  pop_studio: 'avangard',
}

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'appearanceMode',
  'appearance_mode',
  'theme',
  'visualTheme',
  'visual_theme',
  'accentColor',
  'sidebarCollapsed',
  'density',
  'language',
  'dateFormat',
  'timeFormat',
  'defaultLandingPage',
  'tablePreferences',
  'dismissedHints',
  'hasSeenGlobalTour',
  'hasSeenFirstRunWelcome',
  'completedTourSteps',
  'completedPageTours',
  'dismissedPageTours',
  'dismissedOperationHints',
  'preferredHelpMode',
  'lastTourVersion',
  'lastOnboardingVersion',
  'helpLevel',
  'actionGuideIntroSeen',
  'actionCenterIntroSeen',
  'actionGuideDismissed',
  'dismissedFieldHelpers',
  'lockedFieldHintsDismissed',
])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function deepMergeRecords(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(patch)) {
    if (!isSafePreferenceKey(key)) continue

    const current = merged[key]
    if (isPlainRecord(current) && isPlainRecord(value)) {
      merged[key] = deepMergeRecords(current, value)
    } else {
      merged[key] = value
    }
  }

  return merged
}

function isSafePreferenceKey(key: string) {
  const normalized = key.toLowerCase()
  return ![
    'access',
    'auth',
    'jwt',
    'license',
    'permission',
    'policy',
    'role',
    'secret',
    'session',
    'token',
  ].some(term => normalized.includes(term))
}

function shortText(value: unknown, fallback: string, maxLength = 80) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.slice(0, maxLength)
}

export function normalizeAppearancePreference(value: unknown): UiAppearancePreference | null {
  return typeof value === 'string' && APPEARANCE_VALUES.has(value as UiAppearancePreference)
    ? value as UiAppearancePreference
    : null
}

export function normalizeVisualThemePreference(value: unknown): VisualThemePreference | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (VISUAL_THEME_VALUES.has(trimmed as VisualThemePreference)) return trimmed as VisualThemePreference
  if (LEGACY_VISUAL_THEME_ALIASES[trimmed]) return LEGACY_VISUAL_THEME_ALIASES[trimmed]
  return CUSTOM_VISUAL_THEME_PATTERN.test(trimmed) ? trimmed : null
}

function sanitizeJsonPreference(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonPreference)
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => isSafePreferenceKey(key))
        .map(([key, item]) => [key, sanitizeJsonPreference(item)])
    )
  }

  if (
    typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || value === null
  ) {
    return value
  }

  return null
}

function sanitizeTablePreferences(value: unknown): Record<string, unknown> {
  if (!isPlainRecord(value)) return {}
  const sanitized = sanitizeJsonPreference(value)
  return isPlainRecord(sanitized) ? deepMergeRecords({}, sanitized) : {}
}

function sanitizeStringList(value: unknown, maxItems = 200) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
}

export function normalizeUiPreferencesPatch(value: unknown): Partial<UserUiPreferences> {
  if (!isPlainRecord(value)) return {}

  const patch: Partial<UserUiPreferences> = {}

  for (const [key, rawValue] of Object.entries(value)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key) || !isSafePreferenceKey(key)) continue

    switch (key) {
      case 'theme':
      case 'appearanceMode':
      case 'appearance_mode': {
        const appearanceMode = normalizeAppearancePreference(rawValue)
        if (appearanceMode) {
          patch.appearanceMode = appearanceMode
          patch.theme = appearanceMode
        }
        break
      }
      case 'visualTheme':
      case 'visual_theme': {
        const visualTheme = normalizeVisualThemePreference(rawValue)
        if (visualTheme) patch.visualTheme = visualTheme
        break
      }
      case 'accentColor':
        patch.accentColor = shortText(rawValue, DEFAULT_UI_PREFERENCES.accentColor, 32)
        break
      case 'sidebarCollapsed':
        if (typeof rawValue === 'boolean') patch.sidebarCollapsed = rawValue
        break
      case 'density':
        if (rawValue === 'comfortable' || rawValue === 'compact') patch.density = rawValue
        break
      case 'language':
        patch.language = shortText(rawValue, DEFAULT_UI_PREFERENCES.language, 12)
        break
      case 'dateFormat':
        patch.dateFormat = shortText(rawValue, DEFAULT_UI_PREFERENCES.dateFormat, 32)
        break
      case 'timeFormat':
        patch.timeFormat = shortText(rawValue, DEFAULT_UI_PREFERENCES.timeFormat, 16)
        break
      case 'defaultLandingPage':
        patch.defaultLandingPage = shortText(rawValue, DEFAULT_UI_PREFERENCES.defaultLandingPage, 120)
        break
      case 'tablePreferences':
        patch.tablePreferences = sanitizeTablePreferences(rawValue)
        break
      case 'dismissedHints':
        patch.dismissedHints = sanitizeStringList(rawValue, 100)
        break
      case 'hasSeenGlobalTour':
        if (typeof rawValue === 'boolean') patch.hasSeenGlobalTour = rawValue
        break
      case 'hasSeenFirstRunWelcome':
        if (typeof rawValue === 'boolean') patch.hasSeenFirstRunWelcome = rawValue
        break
      case 'completedTourSteps':
        patch.completedTourSteps = sanitizeStringList(rawValue, 300)
        break
      case 'completedPageTours':
        patch.completedPageTours = sanitizeStringList(rawValue, 300)
        break
      case 'dismissedPageTours':
        patch.dismissedPageTours = sanitizeStringList(rawValue, 100)
        break
      case 'dismissedOperationHints':
        patch.dismissedOperationHints = sanitizeStringList(rawValue, 100)
        break
      case 'preferredHelpMode':
        if (rawValue === 'tour' || rawValue === 'guide' || rawValue === 'both') patch.preferredHelpMode = rawValue
        break
      case 'lastTourVersion':
        patch.lastTourVersion = rawValue === null ? null : shortText(rawValue, '', 32)
        break
      case 'lastOnboardingVersion':
        patch.lastOnboardingVersion = rawValue === null ? null : shortText(rawValue, '', 32)
        break
      case 'helpLevel':
        if (rawValue === 'minimal' || rawValue === 'guided' || rawValue === 'detailed') patch.helpLevel = rawValue
        break
      case 'actionGuideIntroSeen':
        if (typeof rawValue === 'boolean') patch.actionGuideIntroSeen = rawValue
        break
      case 'actionCenterIntroSeen':
        if (typeof rawValue === 'boolean') patch.actionCenterIntroSeen = rawValue
        break
      case 'actionGuideDismissed':
        if (typeof rawValue === 'boolean') patch.actionGuideDismissed = rawValue
        break
      case 'dismissedFieldHelpers':
        patch.dismissedFieldHelpers = sanitizeStringList(rawValue, 200)
        break
      case 'lockedFieldHintsDismissed':
        patch.lockedFieldHintsDismissed = sanitizeStringList(rawValue, 200)
        break
    }
  }

  return patch
}

export function mergeUiPreferences(
  base: Partial<UserUiPreferences> | null | undefined,
  patch: unknown
): UserUiPreferences {
  const normalizedBasePatch = normalizeUiPreferencesPatch(base)
  const baseAppearance = normalizedBasePatch.appearanceMode || normalizedBasePatch.theme || DEFAULT_UI_PREFERENCES.appearanceMode
  const baseVisualTheme = normalizedBasePatch.visualTheme || DEFAULT_UI_PREFERENCES.visualTheme
  const normalizedBase = {
    ...DEFAULT_UI_PREFERENCES,
    ...(base || {}),
    ...normalizedBasePatch,
    appearanceMode: baseAppearance,
    theme: baseAppearance,
    visualTheme: baseVisualTheme,
    tablePreferences: {
      ...DEFAULT_UI_PREFERENCES.tablePreferences,
      ...(isPlainRecord(base?.tablePreferences) ? base?.tablePreferences : {}),
    },
    dismissedHints: Array.isArray(base?.dismissedHints)
      ? base.dismissedHints
      : DEFAULT_UI_PREFERENCES.dismissedHints,
    completedTourSteps: Array.isArray(base?.completedTourSteps)
      ? base.completedTourSteps
      : DEFAULT_UI_PREFERENCES.completedTourSteps,
    completedPageTours: Array.isArray(base?.completedPageTours)
      ? base.completedPageTours
      : DEFAULT_UI_PREFERENCES.completedPageTours,
    dismissedPageTours: Array.isArray(base?.dismissedPageTours)
      ? base.dismissedPageTours
      : DEFAULT_UI_PREFERENCES.dismissedPageTours,
    dismissedOperationHints: Array.isArray(base?.dismissedOperationHints)
      ? base.dismissedOperationHints
      : DEFAULT_UI_PREFERENCES.dismissedOperationHints,
    dismissedFieldHelpers: Array.isArray(base?.dismissedFieldHelpers)
      ? base.dismissedFieldHelpers
      : DEFAULT_UI_PREFERENCES.dismissedFieldHelpers,
    lockedFieldHintsDismissed: Array.isArray(base?.lockedFieldHintsDismissed)
      ? base.lockedFieldHintsDismissed
      : DEFAULT_UI_PREFERENCES.lockedFieldHintsDismissed,
  }
  const normalizedPatch = normalizeUiPreferencesPatch(patch)
  const nextAppearanceMode = normalizedPatch.appearanceMode || normalizedPatch.theme || normalizedBase.appearanceMode
  const nextVisualTheme = normalizedPatch.visualTheme || normalizedBase.visualTheme

  return {
    ...normalizedBase,
    ...normalizedPatch,
    appearanceMode: nextAppearanceMode,
    theme: nextAppearanceMode,
    visualTheme: nextVisualTheme,
    tablePreferences: deepMergeRecords(
      normalizedBase.tablePreferences,
      normalizedPatch.tablePreferences || {}
    ),
    dismissedHints: normalizedPatch.dismissedHints || normalizedBase.dismissedHints,
    completedTourSteps: normalizedPatch.completedTourSteps || normalizedBase.completedTourSteps,
    completedPageTours: normalizedPatch.completedPageTours || normalizedBase.completedPageTours,
    dismissedPageTours: normalizedPatch.dismissedPageTours || normalizedBase.dismissedPageTours,
    dismissedOperationHints: normalizedPatch.dismissedOperationHints || normalizedBase.dismissedOperationHints,
    dismissedFieldHelpers: normalizedPatch.dismissedFieldHelpers || normalizedBase.dismissedFieldHelpers,
    lockedFieldHintsDismissed: normalizedPatch.lockedFieldHintsDismissed || normalizedBase.lockedFieldHintsDismissed,
  }
}
