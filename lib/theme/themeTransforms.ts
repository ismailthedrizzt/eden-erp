import {
  findThemeConcept,
  getEdenThemeCssVars,
  themeConcepts,
  type ThemeAppearanceMode,
  type ThemeConcept,
  type ThemeConceptId,
} from '@/components/design-lab/themeConcepts'
import {
  THEME_SCHEMA_VERSION,
  type EdenThemePackage,
  type ThemeAssetRef,
  type ThemeBackgroundLayer,
  type ThemeModeTokens,
} from './themeSchema'

type TokenStudioNode = {
  value?: string | number | boolean | Record<string, unknown>
  type?: string
  description?: string
  [key: string]: TokenStudioNode | string | number | boolean | Record<string, unknown> | undefined
}

export function listSystemThemeKeys() {
  return themeConcepts.map(theme => theme.id)
}

export function buildEdenThemePackage(themeKey: string): EdenThemePackage | null {
  const theme = themeConcepts.find(item => item.id === themeKey)
  if (!theme) return null
  return themeConceptToEdenTheme(theme)
}

export function themeConceptToEdenTheme(theme: ThemeConcept): EdenThemePackage {
  const now = '2026-06-10T00:00:00.000Z'
  const light = themeConceptToModeTokens(theme, 'light')
  const dark = themeConceptToModeTokens(theme, 'dark')
  const basePackage = {
    schemaVersion: THEME_SCHEMA_VERSION,
    meta: {
      id: theme.id,
      themeKey: theme.id,
      displayName: theme.name,
      slug: theme.id,
      description: theme.description,
      author: 'EDEN Teknoloji',
      version: '1.0.0',
      compatibleApp: 'eden-erp',
      scope: 'system',
      defaultMode: 'light',
      supportedModes: ['light', 'dark'],
      status: 'active',
      isActive: true,
      isDefault: theme.id === themeConcepts[0]?.id,
      createdAt: now,
      updatedAt: now,
    },
    modes: { light, dark },
    figmaTokens: {},
    cssVariables: {
      light: themeTokensToCssVars(light),
      dark: themeTokensToCssVars(dark),
    },
    lifecycle: {
      status: 'active',
      activatedAt: now,
      reason: 'System theme seed.',
    },
    metadata: {
      artDirection: theme.artDirection,
      inspiration: theme.inspiration,
      category: 'system',
      personality: theme.personality,
      bestFor: theme.bestFor,
      source: 'system',
      notes: theme.designerNote,
      designerNote: theme.designerNote,
    },
  } satisfies EdenThemePackage

  return {
    ...basePackage,
    figmaTokens: edenThemeToFigmaTokens(basePackage),
  }
}

