import { parseThemeImportTextV2, runtimeThemePackageV2ToInternalTheme, validateRuntimeThemePackageV2 } from './themePackageV2'
import type { EdenThemePackage, ThemeImportPreviewRecord } from './themeSchema'

export function createThemeImportPreview(input: unknown): ThemeImportPreviewRecord {
  const result = typeof input === 'string'
    ? parseThemeImportTextV2(input)
    : parseImportedObject(input)
  const { theme, validation } = result

  if (!validation.valid || !theme) {
    const raw = typeof input === 'string' ? safeJson(input) : input
    return {
      id: `rejected_${Date.now()}`,
      status: 'rejected',
      themeKey: isRecord(raw) && isRecord(raw.meta) && typeof raw.meta.themeKey === 'string' ? raw.meta.themeKey : null,
      displayName: isRecord(raw) && isRecord(raw.meta) && typeof raw.meta.displayName === 'string' ? raw.meta.displayName : null,
      theme: null,
      validation,
      canActivate: false,
      activationRequiresAdmin: true,
      stored: false,
    }
  }

  return {
    id: `review_${theme.meta.themeKey}_${Date.now()}`,
    status: 'review',
    themeKey: theme.meta.themeKey,
    displayName: theme.meta.displayName,
    theme: markImportedPreview(theme),
    validation,
    canActivate: !validation.activationBlocked,
    activationRequiresAdmin: true,
    stored: false,
  }
}

function parseImportedObject(input: unknown) {
  const result = validateRuntimeThemePackageV2(input)
  return {
    kind: result.theme ? 'eden-theme' as const : 'invalid' as const,
    runtimeTheme: result.theme,
    theme: result.theme ? runtimeThemePackageV2ToInternalTheme(result.theme) : null,
    validation: result.validation,
  }
}

export function markImportedPreview(theme: EdenThemePackage): EdenThemePackage {
  const now = new Date().toISOString()
  return {
    ...theme,
    meta: {
      ...theme.meta,
      status: 'review',
      isActive: false,
      updatedAt: now,
    },
    lifecycle: {
      ...theme.lifecycle,
      status: 'review',
      submittedAt: now,
    },
    metadata: {
      ...theme.metadata,
      source: 'imported',
      notes: `${theme.metadata.notes || ''}\nImported as review preview at ${now}.`.trim(),
    },
  }
}

function safeJson(input: string) {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
