import {
  CANONICAL_THEME_KEYS,
  DEFAULT_VISUAL_THEME_ID,
  VISUAL_THEME_LABELS,
  findThemeConcept,
  getEdenThemeCssVars,
  normalizeThemeConceptId,
  themeConcepts,
  type ThemeAppearanceMode,
  type ThemeConcept,
  type ThemeConceptId,
} from '@/components/design-lab/themeConcepts'

export type EdenThemeKey = 'classic' | 'art_deco_premium' | 'anatolian_60s' | 'green_atelier' | 'pop_studio'
export type EdenAppearance = 'light' | 'dark' | 'system'
export type EdenThemeDefinition = ThemeConcept

export const DEFAULT_EDEN_THEME_KEY: EdenThemeKey = 'classic'

export const EDEN_THEME_KEY_TO_CONCEPT_ID: Record<EdenThemeKey, ThemeConceptId> = {
  classic: 'classic',
  art_deco_premium: 'art_deco',
  anatolian_60s: 'anatolian_60s',
  green_atelier: 'command_bauhaus',
  pop_studio: 'pop_studio',
}

export const EDEN_THEME_REGISTRY = themeConcepts

export {
  CANONICAL_THEME_KEYS,
  DEFAULT_VISUAL_THEME_ID,
  VISUAL_THEME_LABELS,
  findThemeConcept,
  getEdenThemeCssVars,
  normalizeThemeConceptId,
  themeConcepts,
}

export function toThemeConceptId(themeKey: EdenThemeKey | ThemeConceptId | string | null | undefined) {
  if (typeof themeKey === 'string' && themeKey in EDEN_THEME_KEY_TO_CONCEPT_ID) {
    return EDEN_THEME_KEY_TO_CONCEPT_ID[themeKey as EdenThemeKey]
  }
  return normalizeThemeConceptId(themeKey)
}

export function getThemeDefinition(themeKey: EdenThemeKey | ThemeConceptId | string | null | undefined) {
  return findThemeConcept(toThemeConceptId(themeKey) || DEFAULT_VISUAL_THEME_ID)
}

export function getThemeCssVariableMap(themeKey: EdenThemeKey | ThemeConceptId, appearance: ThemeAppearanceMode) {
  return getEdenThemeCssVars(getThemeDefinition(themeKey), appearance)
}