export function themeConceptToModeTokens(theme: ThemeConcept, appearance: ThemeAppearanceMode): ThemeModeTokens {
  const mode = theme.modes[appearance]
  const vars = getEdenThemeCssVars(theme, appearance)
  const oppositeText = appearance === 'dark' ? '#061015' : '#FFFFFF'
  const bannerAsset = assetRef(`${theme.id}-${appearance}-page-banner`, 'pageBanner', ['banner'])
  const listAsset = assetRef(`${theme.id}-${appearance}-list-watermark`, 'listArea', ['list'])
  const formAsset = assetRef(`${theme.id}-${appearance}-form-hero`, 'formArea', ['form'])
  const wizardAsset = assetRef(`${theme.id}-${appearance}-wizard`, 'wizardArea', ['wizard'])
  const loginAsset = assetRef(`${theme.id}-${appearance}-login`, 'loginArea', ['login'])
  const dashboardAsset = assetRef(`${theme.id}-${appearance}-dashboard`, 'dashboardArea', ['dashboard'])

  return {
    colors: {
      primary: mode.accent,
      primaryForeground: mode.accentText || oppositeText,
      secondary: mode.info,
      secondaryForeground: mode.text,
      accent: mode.accentWarm,
      accentForeground: appearance === 'dark' ? '#07110D' : '#FFFFFF',
      background: mode.bg,
      foreground: mode.text,
      surface: mode.surface,
      surfaceMuted: mode.surfaceMuted,
      surfaceRaised: mode.surfaceRaised,
      card: mode.cardBg,
      cardForeground: mode.text,
      muted: mode.surfaceMuted,
      mutedForeground: mode.textMuted,
      border: mode.border,
      borderStrong: mode.borderStrong,
      input: mode.inputBg,
      inputForeground: mode.text,
      ring: mode.inputFocus,
      success: mode.success,
      successForeground: mode.text,
      warning: mode.warning,
      warningForeground: appearance === 'dark' ? '#07110D' : '#1F1305',
      danger: mode.danger,
      dangerForeground: '#FFFFFF',
      info: mode.info,
      infoForeground: mode.text,
    },
    background: {
      page: backgroundLayer('gradient', mode.bg, mode.bgSubtle, '135deg'),
      app: backgroundLayer('mixed', mode.bg, mode.surfaceMuted, '145deg'),
      sidebar: backgroundLayer('solid', mode.navBg, mode.navBg),
      topbar: backgroundLayer('solid', mode.headerBg, mode.headerBg),
      login: backgroundLayer('illustration-overlay', mode.bg, mode.surfaceMuted, '135deg', loginAsset),
      dashboard: backgroundLayer('illustration-overlay', mode.bg, mode.surfaceMuted, '135deg', dashboardAsset),
      form: backgroundLayer('solid', mode.surface, mode.surface),
      list: backgroundLayer('pattern', mode.surfaceMuted, mode.surface, '180deg', listAsset),
      modal: backgroundLayer('solid', mode.surfaceRaised, mode.surfaceRaised),
      drawer: backgroundLayer('solid', mode.surfaceRaised, mode.surfaceRaised),
    },
    illustrations: {
      pageBanner: {
        light: appearance === 'light' ? bannerAsset : disabledAsset(`${theme.id}-light-page-banner`, 'pageBanner', ['banner']),
        dark: appearance === 'dark' ? bannerAsset : disabledAsset(`${theme.id}-dark-page-banner`, 'pageBanner', ['banner']),
        backgroundType: 'illustration-overlay',
        placement: 'top-right',
        sizing: 'cover',
        cropBehavior: 'edge-fade',
        cornerDecoration: motifDecoration(theme.motif.style),
        frameStyle: theme.id === themeConcepts[0]?.id ? 'thin' : 'ornamental',
      },
      listArea: {
        headerDecoration: listAsset,
        panelIllustration: listAsset,
        watermark: listAsset,
        emptyState: assetRef(`${theme.id}-${appearance}-empty`, 'listArea', ['list']),
        toolbarDecoration: disabledAsset(`${theme.id}-${appearance}-toolbar`, 'listArea', ['list']),
        topStripDecoration: 'subtle themed strip',
      },
      formArea: {
        heroIllustration: formAsset,
        sideImage: formAsset,
        cornerArt: assetRef(`${theme.id}-${appearance}-corner-art`, 'formArea', ['form']),
        logoPlaceholderArtwork: disabledAsset(`${theme.id}-${appearance}-logo-placeholder`, 'formArea', ['form']),
      },
      wizardArea: {
        backgroundIllustration: wizardAsset,
        sideIllustration: wizardAsset,
        completionIllustration: assetRef(`${theme.id}-${appearance}-wizard-complete`, 'wizardArea', ['wizard']),
      },
      loginArea: {
        heroImage: loginAsset,
        backgroundImage: loginAsset,
      },
      dashboardArea: {
        welcomeCardImage: dashboardAsset,
        dashboardHeroIllustration: dashboardAsset,
      },
    },
    typography: {
      fontFamily: 'system-ui, ui-sans-serif, sans-serif',
      headingFontFamily: 'system-ui, ui-sans-serif, sans-serif',
      monoFontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      baseFontSize: '14px',
      headingScale: theme.density === 'compact' ? 1.08 : theme.density === 'comfortable' ? 1.18 : 1.12,
      bodyTextScale: 1,
      lineHeight: 1.5,
      letterSpacing: '0',
      headingWeight: 650,
      bodyWeight: 400,
      labelWeight: 600,
    },
    shape: {
      radiusSmall: theme.radius.radiusSmall,
      radiusMedium: theme.radius.radiusMedium,
      radiusLarge: theme.radius.radiusLarge,
      radiusXl: theme.radius.cardRadius,
      radiusCard: vars['--eden-radius-card'],
      radiusInput: theme.radius.inputRadius,
      radiusButton: theme.radius.radiusMedium,
      radiusBanner: vars['--eden-radius-card'],
      radiusWizard: theme.radius.radiusLarge,
    },
    spacing: {
      pagePadding: theme.density === 'compact' ? '16px' : theme.density === 'comfortable' ? '28px' : '22px',
      sectionGap: vars['--eden-section-gap'],
      cardPadding: vars['--eden-card-padding'],
      fieldGap: theme.density === 'compact' ? '10px' : '14px',
      tableRowHeight: vars['--eden-table-row-height'],
      sidebarWidth: '280px',
      topbarHeight: '64px',
    },
    shadow: {
      shadowSubtle: theme.shadows.shadowSubtle,
      shadowCard: vars['--eden-shadow-card'],
      shadowFloating: theme.shadows.shadowFloating,
      shadowFocus: theme.shadows.shadowFocus,
      shadowBanner: theme.shadows.shadowCard,
      modalShadow: theme.shadows.shadowFloating,
      dropdownShadow: theme.shadows.shadowFloating,
    },
    components: {
      shell: {
        navBg: mode.navBg,
        navText: mode.navText,
        navMuted: mode.navMuted,
        navHoverBg: mode.navHoverBg,
        navActiveBg: mode.navActiveBg,
        navActiveText: mode.navActiveText,
        headerBg: mode.headerBg,
        headerBorder: mode.headerBorder,
      },
      pageBanner: {
        pageBannerBg: mode.accent,
        pageBannerText: mode.accentText,
        pageBannerMuted: mode.textMuted,
        pageBannerAccent: mode.accentWarm,
        pageBannerBorder: mode.borderStrong,
        pageBannerShadow: theme.shadows.shadowCard,
      },
      smartList: {
        listContainerBg: mode.surfaceMuted,
        listHeaderSurface: mode.surface,
        listDecorativeBackground: mode.accentSoft,
        listWatermarkOpacity: String(theme.motif.opacity[appearance]),
        listTopStripDecoration: mode.accentWarm,
        listPanelBorder: mode.border,
        listRowSeparators: mode.border,
        listHoverVisualEffect: mode.tableRowHover,
        listToolbarSurface: mode.surface,
      },
      cards: {
        cardBg: mode.cardBg,
        cardBorder: mode.cardBorder,
        cardShadow: theme.shadows.shadowCard,
        cardHoverBg: mode.surfaceMuted,
      },
      forms: {
        inputBg: mode.inputBg,
        inputBorder: mode.inputBorder,
        inputFocus: mode.inputFocus,
        inputPlaceholder: mode.textSoft,
        inputDisabledBg: mode.surfaceMuted,
      },
      tables: {
        tableHeaderBg: mode.tableHeaderBg,
        tableHeaderText: mode.text,
        tableBorder: mode.border,
        tableRowHover: mode.tableRowHover,
        tableRowSelected: mode.tableRowSelected,
      },
      badges: {
        badgeNeutralBg: mode.badgeBg,
        badgeNeutralText: mode.text,
        badgeSuccessBg: mode.successSoft,
        badgeSuccessText: mode.success,
        badgeWarningBg: mode.warningSoft,
        badgeWarningText: mode.warning,
        badgeDangerBg: mode.dangerSoft,
        badgeDangerText: mode.danger,
        badgeInfoBg: mode.infoSoft,
        badgeInfoText: mode.info,
      },
      wizard: {
        wizardBg: mode.bg,
        wizardPanelBg: mode.surface,
        wizardPanelBorder: mode.border,
        wizardStepBg: mode.surfaceMuted,
        wizardStepActiveBg: mode.accent,
        wizardStepActiveText: mode.accentText,
        wizardStepCompleteBg: mode.successSoft,
        wizardStepCompleteText: mode.success,
        wizardStepLine: mode.border,
        wizardSummaryBg: mode.surfaceRaised,
        wizardSidebarBg: mode.surfaceMuted,
        wizardSidebarBorder: mode.border,
      },
      tabs: {
        tabBg: mode.surfaceMuted,
        tabActiveBg: mode.surface,
        tabActiveText: mode.accent,
        tabBorder: mode.border,
      },
      modal: {
        modalBg: mode.surfaceRaised,
        modalBorder: mode.border,
        modalShadow: theme.shadows.shadowFloating,
      },
      drawer: {
        drawerBg: mode.surfaceRaised,
        drawerBorder: mode.border,
      },
      buttons: {
        primaryBg: mode.accent,
        primaryText: mode.accentText,
        primaryHover: mode.accentHover,
        secondaryBg: mode.surfaceMuted,
        secondaryText: mode.text,
        dangerBg: mode.danger,
        dangerText: '#FFFFFF',
      },
      alerts: {
        alertBg: mode.alertBg,
        alertBorder: mode.alertBorder,
        alertText: mode.text,
      },
      toast: {
        toastBg: mode.surfaceRaised,
        toastBorder: mode.border,
        toastText: mode.text,
      },
      interaction: {
        focusRing: mode.focusRing,
        hoverOverlay: mode.surfaceMuted,
        selectedOverlay: mode.accentSoft,
      },
    },
    states: {
      hoverBackground: mode.tableRowHover,
      activeBackground: mode.navActiveBg,
      selectedBackground: mode.tableRowSelected,
      selectedBorder: mode.borderStrong,
      disabledOpacity: 0.55,
      focusRing: mode.focusRing,
      focusRingOffset: '2px',
      errorState: mode.danger,
      warningState: mode.warning,
      successState: mode.success,
      loadingState: mode.surfaceMuted,
      skeletonState: mode.surfaceInset,
    },
    density: {
      table: theme.density,
      form: theme.density,
      dashboard: theme.density,
    },
    icon: {
      strokeWidth: theme.iconStyle.strokeWidth,
      containerRadius: theme.radius.radiusMedium,
      containerStyle: 'soft',
      containerBackground: mode.iconContainerBg,
      containerBorder: mode.iconContainerBorder,
      moduleBackgroundOpacity: theme.density === 'compact' ? 0.12 : 0.16,
    },
    motif: {
      type: motifType(theme.motif.style),
      cornerType: theme.motif.cornerType,
      illustrationType: theme.motif.illustrationType,
      opacity: theme.motif.opacity[appearance],
      lineWeight: theme.motif.lineWeight,
      placement: 'corner-frame',
      density: theme.id === themeConcepts[0]?.id ? 'minimal' : 'balanced',
      useOnHero: theme.motif.useOnHero,
      useOnFeaturedCards: theme.motif.useOnFeaturedCards,
      useOnEmptyStates: theme.motif.useOnEmptyStates,
      useOnSectionHeaders: theme.motif.useOnSectionHeaders,
    },
  }
}

