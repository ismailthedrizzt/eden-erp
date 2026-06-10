import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const edenPath = path.join(root, 'src/themes/hikmet/hikmet.eden-theme.json')
const figmaPath = path.join(root, 'src/themes/hikmet/hikmet.figma-tokens.json')

const eden = JSON.parse(fs.readFileSync(edenPath, 'utf8'))
const figma = JSON.parse(fs.readFileSync(figmaPath, 'utf8'))

assert(eden.schemaVersion === '2.0.0', 'Eden schemaVersion must be 2.0.0')
assert(eden.meta.themeKey === 'hikmet', 'Eden themeKey must be hikmet')
assert(eden.meta.scope === 'system', 'Eden scope must be system')
assert(eden.modes.light && eden.modes.dark, 'Eden light/dark modes are required')
assert(eden.cssVariables.light && eden.cssVariables.dark, 'Eden CSS variables are required')
assert(eden.lifecycle.status === 'draft', 'Hikmet package must start as draft')
assert(eden.lifecycle.isActive === false, 'Imported/exported package must not auto activate')
assert(Object.keys(eden.assetRegistry).length >= 16, 'Asset registry must include generated SVG refs')
assert(eden.validation.schemaValid === true, 'Eden validation.schemaValid must be true')
assert(eden.validation.assetRefsResolved === true, 'Eden assets must be resolved')
assert(eden.validation.cssVariablesComplete === true, 'Eden CSS variables must be complete')

for (const [assetId, asset] of Object.entries(eden.assetRegistry)) {
  assert(asset.safe === true, `${assetId} must be safe`)
  assert(asset.src.startsWith('/theme-assets/hikmet/'), `${assetId} must use local theme-assets path`)
  const filePath = path.join(root, 'public', asset.src.replace(/^\//, ''))
  assert(fs.existsSync(filePath), `${assetId} file is missing: ${asset.src}`)
}

assert(figma.global.color.light, 'Figma global.color.light missing')
assert(figma.global.color.dark, 'Figma global.color.dark missing')
assert(figma.components.light, 'Figma components.light missing')
assert(figma.components.dark, 'Figma components.dark missing')
assert(figma.illustrations.light.pageBanner, 'Figma illustrations.light.pageBanner missing')
assert(figma.illustrations.dark.pageBanner, 'Figma illustrations.dark.pageBanner missing')
assert(!figma.lifecycle, 'Figma export must not contain lifecycle')
assert(!figma.validation, 'Figma export must not contain runtime validation')
assert(!figma.illustrations.light.pageBanner.light, 'Figma export must not double-nest light under pageBanner')
assert(!figma.illustrations.dark.pageBanner.dark, 'Figma export must not double-nest dark under pageBanner')

validateNoEmpty(eden)
validateNoEmpty(figma)

console.log('Hikmet theme package validation passed.')

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

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
