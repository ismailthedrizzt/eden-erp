'use client'

import { tenantRequestHeaders } from '@/lib/tenancy/client'
import { DEFAULT_UI_PREFERENCES } from './default-ui-preferences'
import { mergeUiPreferences } from './merge-ui-preferences'
import type { UserUiPreferences } from './types'

export const UI_PREFERENCES_STORAGE_KEY = 'eden.uiPreferences'

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
  return mergeUiPreferences(DEFAULT_UI_PREFERENCES, safeParsePreferences(window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY)))
}

export function cacheUiPreferences(preferences: Partial<UserUiPreferences>) {
  if (typeof window === 'undefined') return DEFAULT_UI_PREFERENCES
  const next = mergeUiPreferences(DEFAULT_UI_PREFERENCES, preferences)
  window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
  return next
}

export function updateCachedUiPreferences(patch: unknown) {
  if (typeof window === 'undefined') return DEFAULT_UI_PREFERENCES
  const next = mergeUiPreferences(readCachedUiPreferences(), patch)
  window.localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(next))
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
