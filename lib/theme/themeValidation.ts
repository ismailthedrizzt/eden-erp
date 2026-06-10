import { ZodError } from 'zod'
import { checkThemeContrast } from './themeContrast'
import {
  MAX_THEME_JSON_BYTES,
  THEME_SCHEMA_VERSION,
  edenThemePackageSchema,
  type EdenThemePackage,
  type ThemeValidationIssue,
  type ThemeValidationResult,
} from './themeSchema'

const FORBIDDEN_STRING_PATTERN = /(<\s*script|<\/?[a-z][\s\S]*>|javascript:|@import|url\s*\(|expression\s*\(|data:|base64|<svg|<\/svg|foreignObject|onload\s*=|onclick\s*=|iframe)/i
const EXTERNAL_URL_PATTERN = /^https?:\/\//i
const CSS_VARIABLE_PREFIX = /^--eden-[a-z0-9-]+$/

export function parseAndValidateThemeJson(input: string) {
  const errors: ThemeValidationIssue[] = []
  const byteLength = new TextEncoder().encode(input).length
  if (byteLength > MAX_THEME_JSON_BYTES) {
    errors.push(issue('root', 'MAX_SIZE_EXCEEDED', `Tema JSON ${MAX_THEME_JSON_BYTES} byte limitini asiyor.`))
    return { theme: null, validation: emptyValidation(errors) }
  }

  try {
    return validateEdenThemePackage(JSON.parse(input))
  } catch {
    errors.push(issue('root', 'INVALID_JSON', 'Tema paketi gecerli JSON olmalidir.'))
    return { theme: null, validation: emptyValidation(errors) }
  }
}

export function validateEdenThemePackage(input: unknown): { theme: EdenThemePackage | null; validation: ThemeValidationResult } {
  const errors: ThemeValidationIssue[] = []
  const warnings: ThemeValidationIssue[] = []

  const parsed = edenThemePackageSchema.safeParse(input)
  if (!parsed.success) {
    errors.push(...zodIssues(parsed.error))
    if (isRecord(input) && input.schemaVersion !== THEME_SCHEMA_VERSION) {
      errors.push(issue('schemaVersion', 'V2_REQUIRED', `Temalarimiz artik yalniz schemaVersion ${THEME_SCHEMA_VERSION} kabul eder.`))
    }
    scanForbiddenStrings(input, 'root', errors, warnings)
    return { theme: null, validation: emptyValidation(errors, warnings) }
  }

  scanForbiddenStrings(parsed.data, 'root', errors, warnings)
  validateCssVariableKeys(parsed.data, errors)
  validateAssetSources(parsed.data, errors, warnings)

  const theme = errors.length ? null : parsed.data
  const contrast = theme ? checkThemeContrast(theme.modes) : { light: [], dark: [] }
  const activationBlocked = Boolean(
    errors.length ||
    contrast.light.concat(contrast.dark).some(item => item.severity === 'critical')
  )

  return {
    theme,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
      contrast,
      activationBlocked,
    },
  }
}

function zodIssues(error: ZodError): ThemeValidationIssue[] {
  return error.issues.map(item => issue(
    item.path.length ? item.path.join('.') : 'root',
    item.code.toUpperCase(),
    item.message
  ))
}

function validateCssVariableKeys(theme: EdenThemePackage, errors: ThemeValidationIssue[]) {
  for (const mode of ['light', 'dark'] as const) {
    for (const key of Object.keys(theme.cssVariables[mode])) {
      if (!CSS_VARIABLE_PREFIX.test(key)) {
        errors.push(issue(`cssVariables.${mode}.${key}`, 'INVALID_CSS_VARIABLE_KEY', 'Custom CSS variable key yalniz --eden-* prefixiyle kabul edilir.'))
      }
    }
  }
}

function validateAssetSources(theme: EdenThemePackage, errors: ThemeValidationIssue[], warnings: ThemeValidationIssue[]) {
  for (const [path, asset] of collectAssets(theme)) {
    const src = asset.src || asset.lightVariant || asset.darkVariant || ''
    if (!src) continue
    if (EXTERNAL_URL_PATTERN.test(src)) {
      if (asset.sourceType === 'url-reference') {
        warnings.push(issue(path, 'EXTERNAL_ASSET_REFERENCE', 'External URL asset reference olarak isaretlendi; aktivasyondan once onaylanmali.', 'warning'))
      } else {
        errors.push(issue(path, 'EXTERNAL_ASSET_BLOCKED', 'Upload/internal-library asset dogrudan external URL tasiyamaz.'))
      }
    }
  }
}

function collectAssets(theme: EdenThemePackage) {
  const assets: Array<[string, { sourceType?: string; src?: string; lightVariant?: string; darkVariant?: string }]> = []
  for (const mode of ['light', 'dark'] as const) {
    walk(theme.modes[mode].illustrations, `modes.${mode}.illustrations`)
  }
  return assets

  function walk(value: unknown, path: string) {
    if (!isRecord(value)) return
    if ('sourceType' in value) {
      assets.push([path, value])
      return
    }
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`)
  }
}

function scanForbiddenStrings(value: unknown, path: string, errors: ThemeValidationIssue[], warnings: ThemeValidationIssue[]) {
  if (typeof value === 'string') {
    if (FORBIDDEN_STRING_PATTERN.test(value)) {
      errors.push(issue(path, 'FORBIDDEN_CONTENT', 'Tema paketi JS, HTML, url(), @import, base64, SVG payload veya executable icerik tasiyamaz.'))
      return
    }
    if (EXTERNAL_URL_PATTERN.test(value)) {
      warnings.push(issue(path, 'EXTERNAL_REFERENCE', 'External URL referansi tespit edildi; sadece asset reference olarak sinirli kullanilmalidir.', 'warning'))
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenStrings(item, `${path}.${index}`, errors, warnings))
    return
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      scanForbiddenStrings(child, `${path}.${key}`, errors, warnings)
    }
  }
}

function emptyValidation(errors: ThemeValidationIssue[] = [], warnings: ThemeValidationIssue[] = []): ThemeValidationResult {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
