import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const edenPath = path.join(root, 'src/themes/hikmet/hikmet.eden-theme.json')
const figmaPath = path.join(root, 'src/themes/hikmet/hikmet.figma-tokens.json')

const eden = JSON.parse(fs.readFileSync(edenPath, 'utf8'))
const figma = JSON.parse(fs.readFileSync(figmaPath, 'utf8'))

const errors = [
  ...basicRuntimeErrors(eden),
  ...componentContractErrors(eden),
  ...backgroundErrors(eden),
  ...runtimeOpacityErrors(eden),
  ...assetErrors(eden),
  ...cssVariableErrors(eden),
  ...figmaErrors(figma),
  ...deterministicMapperErrors(eden, figma),
  ...roundtripErrors(eden, figma),
  ...validationFieldErrors(eden),
]

validateNoEmpty(eden)
validateNoEmpty(figma)

if (errors.length) {
  throw new Error(`Hikmet theme package strict validation failed:\n${errors.join('\n')}`)
}

console.log('Hikmet theme package strict validation passed.')

function basicRuntimeErrors(theme) {
  const errors = []
  if (theme.schemaVersion !== '2.0.0') errors.push('Eden schemaVersion must be 2.0.0')
  if (theme.meta?.themeKey !== 'hikmet') errors.push('Eden themeKey must be hikmet')
  if (theme.meta?.scope !== 'system') errors.push('Eden scope must be system')
  if (!theme.modes?.light || !theme.modes?.dark) errors.push('Eden light/dark modes are required')
  if (!theme.cssVariables?.light || !theme.cssVariables?.dark) errors.push('Eden CSS variables are required')
  if (theme.lifecycle?.status !== 'draft') errors.push('Hikmet package must start as draft')
  if (theme.lifecycle?.isActive !== false) errors.push('Imported/exported package must not auto activate')
  if (!Array.isArray(theme.lifecycle?.allowedTransitions)) errors.push('Lifecycle transitions must be present')
  if (!theme.assetRegistry || Object.keys(theme.assetRegistry).length !== 16) errors.push('Asset registry must include exactly 16 generated SVG refs')
  if (theme.figmaTokensRef?.filename !== 'hikmet.figma-tokens.json') errors.push('Figma token reference filename is incorrect')
  return errors
}

function componentContractErrors(theme) {
  const errors = []
  const pageBannerKeys = ['background', 'foreground', 'muted', 'accent', 'border', 'shadow', 'radius', 'illustrationAssetId', 'overlay', 'contentPlacement', 'actionPlacement']
  const smartListKeys = ['containerBg', 'headerSurface', 'toolbarSurface', 'decorativeBackground', 'watermarkAssetId', 'watermarkOpacity', 'emptyStateAssetId', 'topStripDecoration', 'panelBorder', 'rowSeparator', 'rowHover', 'rowSelected', 'filterSurface', 'searchInputBg', 'paginationSurface']
  const wizardKeys = ['wizardBg', 'panelBg', 'panelBorder', 'stepBg', 'stepText', 'stepActiveBg', 'stepActiveText', 'stepCompleteBg', 'stepCompleteText', 'stepLine', 'summaryBg', 'sidebarBg', 'sidebarBorder', 'illustrationAssetId']
  for (const modeName of ['light', 'dark']) {
    const components = theme.modes?.[modeName]?.components
    if (!components) {
      errors.push(`${modeName}.components missing`)
      continue
    }
    for (const key of pageBannerKeys) if (!(key in components.pageBanner)) errors.push(`${modeName}.components.pageBanner.${key} missing`)
    for (const key of smartListKeys) if (!(key in components.smartList)) errors.push(`${modeName}.components.smartList.${key} missing`)
    for (const key of wizardKeys) if (!(key in components.wizard)) errors.push(`${modeName}.components.wizard.${key} missing`)
    if (typeof components.pageBanner.overlay?.opacity === 'string') errors.push(`${modeName}.components.pageBanner.overlay.opacity must be number`)
    if (typeof components.smartList.watermarkOpacity === 'string') errors.push(`${modeName}.components.smartList.watermarkOpacity must be number`)
  }
  return errors
}

function backgroundErrors(theme) {
  const errors = []
  for (const modeName of ['light', 'dark']) {
    for (const [key, background] of Object.entries(theme.modes?.[modeName]?.background ?? {})) {
      if (background.pattern?.enabled && background.pattern.motifType === 'none') {
        errors.push(`${modeName}.background.${key}.pattern motifType cannot be none when enabled`)
      }
      if (background.pattern?.enabled && background.pattern.motifType !== 'medrese_geometry') {
        errors.push(`${modeName}.background.${key}.pattern motifType must be medrese_geometry`)
      }
    }
  }
  return errors
}