export function edenThemeToFigmaTokens(theme: EdenThemePackage) {
  return {
    global: {
      color: {
        light: modeTokensToTokenStudio(theme.modes.light.colors),
        dark: modeTokensToTokenStudio(theme.modes.dark.colors),
      },
      typography: modeTokensToTokenStudio(theme.modes.light.typography),
      spacing: modeTokensToTokenStudio(theme.modes.light.spacing),
      borderRadius: modeTokensToTokenStudio(theme.modes.light.shape),
      boxShadow: modeTokensToTokenStudio(theme.modes.light.shadow),
    },
    illustrations: {
      light: modeTokensToTokenStudio(theme.modes.light.illustrations),
      dark: modeTokensToTokenStudio(theme.modes.dark.illustrations),
    },
    components: {
      light: modeTokensToTokenStudio(theme.modes.light.components),
      dark: modeTokensToTokenStudio(theme.modes.dark.components),
    },
    metadata: {
      format: 'tokens-studio-compatible',
      schemaVersion: theme.schemaVersion,
      themeKey: theme.meta.themeKey,
      displayName: theme.meta.displayName,
      source: theme.metadata.source,
    },
  }
}

export function edenThemeToCssVariables(theme: EdenThemePackage) {
  return [
    `/* ${theme.meta.displayName} (${theme.meta.themeKey}) - Eden ERP V2 theme tokens */`,
    cssBlock(`[data-visual-theme="${theme.meta.themeKey}"][data-appearance-mode="light"],\n[data-eden-theme="${theme.meta.themeKey}"][data-appearance="light"]`, theme.cssVariables.light),
    cssBlock(`[data-visual-theme="${theme.meta.themeKey}"][data-appearance-mode="dark"],\n[data-eden-theme="${theme.meta.themeKey}"][data-appearance="dark"]`, theme.cssVariables.dark),
    '',
  ].join('\n')
}

