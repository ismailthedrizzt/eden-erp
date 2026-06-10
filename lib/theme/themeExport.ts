import { edenThemeToCssVariables, edenThemeToFigmaTokens, resolveSystemThemePackage } from './themeTransforms'
import type { EdenThemePackage, ThemeExportFormat } from './themeSchema'

export function exportEdenTheme(themeKey: string) {
  const theme = resolveSystemThemePackage(themeKey)
  if (!theme) return null

  return {
    filename: `${theme.meta.themeKey}.eden-theme.v2.json`,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(theme, null, 2),
  }
}

export function exportFigmaTokens(themeKey: string) {
  const theme = resolveSystemThemePackage(themeKey)
  if (!theme) return null

  return {
    filename: `${theme.meta.themeKey}.figma-tokens.json`,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(edenThemeToFigmaTokens(theme), null, 2),
  }
}

export function exportCssVariables(themeKey: string) {
  const theme = resolveSystemThemePackage(themeKey)
  if (!theme) return null

  return {
    filename: `${theme.meta.themeKey}.css-variables.css`,
    contentType: 'text/css; charset=utf-8',
    body: edenThemeToCssVariables(theme),
  }
}

export function exportThemeReadme(themeKey: string) {
  const theme = resolveSystemThemePackage(themeKey)
  if (!theme) return null

  return {
    filename: `${theme.meta.themeKey}.README.md`,
    contentType: 'text/markdown; charset=utf-8',
    body: buildThemeReadme(theme),
  }
}

export function exportThemeArtifact(themeKey: string, format: ThemeExportFormat) {
  if (format === 'eden') return exportEdenTheme(themeKey)
  if (format === 'figma') return exportFigmaTokens(themeKey)
  if (format === 'css') return exportCssVariables(themeKey)
  if (format === 'readme') return exportThemeReadme(themeKey)
  return null
}

function buildThemeReadme(theme: EdenThemePackage) {
  return `# ${theme.meta.displayName}

Theme key: \`${theme.meta.themeKey}\`
Schema version: \`${theme.schemaVersion}\`
Package version: \`${theme.meta.version}\`
Scope: \`${theme.meta.scope}\`

## Designer Scope

- Layout, navigation, workflows and component structure must not change.
- Edit only V2 token, illustration and asset reference fields in \`eden-theme.v2.json\`.
- Do not add CSS, JavaScript, HTML, external URLs, font files, SVG payloads or executable content.
- Light and dark mode definitions must be maintained together under \`modes.light\` and \`modes.dark\`.
- PageBanner, Smart List, form hero, wizard and dashboard visual assets are references, not embedded binaries.
- Keep contrast readable for ERP tables, forms, badges, warnings and primary actions.

## Expected Files

- \`eden-theme.v2.json\`
- \`figma-tokens.json\`
- \`css-variables.css\`
- \`README.md\`
- \`preview-screenshots/\`

## Manual Screenshot Checklist

- login.png
- dashboard.png
- companies-list.png
- company-detail.png
- employee-list.png
- accounting-list.png
- document-slot.png
- wizard.png
- action-center.png
- audit-timeline.png

## Import Rule

Returned files are validated as V2 JSON-only design tokens. Imported themes enter review status first and require lifecycle activation before use.
`
}
