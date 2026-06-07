'use client'

import { tenantRequestHeaders } from '@/lib/tenancy/client'
import { DEFAULT_UI_PREFERENCES } from './default-ui-preferences'
import { mergeUiPreferences, normalizeAppearancePreference, normalizeVisualThemePreference } from './merge-ui-preferences'
import type { UserUiPreferences } from './types'

export const UI_PREFERENCES_STORAGE_KEY = 'eden.uiPreferences'
export const VISUAL_THEME_STORAGE_KEY = 'eden.visualTheme'
export const LEGACY_VISUAL_THEME_STORAGE_KEY = 'eden.designLab.activeTheme'
export const LEGACY_APPEARANCE_STORAGE_KEY = 'theme'

function safeParsePreferences(value: string | null): Partial<UserUiPreferences> | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function readCachedUiPreferences() {
  if (typeof window === 'undefined') return DEFAULT_UI_PREFERENCES
  const cached = safeParsePreferences(window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY))
  const cachedAppearance = normalizeAppearancePreference(cached?.appearanceMode || cached?.theme)
  const cachedVisualTheme = normalizeVisualThemePreference(cached?.visualTheme)
  const legacyVisualTheme = cachedVisualTheme ? null : normalizeVisualThemePreference(
    window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY)
      || window.localStorage.getItem(LEGACY_VISUAL_THEME_STORAGE_KEY)
  )
  const legacyAppearance = cachedAppearance ? null : normalizeAppearancePreference(window.localStorage.getItem(LEGACY_APPEARANCE_STORAGE_KEY))
  return mergeUiPreferences(DEFAULT_UI_PREFERENCES, {
    ...(cached || {}),
    ...(legacyAppearance ? { appearanceMode: legacyAppearance, theme: legacyAppearance } : {}),
    ...(legacyVisualTheme ? { visualTheme: legacyVisualTheme } : {}),
  })
}

export function cacheUiPreferences(preferences: Partial<UserUiPreferences>) {
  if (typeof window === 'undefined') return DEFAULT_UI_PREFERENCES
  const next = mergeUiPreferences(DEFAULT_UI_PREFERENCES, preferences)
  window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
  window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, next.visualTheme)
  window.localStorage.setItem(LEGACY_APPEARANCE_STORAGE_KEY, next.appearanceMode)
  return next
}

export function updateCachedUiPreferences(patch: unknown) {
  if (typeof window === 'undefined') return DEFAULT_UI_PREFERENCES
  const next = mergeUiPreferences(readCachedUiPreferences(), patch)
  window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
  window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, next.visualTheme)
  window.localStorage.setItem(LEGACY_APPEARANCE_STORAGE_KEY, next.appearanceMode)
  return next
}

export function getCachedTablePreference<T = Record<string, unknown>>(key: string): T | null {
  const preferences = readCachedUiPreferences()
  const value = preferences.tablePreferences?.[key]
  return value && typeof value === 'object' ? (value as T) : null
}

export async function syncUiPreferencesPatch(patch: unknown) {
  const next = updateCachedUiPreferences(patch)

  const response = await fetch('/api/user/preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...tenantRequestHeaders(),
    },
    body: JSON.stringify({ uiPreferences: patch }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Tercihler kaydedilemedi.')
  }

  return next
}