export function themeTokensToCssVars(tokens: ThemeModeTokens): Record<`--${string}`, string> {
  const colors = tokens.colors
  const shell = tokens.components.shell
  const pageBanner = tokens.components.pageBanner
  const smartList = tokens.components.smartList
  const cards = tokens.components.cards
  const forms = tokens.components.forms
  const tables = tokens.components.tables
  const badges = tokens.components.badges
  const wizard = tokens.components.wizard

  return {
    '--eden-bg': colors.background,
    '--eden-bg-subtle': colors.muted,
    '--eden-surface': colors.surface,
    '--eden-surface-muted': colors.surfaceMuted,
    '--eden-surface-raised': colors.surfaceRaised,
    '--eden-surface-inset': tokens.states.skeletonState,
    '--eden-border': colors.border,
    '--eden-border-strong': colors.borderStrong,
    '--eden-text': colors.foreground,
    '--eden-text-muted': colors.mutedForeground,
    '--eden-text-soft': colors.mutedForeground,
    '--eden-accent': colors.primary,
    '--eden-accent-hover': tokens.components.buttons.primaryHover,
    '--eden-accent-soft': colors.muted,
    '--eden-accent-text': colors.primaryForeground,
    '--eden-accent-warm': colors.accent,
    '--eden-success': colors.success,
    '--eden-success-soft': badges.badgeSuccessBg || colors.surfaceMuted,
    '--eden-warning': colors.warning,
    '--eden-warning-soft': badges.badgeWarningBg || colors.surfaceMuted,
    '--eden-danger': colors.danger,
    '--eden-danger-soft': badges.badgeDangerBg || colors.surfaceMuted,
    '--eden-info': colors.info,
    '--eden-info-soft': badges.badgeInfoBg || colors.surfaceMuted,
    '--eden-nav-bg': shell.navBg,
    '--eden-nav-text': shell.navText,
    '--eden-nav-muted': shell.navMuted,
    '--eden-nav-active-bg': shell.navActiveBg,
    '--eden-nav-active-text': shell.navActiveText,
    '--eden-nav-hover-bg': shell.navHoverBg,
    '--eden-header-bg': shell.headerBg,
    '--eden-header-border': shell.headerBorder,
    '--eden-page-banner-bg': pageBanner.pageBannerBg,
    '--eden-page-banner-text': pageBanner.pageBannerText,
    '--eden-page-banner-muted': pageBanner.pageBannerMuted,
    '--eden-page-banner-accent': pageBanner.pageBannerAccent,
    '--eden-page-banner-border': pageBanner.pageBannerBorder,
    '--eden-page-banner-shadow': pageBanner.pageBannerShadow,
    '--eden-smart-list-bg': smartList.listContainerBg,
    '--eden-smart-list-header-bg': smartList.listHeaderSurface,
    '--eden-smart-list-decoration': smartList.listDecorativeBackground,
    '--eden-smart-list-border': smartList.listPanelBorder,
    '--eden-smart-list-hover': smartList.listHoverVisualEffect,
    '--eden-card-bg': cards.cardBg,
    '--eden-card-border': cards.cardBorder,
    '--eden-card-shadow': cards.cardShadow,
    '--eden-input-bg': forms.inputBg,
    '--eden-input-border': forms.inputBorder,
    '--eden-input-focus': forms.inputFocus,
    '--eden-table-header-bg': tables.tableHeaderBg,
    '--eden-table-row-hover': tables.tableRowHover,
    '--eden-table-row-selected': tables.tableRowSelected,
    '--eden-badge-bg': badges.badgeNeutralBg,
    '--eden-focus-ring': tokens.states.focusRing,
    '--eden-alert-bg': tokens.components.alerts.alertBg,
    '--eden-alert-border': tokens.components.alerts.alertBorder,
    '--eden-radius-sm': tokens.shape.radiusSmall,
    '--eden-radius-md': tokens.shape.radiusMedium,
    '--eden-radius-lg': tokens.shape.radiusLarge,
    '--eden-radius-card': tokens.shape.radiusCard,
    '--eden-radius-button': tokens.shape.radiusButton,
    '--eden-radius-input': tokens.shape.radiusInput,
    '--eden-shadow-subtle': tokens.shadow.shadowSubtle,
    '--eden-shadow-card': tokens.shadow.shadowCard,
    '--eden-shadow-floating': tokens.shadow.shadowFloating,
    '--eden-shadow-focus': tokens.shadow.shadowFocus,
    '--eden-table-row-height': tokens.spacing.tableRowHeight,
    '--eden-form-field-height': tokens.spacing.tableRowHeight,
    '--eden-card-padding': tokens.spacing.cardPadding,
    '--eden-section-gap': tokens.spacing.sectionGap,
    '--eden-icon-stroke': String(tokens.icon.strokeWidth),
    '--eden-icon-container-bg': tokens.icon.containerBackground,
    '--eden-icon-container-border': tokens.icon.containerBorder,
    '--eden-module-icon-bg': tokens.icon.containerBackground,
    '--eden-status-icon-bg': badges.badgeNeutralBg,
    '--eden-motif-opacity': String(tokens.motif.opacity),
    '--eden-motif-line-width': `${tokens.motif.lineWeight}px`,
    '--eden-motif-corner-size': '112px',
    '--eden-wizard-bg': wizard.wizardBg,
    '--eden-wizard-panel-bg': wizard.wizardPanelBg,
    '--eden-wizard-panel-border': wizard.wizardPanelBorder,
  }
}