function runtimeOpacityErrors(theme) {
  const errors = []
  walk(theme, (value, pathName) => {
    if (/opacity/i.test(pathName) && typeof value === 'string') {
      errors.push(`${pathName} opacity must be number, not string`)
    }
  })
  return errors
}

function assetErrors(theme) {
  const errors = []
  const usedAssetIds = new Set()
  const assetIdToSrc = new Map()

  for (const [modeName, mode] of Object.entries(theme.modes ?? {})) {
    for (const [category, illustration] of Object.entries(mode.illustrations ?? {})) {
      if (!Array.isArray(illustration.visibleOn)) errors.push(`${modeName}.illustrations.${category}.visibleOn must be array`)
      usedAssetIds.add(illustration.assetId)
      const registryEntry = theme.assetRegistry?.[illustration.assetId]
      if (!registryEntry) {
        errors.push(`${modeName}.illustrations.${category} asset id missing from registry: ${illustration.assetId}`)
        continue
      }
      if (registryEntry.src !== illustration.src) {
        errors.push(`${illustration.assetId} src mismatch: illustration=${illustration.src} registry=${registryEntry.src}`)
      }
      if (assetIdToSrc.has(illustration.assetId) && assetIdToSrc.get(illustration.assetId) !== illustration.src) {
        errors.push(`${illustration.assetId} is reused for multiple src values`)
      }
      assetIdToSrc.set(illustration.assetId, illustration.src)
      assertLocalSvgSafe(illustration.assetId, illustration.src, errors)
    }
  }

  for (const [assetId, asset] of Object.entries(theme.assetRegistry ?? {})) {
    if (!usedAssetIds.has(assetId)) errors.push(`unused asset registry entry: ${assetId}`)
    if (!asset.src?.startsWith('/theme-assets/hikmet/')) errors.push(`${assetId} must use local theme-assets path`)
    if (asset.safe !== true) errors.push(`${assetId} must be marked safe`)
    assertLocalSvgSafe(assetId, asset.src, errors)
  }

  return errors
}

