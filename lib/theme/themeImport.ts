import { parseAndValidateThemeJson, validateEdenThemePackage } from './themeValidation'
import type { EdenThemePackage, ThemeImportPreviewRecord } from './themeSchema'

export function createThemeImportPreview(input: unknown): ThemeImportPreviewRecord {
  const { theme, validation } = typeof input === 'string'
    ? parseAndValidateThemeJson(input)
    : validateEdenThemePackage(input)

  if (!validation.valid || !theme) {
    return {
      id: `rejected_${Date.now()}`,
      status: 'rejected',
      themeKey: isRecord(input) && typeof input.themeKey === 'string' ? input.themeKey : null,
      displayName: isRecord(input) && typeof input.displayName === 'string' ? input.displayName : null,
      theme: null,
      validation,
      canActivate: false,
      activationRequiresAdmin: true,
      stored: false,
    }
  }

  return {
    id: `preview_${theme.themeKey}_${Date.now()}`,
    status: 'preview',
    themeKey: theme.themeKey,
    displayName: theme.displayName,
    theme: markImportedPreview(theme),
    validation,
    canActivate: !validation.activationBlocked,
    activationRequiresAdmin: true,
    stored: false,
  }
}

export function markImportedPreview(theme: EdenThemePackage): EdenThemePackage {
  return {
    ...theme,
    metadata: {
      ...(theme.metadata || {}),
      source: 'imported',
      importedAt: new Date().toISOString(),
      importStatus: 'preview',
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