export function themeTokensToDesignLabCssVars(tokens: ThemeModeTokens): Record<`--${string}`, string> {
  const colors = tokens.colors
  return {
    '--dl-background': colors.background,
    '--dl-foreground': colors.foreground,
    '--dl-surface-base': colors.surface,
    '--dl-surface-raised': colors.surfaceRaised,
    '--dl-surface-muted': colors.surfaceMuted,
    '--dl-border-subtle': colors.border,
    '--dl-border-strong': colors.borderStrong,
    '--dl-text-primary': colors.foreground,
    '--dl-text-secondary': colors.mutedForeground,
    '--dl-text-muted': colors.mutedForeground,
    '--dl-accent-primary': colors.primary,
    '--dl-accent-secondary': colors.secondary,
    '--dl-accent-warm': colors.accent,
    '--dl-success': colors.success,
    '--dl-warning': colors.warning,
    '--dl-danger': colors.danger,
    '--dl-info': colors.info,
    '--dl-radius-small': tokens.shape.radiusSmall,
    '--dl-radius-medium': tokens.shape.radiusMedium,
    '--dl-radius-large': tokens.shape.radiusLarge,
    '--dl-card-radius': tokens.shape.radiusCard,
    '--dl-input-radius': tokens.shape.radiusInput,
    '--dl-shadow-subtle': tokens.shadow.shadowSubtle,
    '--dl-shadow-card': tokens.shadow.shadowCard,
    '--dl-shadow-floating': tokens.shadow.shadowFloating,
    '--dl-shadow-focus': tokens.shadow.shadowFocus,
    '--dl-density-row': tokens.spacing.tableRowHeight,
    '--dl-density-gap': tokens.spacing.sectionGap,
    '--dl-motif-opacity': String(tokens.motif.opacity),
    '--dl-motif-line-width': `${tokens.motif.lineWeight}px`,
    '--dl-motif-corner-size': '112px',
  }
}

