import { checkThemeContrast } from './themeContrast'
import {
  ALLOWED_THEME_ROOT_KEYS,
  ALLOWED_TOKEN_TREE,
  DENSITY_VALUES,
  ICON_CONTAINER_STYLES,
  MAX_THEME_JSON_BYTES,
  REQUIRED_TOKEN_PATHS,
  SUPPORTED_THEME_SCHEMA_VERSIONS,
  type EdenThemePackage,
  type ThemeModeTokens,
  type ThemeValidationIssue,
  type ThemeValidationResult,
} from './themeSchema'

type UnknownRecord = Record<string, unknown>

const SAFE_THEME_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/
const COLOR_PATTERN = /^(#(?:[0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\)|hsla?\(\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}%\s*,\s*[0-9]{1,3}%(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\))$/i
const RADIUS_PATTERN = /^(0|[0-9]+(?:\.[0-9]+)?(?:px|rem))$/
const SHADOW_PATTERN = /^(none|[-0-9.,#()%a-z\s]+)$/i
const FONT_PATTERN = /^[a-z0-9\s"',._-]+$/i
const SAFE_TEXT_PATTERN = /^[^<>{}]*$/
const FORBIDDEN_STRING_PATTERN = /(<\s*script|<\/?[a-z][\s\S]*>|javascript:|@import|url\s*\(|expression\s*\(|data:|base64|https?:\/\/|ftp:\/\/|\.woff2?|\.ttf|\.otf|<svg|<\/svg)/i
const CSS_BLOCK_PATTERN = /[{}`]/
const SAFE_FONT_MARKERS = ['system', 'system-ui', 'ui-sans-serif', 'sans-serif', 'arial', 'inter', 'geist', 'plus jakarta']

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

export function validateEdenThemePackage(input: unknown) {
  const errors: ThemeValidationIssue[] = []
  const warnings: ThemeValidationIssue[] = []

  if (!isRecord(input)) {
    errors.push(issue('root', 'INVALID_ROOT', 'Tema paketi JSON object olmalidir.'))
    return { theme: null, validation: emptyValidation(errors, warnings) }
  }

  validateUnknownKeys(input, ALLOWED_THEME_ROOT_KEYS as unknown as string[], 'root', errors)
  validateRootFields(input, errors, warnings)

  const tokens = input.tokens
  if (!isRecord(tokens)) {
    errors.push(issue('tokens', 'REQUIRED', '`tokens` object zorunludur.'))
  } else {
    validateUnknownKeys(tokens, ['light', 'dark'], 'tokens', errors)
    validateModeTokens(tokens.light, 'tokens.light', errors)
    validateModeTokens(tokens.dark, 'tokens.dark', errors)
  }

  scanForbiddenStrings(input, 'root', errors)

  const theme = errors.length ? null : input as unknown as EdenThemePackage
  const contrast = theme
    ? checkThemeContrast(theme.tokens)
    : { light: [], dark: [] }
  const activationBlocked = Boolean(contrast.light.concat(contrast.dark).some(item => item.severity === 'critical'))

  return {
    theme,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
      contrast,
      activationBlocked,
    } satisfies ThemeValidationResult,
  }
}

function validateRootFields(input: UnknownRecord, errors: ThemeValidationIssue[], warnings: ThemeValidationIssue[]) {
  if (!SUPPORTED_THEME_SCHEMA_VERSIONS.includes(input.schemaVersion as any)) {
    errors.push(issue('schemaVersion', 'UNSUPPORTED_SCHEMA_VERSION', `Desteklenen schemaVersion: ${SUPPORTED_THEME_SCHEMA_VERSIONS.join(', ')}`))
  }

  if (typeof input.themeKey !== 'string' || !SAFE_THEME_KEY_PATTERN.test(input.themeKey)) {
    errors.push(issue('themeKey', 'UNSAFE_THEME_KEY', 'themeKey lowercase harf/rakam/underscore/hyphen icermeli ve bosluk icermemelidir.'))
  }

  if (!isSafeShortString(input.displayName, 80)) {
    errors.push(issue('displayName', 'INVALID_DISPLAY_NAME', 'displayName zorunlu ve 1-80 karakter araliginda guvenli metin olmalidir.'))
  }

  if (!isSafeShortString(input.version, 32)) {
    errors.push(issue('version', 'INVALID_VERSION', 'version zorunlu ve guvenli kisa metin olmalidir.'))
  }

  for (const [key, maxLength] of [['description', 280], ['author', 80], ['compatibleApp', 40]] as const) {
    const value = input[key]
    if (value !== undefined && !isSafeShortString(value, maxLength)) {
      errors.push(issue(key, 'INVALID_TEXT', `${key} guvenli ve en fazla ${maxLength} karakter olmalidir.`))
    }
  }

  if (input.compatibleApp && input.compatibleApp !== 'eden-erp') {
    warnings.push(issue('compatibleApp', 'APP_COMPATIBILITY', 'Tema paketi eden-erp disinda bir compatibleApp degeri tasiyor.', 'warning'))
  }

  if (input.metadata !== undefined && !isRecord(input.metadata)) {
    errors.push(issue('metadata', 'INVALID_METADATA', 'metadata object olmalidir.'))
  }
}

function validateModeTokens(input: unknown, path: string, errors: ThemeValidationIssue[]) {
  if (!isRecord(input)) {
    errors.push(issue(path, 'REQUIRED', `${path} object zorunludur.`))
    return
  }

  validateTokenTree(input, ALLOWED_TOKEN_TREE, path, errors)

  for (const tokenPath of REQUIRED_TOKEN_PATHS) {
    const value = getPath(input, tokenPath)
    if (value === undefined) {
      errors.push(issue(`${path}.${tokenPath}`, 'REQUIRED_TOKEN', `${tokenPath} token zorunludur.`))
      continue
    }
    validateTokenValue(`${path}.${tokenPath}`, tokenPath, value, errors)
  }
}

function validateTokenTree(input: UnknownRecord, tree: unknown, path: string, errors: ThemeValidationIssue[]) {
  if (!isRecord(tree)) return
  const allowedKeys = Object.keys(tree)
  validateUnknownKeys(input, allowedKeys, path, errors)

  for (const key of Object.keys(input)) {
    const childTree = (tree as UnknownRecord)[key]
    const child = input[key]
    if (childTree && childTree !== true) {
      if (!isRecord(child)) {
        errors.push(issue(`${path}.${key}`, 'INVALID_GROUP', `${path}.${key} object olmalidir.`))
        continue
      }
      validateTokenTree(child, childTree, `${path}.${key}`, errors)
    }
  }
}

function validateTokenValue(fullPath: string, tokenPath: string, value: unknown, errors: ThemeValidationIssue[]) {
  if (tokenPath.startsWith('color.')) {
    if (typeof value !== 'string' || !COLOR_PATTERN.test(value.trim())) {
      errors.push(issue(fullPath, 'INVALID_COLOR', 'Renk tokenlari sadece hex/rgb/rgba/hsl/hsla formatinda olabilir.'))
    }
    return
  }

  if (tokenPath.startsWith('radius.') || tokenPath === 'icon.containerRadius') {
    if (typeof value !== 'string' || !RADIUS_PATTERN.test(value.trim())) {
      errors.push(issue(fullPath, 'INVALID_RADIUS', 'Radius tokenlari 0, px veya rem olmalidir.'))
    }
    return
  }

  if (tokenPath.startsWith('shadow.')) {
    if (typeof value !== 'string' || !SHADOW_PATTERN.test(value.trim()) || CSS_BLOCK_PATTERN.test(value)) {
      errors.push(issue(fullPath, 'INVALID_SHADOW', 'Shadow tokenlari guvenli CSS shadow degeri veya none olmalidir.'))
    }
    return
  }

  if (tokenPath === 'typography.fontFamily') {
    if (typeof value !== 'string' || !FONT_PATTERN.test(value) || !SAFE_FONT_MARKERS.some(marker => value.toLowerCase().includes(marker))) {
      errors.push(issue(fullPath, 'INVALID_FONT_FAMILY', 'Font family sadece sistem/whitelist font ailesi olmalidir; external font kabul edilmez.'))
    }
    return
  }

  if (tokenPath.endsWith('Weight')) {
    if (!isValidFontWeight(value)) {
      errors.push(issue(fullPath, 'INVALID_FONT_WEIGHT', 'Font weight 100-900 veya normal/medium/semibold/bold olmalidir.'))
    }
    return
  }

  if (tokenPath === 'typography.scale' || tokenPath.startsWith('density.')) {
    if (typeof value !== 'string' || !DENSITY_VALUES.includes(value as any)) {
      errors.push(issue(fullPath, 'INVALID_DENSITY', `Deger ${DENSITY_VALUES.join(', ')} olmalidir.`))
    }
    return
  }

  if (tokenPath === 'icon.strokeWidth') {
    if (typeof value !== 'number' || value < 1 || value > 3) {
      errors.push(issue(fullPath, 'INVALID_ICON_STROKE', 'Icon strokeWidth 1-3 araliginda number olmalidir.'))
    }
    return
  }

  if (tokenPath === 'icon.containerStyle') {
    if (typeof value !== 'string' || !ICON_CONTAINER_STYLES.includes(value as any)) {
      errors.push(issue(fullPath, 'INVALID_ICON_STYLE', `Icon containerStyle ${ICON_CONTAINER_STYLES.join(', ')} olmalidir.`))
    }
    return
  }

  if (tokenPath === 'icon.moduleBackgroundOpacity') {
    if (typeof value !== 'number' || value < 0 || value > 1) {
      errors.push(issue(fullPath, 'INVALID_ICON_OPACITY', 'Icon opacity 0-1 araliginda number olmalidir.'))
    }
  }
}

function scanForbiddenStrings(value: unknown, path: string, errors: ThemeValidationIssue[]) {
  if (typeof value === 'string') {
    if (FORBIDDEN_STRING_PATTERN.test(value) || CSS_BLOCK_PATTERN.test(value) || !SAFE_TEXT_PATTERN.test(value)) {
      errors.push(issue(path, 'FORBIDDEN_CONTENT', 'Tema paketi JS, HTML, URL, CSS block, font dosyasi veya executable payload iceremez.'))
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenStrings(item, `${path}.${index}`, errors))
    return
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      scanForbiddenStrings(child, `${path}.${key}`, errors)
    }
  }
}

function validateUnknownKeys(input: UnknownRecord, allowedKeys: string[], path: string, errors: ThemeValidationIssue[]) {
  const allowed = new Set(allowedKeys)
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      errors.push(issue(`${path}.${key}`, 'UNKNOWN_KEY', 'Schema disinda key kabul edilmez.'))
    }
  }
}

function getPath(input: UnknownRecord, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined
    return current[key]
  }, input)
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSafeShortString(value: unknown, maxLength: number) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maxLength
    && SAFE_TEXT_PATTERN.test(value)
    && !FORBIDDEN_STRING_PATTERN.test(value)
    && !CSS_BLOCK_PATTERN.test(value)
}

function isValidFontWeight(value: unknown) {
  if (typeof value === 'number') return value >= 100 && value <= 900 && value % 100 === 0
  if (typeof value !== 'string') return false
  return /^(100|200|300|400|500|600|700|800|900|normal|medium|semibold|bold)$/i.test(value)
}

function issue(path: string, code: string, message: string, severity: 'error' | 'warning' = 'error'): ThemeValidationIssue {
  return { path, code, message, severity }
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
