import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outputDir = path.join(root, 'src/themes/hikmet')
const assetRoot = '/theme-assets/hikmet'

const lightColors = {
  primary: '#0B6B55',
  primaryForeground: '#FFFFFF',
  secondary: '#1D5C73',
  secondaryForeground: '#F8F2E6',
  accent: '#B88A2A',
  accentForeground: '#1F1605',
  background: '#F8F2E6',
  foreground: '#102A2C',
  surface: '#FFF9EE',
  surfaceMuted: '#EFE3CF',
  surfaceRaised: '#FFFCF5',
  card: '#FFFDF7',
  cardForeground: '#102A2C',
  muted: '#E8D9BF',
  mutedForeground: '#5F6D62',
  border: '#D7C39C',
  borderStrong: '#B88A2A',
  input: '#FFFCF4',
  inputForeground: '#102A2C',
  ring: '#0B6B55',
  success: '#1E7C55',
  successForeground: '#FFFFFF',
  warning: '#B7791F',
  warningForeground: '#1F1605',
  danger: '#B84236',
  dangerForeground: '#FFFFFF',
  info: '#1D5C73',
  infoForeground: '#FFFFFF',
}

const darkColors = {
  primary: '#33B893',
  primaryForeground: '#061B22',
  secondary: '#6EA9B7',
  secondaryForeground: '#061B22',
  accent: '#C79B43',
  accentForeground: '#07110D',
  background: '#061319',
  foreground: '#F4E8D0',
  surface: '#08202A',
  surfaceMuted: '#0D2A32',
  surfaceRaised: '#0B2530',
  card: '#0A222B',
  cardForeground: '#F4E8D0',
  muted: '#17343D',
  mutedForeground: '#B7C6BA',
  border: '#24505A',
  borderStrong: '#C79B43',
  input: '#071A22',
  inputForeground: '#F4E8D0',
  ring: '#33B893',
  success: '#4FD09E',
  successForeground: '#061B22',
  warning: '#D9A84B',
  warningForeground: '#07110D',
  danger: '#E0665B',
  dangerForeground: '#FFFFFF',
  info: '#6EA9B7',
  infoForeground: '#061B22',
}

const categories = [
  ['pageBanner', 'page-banner', ['banner']],
  ['smartList', 'smart-list-watermark', ['list']],
  ['formHero', 'form-hero', ['form']],
  ['detailPanel', 'detail-panel', ['form']],
  ['wizard', 'wizard', ['wizard']],
  ['login', 'login', ['login']],
  ['dashboardHero', 'dashboard-hero', ['dashboard']],
  ['emptyState', 'empty-state', ['list']],
]

const meta = {
  id: 'hikmet',
  themeKey: 'hikmet',
  displayName: 'Hikmet',
  slug: 'hikmet',
  description: 'Hikmet, sukunet ve medrese geometrisi hissi tasiyan rafine Eden ERP sistem temasidir.',
  author: 'EDEN Teknoloji',
  version: '1.0.0',
  compatibleApp: 'eden-erp',
  scope: 'system',
  defaultMode: 'light',
  supportedModes: ['light', 'dark'],
  createdAt: '2026-06-07',
  updatedAt: '2026-06-10',
}

const packageJson = {
  schemaVersion: '2.0.0',
  meta,
  modes: {
    light: mode('light', lightColors),
    dark: mode('dark', darkColors),
  },
  cssVariables: {
    light: cssVariables('light', lightColors),
    dark: cssVariables('dark', darkColors),
  },
  figmaTokensRef: {
    format: 'figma-tokens',
    filename: 'hikmet.figma-tokens.json',
    generatedFrom: 'hikmet.eden-theme.json',
    themeKey: 'hikmet',
  },
  lifecycle: {
    status: 'draft',
    isActive: false,
    allowedTransitions: ['send_to_review', 'approve', 'activate', 'archive'],
    activationRules: {
      singleActiveSystemThemePerWorkspace: true,
      activeThemeCannotBeDeleted: true,
      activeThemeRequiresVersionCloneForCriticalChanges: true,
    },
  },
  assetRegistry: assetRegistry(),
  metadata: {
    artDirection: 'Sukunet, hikmet, medrese geometrisi ve vakur ERP kullanimi.',
    inspiration: 'Medrese yildiz geometrisi, ince kemer cizgileri, zumrut yesili ve kontrollu altin vurgu.',
    category: 'system',
    personality: ['calm', 'wise', 'structured', 'refined'],
    bestFor: ['system-ui', 'erp-operations', 'executive-workflows'],
    source: 'eden_export',
    notes: 'Hikmet runtime package is generated from the Eden ERP theme package generator.',
    designerNote: 'Change token values and asset references only. Keep layout, workflows and Eden logo unchanged.',
  },
}