export function resolveSystemThemePackage(themeKey: string) {
  const normalized = findThemeConcept(themeKey as ThemeConceptId).id
  return buildEdenThemePackage(normalized)
}

function backgroundLayer(type: ThemeBackgroundLayer['type'], from: string, to: string, direction = '135deg', image?: ThemeAssetRef): ThemeBackgroundLayer {
  return {
    type,
    color: from,
    gradientFrom: from,
    gradientTo: to,
    gradientDirection: direction,
    patternEnabled: type === 'pattern' || type === 'mixed',
    patternType: type === 'pattern' ? 'grid' : 'none',
    patternColor: to,
    patternOpacity: 0.08,
    patternSize: '32px',
    patternSpacing: '24px',
    patternRotation: 0,
    overlayColor: from,
    overlayOpacity: type.includes('illustration') ? 0.2 : 0,
    image,
  }
}

function assetRef(assetId: string, category: string, visibleOn: ThemeAssetRef['visibleOn']): ThemeAssetRef {
  return {
    assetId,
    assetName: assetId.replace(/_/g, ' '),
    assetType: 'illustration',
    assetCategory: category,
    sourceType: 'internal-library',
    focalPointX: 70,
    focalPointY: 35,
    fit: 'cover',
    opacity: 0.22,
    overlayOpacity: 0.1,
    borderRadius: '18px',
    visibleOn,
    enabled: true,
  }
}

