import { edenThemeToCssVariables, edenThemeToFigmaTokens, resolveSystemThemePackage } from './themeTransforms'
import type { EdenThemePackage, ThemeExportFormat } from './themeSchema'

export function exportEdenTheme(themeKey: string) {
  const theme = resolveSystemThemePackage(themeKey)
  if (!theme) return null

  return {
    filename: `${theme.themeKey}.eden-theme.json`,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(theme, null, 2),
  }
}

export function exportFigmaTokens(themeKey: string) {
  const theme = resolveSystemThemePackage(themeKey)
  if (!theme) return null

  return {
    filename: `${theme.themeKey}.figma-tokens.json`,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(edenThemeToFigmaTokens(theme), null, 2),
  }
}

export function exportCssVariables(themeKey: string) {
  const theme = resolveSystemThemePackage(themeKey)
  if (!theme) return null

  return {
    filename: `${theme.themeKey}.css-variables.css`,
    contentType: 'text/css; charset=utf-8',
    body: edenThemeToCssVariables(theme),
  }
}

export function exportThemeReadme(themeKey: string) {
  const theme = resolveSystemThemePackage(themeKey)
  if (!theme) return null

  return {
    filename: `${theme.themeKey}.README.md`,
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
  return `# ${theme.displayName}

Theme key: \`${theme.themeKey}\`
Schema version: \`${theme.schemaVersion}\`
Package version: \`${theme.version}\`

## Designer Scope

- Layout, navigation, workflows and component structure must not change.
- Edit only design tokens in \`eden-theme.json\` or Tokens Studio compatible JSON.
- Do not add CSS, JavaScript, HTML, external URLs, font files, SVG payloads or executable content.
- Light and dark tokens must be maintained together.
- Keep contrast readable for ERP tables, forms, badges, warnings and primary actions.

## Expected Files

- \`eden-theme.json\`
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

Returned files are validated as JSON-only design tokens. Imported themes enter preview status first and require admin approval before activation.
`
}