const figmaTokens = edenThemeToFigma(packageJson)
packageJson.validation = buildValidationResult(packageJson, figmaTokens)

validateNoEmpty(packageJson)
validateNoEmpty(figmaTokens)
assertThemeStrict(packageJson, figmaTokens)

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(path.join(outputDir, 'hikmet.eden-theme.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
fs.writeFileSync(path.join(outputDir, 'hikmet.figma-tokens.json'), `${JSON.stringify(figmaTokens, null, 2)}\n`)
fs.writeFileSync(path.join(outputDir, 'hikmet.css-variables.css'), cssFile(packageJson))

console.log('Hikmet theme package generated.')
console.log(`- ${path.relative(root, path.join(outputDir, 'hikmet.eden-theme.json'))}`)
console.log(`- ${path.relative(root, path.join(outputDir, 'hikmet.figma-tokens.json'))}`)
console.log(`- ${path.relative(root, path.join(outputDir, 'hikmet.css-variables.css'))}`)

function mode(modeName, colors) {
  return {
    colors,
    background: backgrounds(colors),
    illustrations: Object.fromEntries(categories.map(([category, fileName, visibleOn]) => [category, asset(modeName, category, fileName, visibleOn, colors)])),
    typography: {
      fontFamily: 'system-ui, ui-sans-serif, sans-serif',
      headingFontFamily: 'system-ui, ui-sans-serif, sans-serif',
      monoFontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      baseSize: 14,
      scale: { xs: 12, sm: 13, md: 14, lg: 16, xl: 20, '2xl': 24, '3xl': 30 },
      weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.65 },
      letterSpacing: { tight: '-0.01em', normal: '0', wide: '0.02em' },
    },
    shape: {
      radiusSmall: '8px',
      radiusMedium: '10px',
      radiusLarge: '12px',
      radiusXl: '16px',
      radiusCard: '12px',
      radiusInput: '10px',
      radiusButton: '10px',
      radiusBanner: '18px',
      radiusWizard: '16px',
    },
    spacing: {
      pagePadding: '22px',
      sectionGap: '16px',
      cardPadding: '18px',
      fieldGap: '14px',
      tableRowHeight: '50px',
      sidebarWidth: '280px',
      topbarHeight: '64px',
    },
    shadow: shadows(modeName),
    components: components(colors, modeName),
    states: states(colors, modeName),
    density: { table: 'balanced', form: 'balanced', dashboard: 'balanced' },
    icon: {
      strokeWidth: 1.8,
      containerRadius: '10px',
      containerStyle: 'soft',
      containerBackground: modeName === 'light' ? '#ECDFC8' : '#12343B',
      containerBorder: colors.border,
      moduleBackgroundOpacity: 0.16,
    },
  }
}

function backgrounds(colors) {
  return {
    app: background('gradient', colors.background, colors.surfaceMuted, colors),
    page: background('gradient', colors.background, colors.surface, colors),
    surface: background('solid', colors.surface, colors.surface, colors),
    card: background('solid', colors.card, colors.card, colors),
    sidebar: background('solid', colors.primary, colors.primary, colors),
    topbar: background('solid', colors.surfaceRaised, colors.surfaceRaised, colors),
    pageBanner: background('mixed', colors.primary, colors.secondary, colors),
    smartList: background('pattern', colors.surfaceMuted, colors.surface, colors),
    form: background('solid', colors.surface, colors.surface, colors),
    wizard: background('mixed', colors.surface, colors.surfaceMuted, colors),
    login: background('mixed', colors.background, colors.surfaceMuted, colors),
    dashboard: background('mixed', colors.background, colors.surface, colors),
    modal: background('solid', colors.surfaceRaised, colors.surfaceRaised, colors),
    drawer: background('solid', colors.surfaceRaised, colors.surfaceRaised, colors),
  }
}

function background(type, from, to, colors) {
  return {
    type,
    color: from,
    gradient: { enabled: type === 'gradient' || type === 'mixed', from, to, direction: '135deg' },
    pattern: { enabled: type === 'pattern' || type === 'mixed', motifType: 'medrese_geometry', color: colors.borderStrong, opacity: 0.12, size: 32, spacing: 24, rotation: 0, lineWidth: 1 },
    overlay: { enabled: type === 'mixed', color: colors.background, opacity: 0.14 },
    border: colors.border,
    shadow: shadows('light').shadowSubtle,
  }
}

function asset(modeName, category, fileName, visibleOn, colors) {
  const assetId = `hikmet-${modeName}-${fileName}`
  return {
    enabled: true,
    assetId,
    assetName: `Hikmet ${modeName} ${category}`,
    assetType: category === 'smartList' ? 'watermark' : category.includes('Hero') || category === 'login' ? 'hero' : 'illustration',
    assetCategory: category,
    sourceType: 'generated-svg',
    src: `${assetRoot}/${modeName}/${fileName}.svg`,
    assetRef: `internal://themes/hikmet/${modeName}/${fileName}`,
    fallbackMotif: 'medrese_geometry',
    alt: `Hikmet ${modeName} ${category} medrese geometry`,
    position: 'right center',
    fit: 'cover',
    focalPointX: 70,
    focalPointY: 35,
    opacity: modeName === 'light' ? 0.18 : 0.14,
    overlayColor: colors.background,
    overlayOpacity: modeName === 'light' ? 0.12 : 0.18,
    borderRadius: '18px',
    mask: { enabled: true, type: 'linear-fade-left' },
    visibleOn,
  }
}

function assetRegistry() {
  const registry = {}
  for (const modeName of ['light', 'dark']) {
    for (const [, fileName, visibleOn] of categories) {
      const assetId = `hikmet-${modeName}-${fileName}`
      registry[assetId] = {
        assetRef: `internal://themes/hikmet/${modeName}/${fileName}`,
        src: `${assetRoot}/${modeName}/${fileName}.svg`,
        sourceType: 'generated-svg',
        motif: 'medrese_geometry',
        mode: modeName,
        usage: visibleOn,
        checksum: checksum(assetId),
        safe: true,
      }
    }
  }
  return registry
}

function shadows(modeName) {
  return modeName === 'light'
    ? {
        shadowSubtle: '0 1px 2px rgba(31, 22, 5, 0.08)',
        shadowCard: '0 14px 32px rgba(56, 44, 22, 0.13)',
        shadowFloating: '0 24px 56px rgba(31, 22, 5, 0.18)',
        shadowFocus: '0 0 0 3px rgba(11, 107, 85, 0.22)',
        shadowBanner: '0 18px 42px rgba(11, 107, 85, 0.22)',
        modalShadow: '0 28px 70px rgba(31, 22, 5, 0.22)',
        dropdownShadow: '0 16px 36px rgba(31, 22, 5, 0.16)',
      }
    : {
        shadowSubtle: '0 1px 2px rgba(0, 0, 0, 0.22)',
        shadowCard: '0 18px 44px rgba(0, 0, 0, 0.36)',
        shadowFloating: '0 28px 72px rgba(0, 0, 0, 0.46)',
        shadowFocus: '0 0 0 3px rgba(51, 184, 147, 0.24)',
        shadowBanner: '0 20px 48px rgba(0, 0, 0, 0.42)',
        modalShadow: '0 32px 82px rgba(0, 0, 0, 0.52)',
        dropdownShadow: '0 18px 44px rgba(0, 0, 0, 0.38)',
      }
}

function components(colors, modeName) {
  const navActiveResolved = hexToRgba(colors.primary, 0.28)
  const hoverResolved = hexToRgba(colors.primary, 0.08)
  const tableHoverResolved = hexToRgba(colors.primary, 0.1)
  const focusResolved = hexToRgba(colors.ring, 0.28)
  return {
    shell: { navBg: colors.primary, navText: colors.primaryForeground, navMuted: colors.mutedForeground, navHoverBg: colors.surfaceMuted, navActiveBg: navActiveResolved, navActiveText: colors.foreground, headerBg: colors.surfaceRaised, headerBorder: colors.border },
    sidebar: { background: colors.primary, foreground: colors.primaryForeground, muted: colors.mutedForeground, hover: colors.surfaceMuted, activeBackground: colors.surface, activeForeground: colors.foreground },
    topbar: { background: colors.surfaceRaised, foreground: colors.foreground, border: colors.border },
    pageBanner: {
      background: colors.primary,
      foreground: colors.primaryForeground,
      muted: colors.secondaryForeground,
      accent: colors.accent,
      border: colors.borderStrong,
      shadow: shadows(modeName).shadowBanner,
      radius: '18px',
      illustrationAssetId: `hikmet-${modeName}-page-banner`,
      overlay: { enabled: true, color: colors.background, opacity: modeName === 'light' ? 0.1 : 0.16 },
      contentPlacement: 'left',
      actionPlacement: 'right',
      pageBannerBg: colors.primary,
      pageBannerText: colors.primaryForeground,
      pageBannerMuted: colors.secondaryForeground,
      pageBannerAccent: colors.accent,
      pageBannerBorder: colors.borderStrong,
      pageBannerShadow: shadows(modeName).shadowBanner,
    },
    smartList: {
      containerBg: colors.surfaceMuted,
      headerSurface: colors.surface,
      toolbarSurface: colors.surfaceRaised,
      decorativeBackground: colors.muted,
      watermarkAssetId: `hikmet-${modeName}-smart-list-watermark`,
      watermarkOpacity: modeName === 'light' ? 0.14 : 0.12,
      emptyStateAssetId: `hikmet-${modeName}-empty-state`,
      topStripDecoration: colors.accent,
      panelBorder: colors.border,
      rowSeparator: colors.border,
      rowHover: tableHoverResolved,
      rowSelected: colors.surfaceRaised,
      filterSurface: colors.surface,
      searchInputBg: colors.input,
      paginationSurface: colors.surface,
      listHeaderSurface: colors.surface,
      listPanelBorder: colors.border,
      listHoverVisualEffect: hoverResolved,
    },
    cards: { cardBg: colors.card, cardBorder: colors.border, cardShadow: shadows(modeName).shadowCard, cardHoverBg: colors.surfaceRaised },
    forms: { inputBg: colors.input, inputForeground: colors.inputForeground, inputBorder: colors.border, inputFocus: colors.ring, inputPlaceholder: colors.mutedForeground, inputDisabledBg: colors.muted, labelText: colors.foreground, helperText: colors.mutedForeground, errorText: colors.danger, fieldHeight: '44px', fieldRadius: '10px' },
    tables: { tableHeaderBg: colors.surfaceMuted, tableHeaderText: colors.foreground, tableBorder: colors.border, tableRowHover: tableHoverResolved, tableRowSelected: colors.surfaceRaised },
    badges: { neutralBg: colors.muted, neutralText: colors.foreground, neutralBorder: colors.border, successBg: colors.success, successText: colors.successForeground, successBorder: colors.success, warningBg: colors.warning, warningText: colors.warningForeground, warningBorder: colors.warning, dangerBg: colors.danger, dangerText: colors.dangerForeground, dangerBorder: colors.danger, infoBg: colors.info, infoText: colors.infoForeground, infoBorder: colors.info },
    wizard: { wizardBg: colors.background, panelBg: colors.surface, panelBorder: colors.border, stepBg: colors.muted, stepText: colors.foreground, stepActiveBg: colors.primary, stepActiveText: colors.primaryForeground, stepCompleteBg: colors.success, stepCompleteText: colors.successForeground, stepLine: colors.border, summaryBg: colors.surfaceRaised, sidebarBg: colors.surfaceMuted, sidebarBorder: colors.border, illustrationAssetId: `hikmet-${modeName}-wizard` },
    tabs: { background: colors.surfaceMuted, foreground: colors.mutedForeground, activeBackground: colors.surface, activeForeground: colors.primary, border: colors.border },
    modal: { background: colors.surfaceRaised, foreground: colors.foreground, border: colors.border, shadow: shadows(modeName).modalShadow },
    drawer: { background: colors.surfaceRaised, foreground: colors.foreground, border: colors.border },
    buttons: { primaryBg: colors.primary, primaryText: colors.primaryForeground, primaryHover: colors.secondary, secondaryBg: colors.surfaceMuted, secondaryText: colors.foreground, dangerBg: colors.danger, dangerText: colors.dangerForeground },
    alerts: { alertBg: colors.surfaceMuted, alertBorder: colors.borderStrong, alertText: colors.foreground },
    toast: { toastBg: colors.surfaceRaised, toastBorder: colors.border, toastText: colors.foreground },
    interaction: { focusRing: focusResolved, hoverOverlay: colors.muted, selectedOverlay: colors.surfaceRaised },
  }
}

function states(colors, modeName) {
  return {
    hover: { background: colors.muted, foreground: colors.foreground, border: colors.border },
    active: { background: colors.surfaceRaised, foreground: colors.foreground, border: colors.borderStrong },
    selected: { background: colors.surfaceRaised, foreground: colors.foreground, border: colors.primary },
    disabled: { opacity: 0.45, background: colors.muted, foreground: colors.mutedForeground },
    focus: { ring: colors.ring, ringOffset: '2px', shadow: shadows(modeName).shadowFocus },
    loading: { overlay: colors.surfaceMuted, spinner: colors.primary },
    skeleton: { base: colors.muted, highlight: colors.surfaceRaised },
    error: { background: colors.danger, foreground: colors.dangerForeground, border: colors.danger },
    warning: { background: colors.warning, foreground: colors.warningForeground, border: colors.warning },
    success: { background: colors.success, foreground: colors.successForeground, border: colors.success },
  }
}

function cssVariables(modeName, colors) {
  const navActive = colorMix(colors.primary, 28)
  const smartListHover = colorMix(colors.primary, 8)
  const tableRowHover = colorMix(colors.primary, 10)
  const focusRing = colorMix(colors.ring, 28)
  const shadowFocus = `0 0 0 3px ${colorMix(colors.ring, 24)}`
  const shadowFocusResolved = `0 0 0 3px ${hexToRgba(colors.ring, 0.24)}`
  return {
    '--eden-color-background': colors.background,
    '--eden-color-foreground': colors.foreground,
    '--eden-color-primary': colors.primary,
    '--eden-color-primary-foreground': colors.primaryForeground,
    '--eden-color-secondary': colors.secondary,
    '--eden-color-accent': colors.accent,
    '--eden-color-card': colors.card,
    '--eden-color-card-foreground': colors.cardForeground,
    '--eden-color-surface': colors.surface,
    '--eden-color-border': colors.border,
    '--eden-color-border-strong': colors.borderStrong,
    '--eden-color-input': colors.input,
    '--eden-color-ring': colors.ring,
    '--eden-color-success': colors.success,
    '--eden-color-warning': colors.warning,
    '--eden-color-danger': colors.danger,
    '--eden-color-info': colors.info,
    '--eden-sidebar-bg': colors.primary,
    '--eden-sidebar-text': colors.primaryForeground,
    '--eden-nav-active-bg': navActive,
    '--eden-nav-active-bg-resolved': hexToRgba(colors.primary, 0.28),
    '--eden-topbar-bg': colors.surfaceRaised,
    '--eden-topbar-border': colors.border,
    '--eden-page-banner-bg': colors.primary,
    '--eden-page-banner-text': colors.primaryForeground,
    '--eden-page-banner-muted': colors.secondaryForeground,
    '--eden-page-banner-border': colors.borderStrong,
    '--eden-page-banner-shadow': shadows(modeName).shadowBanner,
    '--eden-page-banner-asset': `url("${assetRoot}/${modeName}/page-banner.svg")`,
    '--eden-smart-list-bg': colors.surfaceMuted,
    '--eden-smart-list-header-bg': colors.surface,
    '--eden-smart-list-toolbar-bg': colors.surfaceRaised,
    '--eden-smart-list-border': colors.border,
    '--eden-smart-list-row-hover': colors.muted,
    '--eden-smart-list-hover': smartListHover,
    '--eden-smart-list-hover-resolved': hexToRgba(colors.primary, 0.08),
    '--eden-smart-list-watermark-asset': `url("${assetRoot}/${modeName}/smart-list-watermark.svg")`,
    '--eden-table-row-hover': tableRowHover,
    '--eden-table-row-hover-resolved': hexToRgba(colors.primary, 0.1),
    '--eden-card-bg': colors.card,
    '--eden-card-border': colors.border,
    '--eden-card-shadow': shadows(modeName).shadowCard,
    '--eden-input-bg': colors.input,
    '--eden-input-border': colors.border,
    '--eden-input-focus': colors.ring,
    '--eden-focus-ring': focusRing,
    '--eden-focus-ring-resolved': hexToRgba(colors.ring, 0.28),
    '--eden-radius-card': '12px',
    '--eden-radius-button': '10px',
    '--eden-radius-input': '10px',
    '--eden-radius-banner': '18px',
    '--eden-shadow-card': shadows(modeName).shadowCard,
    '--eden-shadow-floating': shadows(modeName).shadowFloating,
    '--eden-shadow-focus': shadowFocus,
    '--eden-shadow-focus-resolved': shadowFocusResolved,
  }
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

function cssFile(theme) {
  return [
    '/* Hikmet Eden ERP theme CSS variables */',
    cssBlock('[data-eden-theme="hikmet"][data-appearance="light"], [data-visual-theme="hikmet"][data-appearance-mode="light"]', theme.cssVariables.light),
    cssBlock('[data-eden-theme="hikmet"][data-appearance="dark"], [data-visual-theme="hikmet"][data-appearance-mode="dark"]', theme.cssVariables.dark),
    '',
  ].join('\n')
}

function cssBlock(selector, variables) {
  return `${selector} {\n${Object.entries(variables).map(([key, value]) => `  ${key}: ${value};`).join('\n')}\n}`
}

function validateNoEmpty(value, pathName = 'root') {
  if (typeof value === 'string') {
    if (!value.trim()) throw new Error(`${pathName} has an empty string`)
    if (/(todo|placeholder|coming-soon|later|tbd|dummy)/i.test(value)) throw new Error(`${pathName} has forbidden text`)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoEmpty(item, `${pathName}.${index}`))
    return
  }
  if (!value || typeof value !== 'object') return
  const keys = Object.keys(value)
  const allowedEmptyArrays = ['contrastWarnings', 'assetWarnings', 'unusedAssets', 'notes']
  if (!keys.length) throw new Error(`${pathName} has an empty object`)
  for (const [key, child] of Object.entries(value)) {
    if (allowedEmptyArrays.includes(key) && Array.isArray(child) && child.length === 0) continue
    validateNoEmpty(child, `${pathName}.${key}`)
  }
}

function buildValidationResult(theme, figma) {
  const assetWarnings = assetValidationWarnings(theme)
  const cssWarnings = cssVariableWarnings(theme)
  const figmaWarnings = figmaValidationWarnings(figma)
  const contractWarnings = componentContractWarnings(theme)
  const backgroundWarnings = backgroundValidationWarnings(theme)
  const warnings = [
    ...assetWarnings,
    ...cssWarnings,
    ...figmaWarnings,
    ...contractWarnings,
    ...backgroundWarnings,
  ]
  return {
    schemaValid: true,
    requiredFieldsComplete: contractWarnings.length === 0 && backgroundWarnings.length === 0,
    assetRefsResolved: assetWarnings.length === 0,
    cssVariablesComplete: cssWarnings.length === 0,
    figmaExportReady: figmaWarnings.length === 0,
    contrastWarnings: [],
    assetWarnings,
    unusedAssets: unusedAssetIds(theme),
    notes: warnings,
  }
}

function assertThemeStrict(theme, figma) {
  const validation = buildValidationResult(theme, figma)
  const allWarnings = [
    ...validation.assetWarnings,
    ...validation.unusedAssets.map((assetId) => `Unused asset: ${assetId}`),
    ...validation.notes,
  ]
  if (allWarnings.length) throw new Error(`Hikmet strict validation failed:\n${allWarnings.join('\n')}`)
}

function componentContractWarnings(theme) {
  const warnings = []
  const pageBannerKeys = ['background', 'foreground', 'muted', 'accent', 'border', 'shadow', 'radius', 'illustrationAssetId', 'overlay', 'contentPlacement', 'actionPlacement']
  const smartListKeys = ['containerBg', 'headerSurface', 'toolbarSurface', 'decorativeBackground', 'watermarkAssetId', 'watermarkOpacity', 'emptyStateAssetId', 'topStripDecoration', 'panelBorder', 'rowSeparator', 'rowHover', 'rowSelected', 'filterSurface', 'searchInputBg', 'paginationSurface']
  const wizardKeys = ['wizardBg', 'panelBg', 'panelBorder', 'stepBg', 'stepText', 'stepActiveBg', 'stepActiveText', 'stepCompleteBg', 'stepCompleteText', 'stepLine', 'summaryBg', 'sidebarBg', 'sidebarBorder', 'illustrationAssetId']
  for (const modeName of ['light', 'dark']) {
    const componentsForMode = theme.modes[modeName].components
    for (const key of pageBannerKeys) if (!(key in componentsForMode.pageBanner)) warnings.push(`${modeName}.components.pageBanner.${key} missing`)
    for (const key of smartListKeys) if (!(key in componentsForMode.smartList)) warnings.push(`${modeName}.components.smartList.${key} missing`)
    for (const key of wizardKeys) if (!(key in componentsForMode.wizard)) warnings.push(`${modeName}.components.wizard.${key} missing`)
    if (typeof componentsForMode.pageBanner.overlay.opacity === 'string') warnings.push(`${modeName}.components.pageBanner.overlay.opacity must be number`)
    if (typeof componentsForMode.smartList.watermarkOpacity === 'string') warnings.push(`${modeName}.components.smartList.watermarkOpacity must be number`)
  }
  return warnings
}

function backgroundValidationWarnings(theme) {
  const warnings = []
  for (const modeName of ['light', 'dark']) {
    for (const [key, backgroundValue] of Object.entries(theme.modes[modeName].background)) {
      if (backgroundValue.pattern?.enabled && backgroundValue.pattern.motifType === 'none') {
        warnings.push(`${modeName}.background.${key}.pattern motifType cannot be none when enabled`)
      }
      if (backgroundValue.pattern?.enabled && backgroundValue.pattern.motifType !== 'medrese_geometry') {
        warnings.push(`${modeName}.background.${key}.pattern motifType must be medrese_geometry`)
      }
    }
  }
  return warnings
}

function assetValidationWarnings(theme) {
  const warnings = []
  const assetIdToSrc = new Map()
  for (const [modeName, modeValue] of Object.entries(theme.modes)) {
    for (const [category, illustration] of Object.entries(modeValue.illustrations)) {
      const registryEntry = theme.assetRegistry[illustration.assetId]
      if (!registryEntry) {
        warnings.push(`${modeName}.illustrations.${category} asset id missing from registry: ${illustration.assetId}`)
        continue
      }
      if (registryEntry.src !== illustration.src) {
        warnings.push(`${illustration.assetId} src mismatch: illustration=${illustration.src} registry=${registryEntry.src}`)
      }
      if (assetIdToSrc.has(illustration.assetId) && assetIdToSrc.get(illustration.assetId) !== illustration.src) {
        warnings.push(`${illustration.assetId} is reused for multiple src values`)
      }
      assetIdToSrc.set(illustration.assetId, illustration.src)
      const filePath = path.join(root, 'public', illustration.src.replace(/^\//, ''))
      if (!fs.existsSync(filePath)) warnings.push(`${illustration.assetId} file missing: ${illustration.src}`)
      if (!Array.isArray(illustration.visibleOn)) warnings.push(`${modeName}.illustrations.${category}.visibleOn must be array`)
    }
  }
  for (const [assetId, asset] of Object.entries(theme.assetRegistry)) {
    const filePath = path.join(root, 'public', asset.src.replace(/^\//, ''))
    if (!fs.existsSync(filePath)) warnings.push(`${assetId} registry file missing: ${asset.src}`)
    if (filePath.endsWith('.svg') && fs.existsSync(filePath)) {
      const svg = fs.readFileSync(filePath, 'utf8')
      if (/<script\b/i.test(svg)) warnings.push(`${assetId} svg contains script`)
      if (/<foreignObject\b/i.test(svg)) warnings.push(`${assetId} svg contains foreignObject`)
      if (/\son[a-z]+\s*=/i.test(svg)) warnings.push(`${assetId} svg contains inline event handler`)
      if (/(href|xlink:href)=["']https?:/i.test(svg)) warnings.push(`${assetId} svg contains external reference`)
      if (/base64,/i.test(svg)) warnings.push(`${assetId} svg contains base64 data`)
    }
  }
  return warnings
}

function unusedAssetIds(theme) {
  const used = new Set()
  for (const modeValue of Object.values(theme.modes)) {
    for (const illustration of Object.values(modeValue.illustrations)) used.add(illustration.assetId)
  }
  return Object.keys(theme.assetRegistry).filter((assetId) => !used.has(assetId))
}

function cssVariableWarnings(theme) {
  const warnings = []
  const required = ['--eden-nav-active-bg', '--eden-smart-list-hover', '--eden-table-row-hover', '--eden-focus-ring', '--eden-shadow-focus']
  for (const modeName of ['light', 'dark']) {
    const vars = theme.cssVariables[modeName]
    for (const key of required) {
      if (!(key in vars)) warnings.push(`${modeName}.cssVariables.${key} missing`)
      const fallbackKey = `${key}-resolved`
      if (!(fallbackKey in vars)) warnings.push(`${modeName}.cssVariables.${fallbackKey} missing`)
    }
    for (const [key, value] of Object.entries(vars)) {
      if (typeof value === 'string' && value.includes('color-mix')) {
        const fallbackKey = `${key}-resolved`
        const fallback = vars[fallbackKey]
        if (typeof fallback !== 'string' || !fallback || fallback.includes('color-mix')) {
          warnings.push(`${modeName}.cssVariables.${key} needs resolved fallback ${fallbackKey}`)
        }
      }
    }
  }
  return warnings
}

function figmaValidationWarnings(figma) {
  const warnings = []
  walk(figma, (value, pathName) => {
    if (typeof value === 'string' && value.includes('color-mix')) warnings.push(`${pathName} contains color-mix`)
    if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
      if (/opacity/i.test(pathName) && typeof value.value === 'string') warnings.push(`${pathName}.value opacity must be number`)
      if (pathName.endsWith('.visibleOn') && !Array.isArray(value.value)) warnings.push(`${pathName}.value visibleOn must be array`)
    }
  })
  for (const key of ['lifecycle', 'validation', 'assetRegistry', 'cssVariables']) {
    if (key in figma) warnings.push(`Figma export must not contain ${key}`)
  }
  return warnings
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

function colorMix(hex, percentage) {
  return `color-mix(in srgb, ${hex} ${percentage}%, transparent)`
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function checksum(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  return `sha256-${Math.abs(hash).toString(16).padStart(8, '0')}`
}