function assertLocalSvgSafe(assetId, src, errors) {
  const filePath = path.join(root, 'public', src.replace(/^\//, ''))
  if (!fs.existsSync(filePath)) {
    errors.push(`${assetId} file is missing: ${src}`)
    return
  }
  const svg = fs.readFileSync(filePath, 'utf8')
  if (/<script\b/i.test(svg)) errors.push(`${assetId} svg contains script`)
  if (/<foreignObject\b/i.test(svg)) errors.push(`${assetId} svg contains foreignObject`)
  if (/\son[a-z]+\s*=/i.test(svg)) errors.push(`${assetId} svg contains inline event handler`)
  if (/(href|xlink:href)=["']https?:/i.test(svg)) errors.push(`${assetId} svg contains external reference`)
  if (/base64,/i.test(svg)) errors.push(`${assetId} svg contains base64 payload`)
}

function cssVariableErrors(theme) {
  const errors = []
  const required = ['--eden-nav-active-bg', '--eden-smart-list-hover', '--eden-table-row-hover', '--eden-focus-ring', '--eden-shadow-focus']
  for (const modeName of ['light', 'dark']) {
    const variables = theme.cssVariables?.[modeName] ?? {}
    for (const key of required) {
      if (!(key in variables)) errors.push(`${modeName}.cssVariables.${key} missing`)
      const fallbackKey = `${key}-resolved`
      if (!(fallbackKey in variables)) errors.push(`${modeName}.cssVariables.${fallbackKey} missing`)
    }
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value !== 'string' || !value.includes('color-mix')) continue
      const fallbackKey = `${key}-resolved`
      const fallback = variables[fallbackKey]
      if (typeof fallback !== 'string' || !fallback || fallback.includes('color-mix')) {
        errors.push(`${modeName}.cssVariables.${key} needs resolved fallback ${fallbackKey}`)
      }
    }
  }
  return errors
}

function figmaErrors(tokens) {
  const errors = []
  for (const key of ['lifecycle', 'validation', 'assetRegistry', 'cssVariables']) {
    if (key in tokens) errors.push(`Figma export must not contain runtime field ${key}`)
  }
  walk(tokens, (value, pathName) => {
    if (typeof value === 'string' && value.includes('color-mix')) errors.push(`${pathName} contains color-mix`)
    if (!value || typeof value !== 'object' || Array.isArray(value) || !('value' in value)) return
    if (/opacity/i.test(pathName) && typeof value.value === 'string') errors.push(`${pathName}.value opacity must be number`)
    if (pathName.endsWith('.visibleOn') && !Array.isArray(value.value)) errors.push(`${pathName}.value visibleOn must be array`)
    if (!('type' in value)) errors.push(`${pathName} token is missing type`)
  })
  if (!tokens.global?.color?.light) errors.push('Figma global.color.light missing')
  if (!tokens.global?.color?.dark) errors.push('Figma global.color.dark missing')
  if (!tokens.components?.light) errors.push('Figma components.light missing')
  if (!tokens.components?.dark) errors.push('Figma components.dark missing')
  if (!tokens.illustrations?.light?.pageBanner) errors.push('Figma illustrations.light.pageBanner missing')
  if (!tokens.illustrations?.dark?.pageBanner) errors.push('Figma illustrations.dark.pageBanner missing')
  return errors
}

function deterministicMapperErrors(theme, tokens) {
  const expected = edenThemeToFigma(theme)
  if (JSON.stringify(expected) !== JSON.stringify(tokens)) {
    return ['Eden to Figma mapper is not deterministic for hikmet.figma-tokens.json']
  }
  return []
}

function roundtripErrors(theme, tokens) {
  const errors = []
  if (JSON.stringify(JSON.parse(JSON.stringify(theme))) !== JSON.stringify(theme)) {
    errors.push('Eden JSON roundtrip failed')
  }
  if (JSON.stringify(JSON.parse(JSON.stringify(tokens))) !== JSON.stringify(tokens)) {
    errors.push('Figma JSON roundtrip failed')
  }
  return errors
}

function validationFieldErrors(theme) {
  const errors = []
  const validation = theme.validation
  if (!validation) return ['Eden validation field is missing']
  if (validation.schemaValid !== true) errors.push('validation.schemaValid must be true')
  if (validation.requiredFieldsComplete !== true) errors.push('validation.requiredFieldsComplete must be true')
  if (validation.assetRefsResolved !== true) errors.push('validation.assetRefsResolved must be true')
  if (validation.cssVariablesComplete !== true) errors.push('validation.cssVariablesComplete must be true')
  if (validation.figmaExportReady !== true) errors.push('validation.figmaExportReady must be true')
  for (const key of ['contrastWarnings', 'assetWarnings', 'unusedAssets', 'notes']) {
    if (!Array.isArray(validation[key])) errors.push(`validation.${key} must be array`)
    else if (validation[key].length > 0) errors.push(`validation.${key} must be empty after strict fix`)
  }
  return errors
}

function edenThemeToFigma(theme) {
  return {
    global: {
      color: { light: tokenStudio(theme.modes.light.colors), dark: tokenStudio(theme.modes.dark.colors) },
      typography: tokenStudio(theme.modes.light.typography),
      spacing: tokenStudio(theme.modes.light.spacing),
      borderRadius: tokenStudio(theme.modes.light.shape),
      boxShadow: tokenStudio(theme.modes.light.shadow),
    },
    components: {
      light: tokenStudio(theme.modes.light.components),
      dark: tokenStudio(theme.modes.dark.components),
    },
    illustrations: {
      light: tokenStudio(theme.modes.light.illustrations),
      dark: tokenStudio(theme.modes.dark.illustrations),
    },
    metadata: {
      format: 'tokens-studio-compatible',
      schemaVersion: theme.schemaVersion,
      themeKey: theme.meta.themeKey,
      displayName: theme.meta.displayName,
      generatedFrom: theme.figmaTokensRef.generatedFrom,
    },
  }
}

function tokenStudio(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { value, type: inferType(value) }
  }
  if (Array.isArray(value)) return { value, type: 'other' }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, tokenStudio(child)]))
}

function inferType(value) {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (/^#|^rgb|^hsl/i.test(value)) return 'color'
  if (/px$|rem$|em$|%$/i.test(value)) return 'dimension'
  if (/rgba\(|0\s/.test(value)) return 'boxShadow'
  return 'other'
}

function validateNoEmpty(value, pathName = 'root') {
  if (typeof value === 'string') {
    assert(value.trim().length > 0, `${pathName} has an empty string`)
    assert(!/(todo|placeholder|coming-soon|later|tbd|dummy)/i.test(value), `${pathName} has forbidden text`)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoEmpty(item, `${pathName}.${index}`))
    return
  }

  if (!value || typeof value !== 'object') return

  const keys = Object.keys(value)
  const allowedEmptyArrays = ['contrastWarnings', 'assetWarnings', 'unusedAssets', 'notes']
  assert(keys.length > 0, `${pathName} has an empty object`)

  for (const [key, child] of Object.entries(value)) {
    if (allowedEmptyArrays.includes(key) && Array.isArray(child) && child.length === 0) continue
    validateNoEmpty(child, `${pathName}.${key}`)
  }
}

function walk(value, visit, pathName = 'root') {
  visit(value, pathName)
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, visit, `${pathName}.${index}`))
    return
  }
  for (const [key, child] of Object.entries(value)) walk(child, visit, `${pathName}.${key}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