function disabledAsset(assetId: string, category: string, visibleOn: ThemeAssetRef['visibleOn']): ThemeAssetRef {
  return {
    ...assetRef(assetId, category, visibleOn),
    enabled: false,
    opacity: 0,
  }
}

function motifType(style: string): ThemeModeTokens['motif']['type'] {
  if (style.includes('botanical')) return 'botanical'
  if (style.includes('sun') || style.includes('horizon')) return 'horizon'
  if (style.includes('rings')) return 'circles'
  if (style.includes('deco')) return 'skyline'
  if (style.includes('grid')) return 'broken_grid'
  return 'geometric'
}

function motifDecoration(style: string): 'none' | 'geometric' | 'botanical' | 'horizon' | 'skyline' | 'broken_grid' {
  const type = motifType(style)
  if (type === 'botanical') return 'botanical'
  if (type === 'horizon' || type === 'circles') return 'horizon'
  if (type === 'skyline') return 'skyline'
  if (type === 'broken_grid') return 'broken_grid'
  return 'geometric'
}

function modeTokensToTokenStudio(value: unknown): TokenStudioNode {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return {
      value,
      type: inferTokenType(value),
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return { value: String(value ?? ''), type: 'other' }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, modeTokensToTokenStudio(child)])
  ) as TokenStudioNode
}

function inferTokenType(value: string | number | boolean) {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (/^#|^rgb|^hsl/i.test(value)) return 'color'
  if (/px$|rem$|^0$|%$/i.test(value)) return 'dimension'
  if (/shadow|rgba|0\s/.test(value)) return 'boxShadow'
  return 'other'
}

function cssBlock(selector: string, vars: Record<string, string>) {
  const body = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')
  return `${selector} {\n${body}\n}`
}
