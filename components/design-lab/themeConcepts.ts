export type ThemeConceptId = 'hikmet' | 'bozkir' | 'esitlik' | 'tabiat' | 'atlas' | 'avangard'
export type LegacyThemeConceptId =
  | 'classic'
  | 'classicCurrent'
  | 'executivePremium'
  | 'anatolianModern'
  | 'technicalCommand'
  | 'executive'
  | 'art_deco'
  | 'art_deco_premium'
  | 'green_atelier'
  | 'command_bauhaus'
  | 'pop_studio'
  | 'executive_premium'
  | 'anatolian_60s'
  | 'anatolian_modern'
  | 'technical_command'
export type ThemeDensity = 'compact' | 'balanced' | 'comfortable'
export type ThemeAppearanceMode = 'light' | 'dark'
export type ThemeMotifStyle =
  | 'medrese_geometry'
  | 'steppe_horizon'
  | 'equality_rings'
  | 'botanical_line'
  | 'atlas_deco'
  | 'avant_grid'

export const DEFAULT_VISUAL_THEME_ID: ThemeConceptId = 'hikmet'
export const DEFAULT_DESIGN_LAB_THEME_ID: ThemeConceptId = DEFAULT_VISUAL_THEME_ID
export const VISUAL_THEME_CHANGE_EVENT = 'eden:visual-theme-change'
export const VISUAL_THEME_STORAGE_KEY = 'eden.visualTheme'
export const LEGACY_DESIGN_LAB_THEME_STORAGE_KEY = 'eden.designLab.activeTheme'
export const DESIGN_LAB_THEME_CHANGE_EVENT = VISUAL_THEME_CHANGE_EVENT
export const DESIGN_LAB_THEME_STORAGE_KEY = VISUAL_THEME_STORAGE_KEY

export const VISUAL_THEME_LABELS: Record<ThemeConceptId, string> = {
  hikmet: 'Hikmet',
  bozkir: 'Bozkır',
  esitlik: 'Eşitlik',
  tabiat: 'Tabiat',
  atlas: 'Atlas',
  avangard: 'Avangard',
}

const LEGACY_THEME_ID_MAP: Record<LegacyThemeConceptId, ThemeConceptId> = {
  classic: 'hikmet',
  classicCurrent: 'hikmet',
  executivePremium: 'atlas',
  anatolianModern: 'bozkir',
  technicalCommand: 'avangard',
  executive: 'atlas',
  art_deco: 'atlas',
  art_deco_premium: 'atlas',
  green_atelier: 'tabiat',
  command_bauhaus: 'tabiat',
  pop_studio: 'avangard',
  executive_premium: 'atlas',
  anatolian_60s: 'bozkir',
  anatolian_modern: 'bozkir',
  technical_command: 'avangard',
}

export const CANONICAL_THEME_KEYS: Record<ThemeConceptId, string> = {
  hikmet: 'hikmet',
  bozkir: 'bozkir',
  esitlik: 'esitlik',
  tabiat: 'tabiat',
  atlas: 'atlas',
  avangard: 'avangard',
}

export interface ThemeConceptColors {
  background: string
  foreground: string
  surfaceBase: string
  surfaceRaised: string
  surfaceMuted: string
  borderSubtle: string
  borderStrong: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accentPrimary: string
  accentSecondary: string
  accentWarm: string
  success: string
  warning: string
  danger: string
  info: string
}

export interface ThemeModeVisualTokens {
  bg: string
  bgSubtle: string
  surface: string
  surfaceMuted: string
  surfaceRaised: string
  surfaceInset: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  textSoft: string
  accent: string
  accentHover: string
  accentSoft: string
  accentText: string
  accentWarm: string
  success: string
  successSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  info: string
  infoSoft: string
  navBg: string
  navText: string
  navMuted: string
  navActiveBg: string
  navActiveText: string
  navHoverBg: string
  headerBg: string
  headerBorder: string
  cardBg: string
  cardBorder: string
  inputBg: string
  inputBorder: string
  inputFocus: string
  tableHeaderBg: string
  tableRowHover: string
  tableRowSelected: string
  badgeBg: string
  focusRing: string
  alertBg: string
  alertBorder: string
  iconContainerBg: string
  iconContainerBorder: string
  moduleIconBg: string
  statusIconBg: string
}

export interface ThemeConcept {
  id: ThemeConceptId
  name: string
  description: string
  artDirection: string
  inspiration: string
  personality: string[]
  bestFor: string[]
  colors: ThemeConceptColors
  modes: Record<ThemeAppearanceMode, ThemeModeVisualTokens>
  surfaces: {
    page: string
    panel: string
    card: string
    control: string
    subtlePattern: string
  }
  typography: {
    headingStyle: string
    bodyStyle: string
    labelStyle: string
    monoStyle: string
  }
  radius: {
    radiusSmall: string
    radiusMedium: string
    radiusLarge: string
    cardRadius: string
    inputRadius: string
    buttonRadius: string
    bannerRadius: string
    wizardRadius: string
  }
  shadows: {
    shadowSubtle: string
    shadowCard: string
    shadowFloating: string
    shadowFocus: string
  }
  iconStyle: {
    strokeWidth: number
    iconContainer: string
    moduleIconBackground: string
    statusIconStyle: string
  }
  motif: {
    style: ThemeMotifStyle
    cornerType: string
    illustrationType: string
    opacity: Record<ThemeAppearanceMode, number>
    lineWeight: number
    useOnHero: boolean
    useOnFeaturedCards: boolean
    useOnEmptyStates: boolean
    useOnSectionHeaders: boolean
    note: string
    lightBehavior: string
    darkBehavior: string
  }
  density: ThemeDensity
  sampleBadges: {
    label: string
    background: string
    foreground: string
  }[]
  designerNote: string
}

type ThemeDefinition = Omit<ThemeConcept, 'colors'>

function makeTheme(definition: ThemeDefinition): ThemeConcept {
  const light = definition.modes.light
  return {
    ...definition,
    colors: {
      background: light.bg,
      foreground: light.text,
      surfaceBase: light.surface,
      surfaceRaised: light.surfaceRaised,
      surfaceMuted: light.surfaceMuted,
      borderSubtle: light.border,
      borderStrong: light.borderStrong,
      textPrimary: light.text,
      textSecondary: light.textMuted,
      textMuted: light.textSoft,
      accentPrimary: light.accent,
      accentSecondary: light.info,
      accentWarm: light.accentWarm,
      success: light.success,
      warning: light.warning,
      danger: light.danger,
      info: light.info,
    },
  }
}

const rawThemes: ThemeDefinition[] = [
  {
    "id": "hikmet",
    "name": "Hikmet",
    "description": "Hikmet, sukunet ve medrese geometrisi hissi tasiyan rafine ERP temasi.",
    "artDirection": "Islam dusunce geleneginden esinlenen, vakur ve geometrik kurumsal kimlik.",
    "inspiration": "Hikmet, medrese geometrisi, hat/tezhip hissi, zumrut ve muted altin vurgular.",
    "personality": [
      "vakur",
      "sakin",
      "geometrik",
      "rafine"
    ],
    "bestFor": [
      "ana ERP kullanimi",
      "yonetim ekranlari",
      "uzun sureli operasyon"
    ],
    "modes": {
      "light": {
        "bg": "#F7F1E4",
        "bgSubtle": "#EEE3CF",
        "surface": "#FFFCF4",
        "surfaceMuted": "#EEE3CF",
        "surfaceRaised": "#FFFCF4",
        "surfaceInset": "#EEE3CF",
        "border": "#D8C9AD",
        "borderStrong": "#B99D69",
        "text": "#17212B",
        "textMuted": "#6F6658",
        "textSoft": "#6F6658",
        "accent": "#0F6B55",
        "accentHover": "#0A4D3D",
        "accentSoft": "#DCEBE4",
        "accentText": "#FFFFFF",
        "accentWarm": "#B89045",
        "success": "#1F7A4B",
        "successSoft": "#DCEBDD",
        "warning": "#B89045",
        "warningSoft": "#F3E5C9",
        "danger": "#A6423A",
        "dangerSoft": "#F0D8D2",
        "info": "#1F7A68",
        "infoSoft": "#DCEBE4",
        "navBg": "#102A26",
        "navText": "#F8FAFC",
        "navMuted": "#D6CDB9",
        "navActiveBg": "color-mix(in srgb, #0F6B55 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#FFFCF4",
        "headerBorder": "#D8C9AD",
        "cardBg": "#FFFCF4",
        "cardBorder": "#D8C9AD",
        "inputBg": "#FFFFFF",
        "inputBorder": "#B99D69",
        "inputFocus": "#0F6B55",
        "tableHeaderBg": "#EEE3CF",
        "tableRowHover": "color-mix(in srgb, #FFFCF4 70%, #DCEBE4)",
        "tableRowSelected": "#DCEBE4",
        "badgeBg": "#EEE3CF",
        "focusRing": "color-mix(in srgb, #0F6B55 28%, transparent)",
        "alertBg": "#F3E5C9",
        "alertBorder": "#B89045",
        "iconContainerBg": "#DCEBE4",
        "iconContainerBorder": "#D8C9AD",
        "moduleIconBg": "#0F6B55",
        "statusIconBg": "#EEE3CF"
      },
      "dark": {
        "bg": "#071A1D",
        "bgSubtle": "#143638",
        "surface": "#0E2A2C",
        "surfaceMuted": "#143638",
        "surfaceRaised": "#143638",
        "surfaceInset": "#071A1D",
        "border": "#2D4C4B",
        "borderStrong": "#5D746B",
        "text": "#F4EBD8",
        "textMuted": "#B9AA91",
        "textSoft": "#B9AA91",
        "accent": "#2BAA82",
        "accentHover": "#3DC29B",
        "accentSoft": "#123D34",
        "accentText": "#07110D",
        "accentWarm": "#C6A15B",
        "success": "#58B883",
        "successSoft": "#173823",
        "warning": "#C6A15B",
        "warningSoft": "#3A2A13",
        "danger": "#D16A5D",
        "dangerSoft": "#3B1D1A",
        "info": "#64BFA3",
        "infoSoft": "#123D34",
        "navBg": "#061315",
        "navText": "#F4F7FB",
        "navMuted": "#B9AA91",
        "navActiveBg": "color-mix(in srgb, #2BAA82 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#0E2A2C",
        "headerBorder": "#2D4C4B",
        "cardBg": "#0E2A2C",
        "cardBorder": "#2D4C4B",
        "inputBg": "#071A1D",
        "inputBorder": "#5D746B",
        "inputFocus": "#2BAA82",
        "tableHeaderBg": "#143638",
        "tableRowHover": "color-mix(in srgb, #0E2A2C 70%, #123D34)",
        "tableRowSelected": "#123D34",
        "badgeBg": "#143638",
        "focusRing": "color-mix(in srgb, #2BAA82 28%, transparent)",
        "alertBg": "#3A2A13",
        "alertBorder": "#C6A15B",
        "iconContainerBg": "#123D34",
        "iconContainerBorder": "#2D4C4B",
        "moduleIconBg": "#2BAA82",
        "statusIconBg": "#143638"
      }
    },
    "radius": {
      "radiusSmall": "8px",
      "radiusMedium": "10px",
      "radiusLarge": "12px",
      "cardRadius": "12px",
      "inputRadius": "10px",
      "buttonRadius": "10px",
      "bannerRadius": "14px",
      "wizardRadius": "14px"
    },
    "motif": {
      "style": "medrese_geometry",
      "cornerType": "geometric arch corner",
      "illustrationType": "medrese star geometry and fine arch linework",
      "opacity": {
        "light": 0.14,
        "dark": 0.1
      },
      "lineWeight": 1.15,
      "useOnHero": true,
      "useOnFeaturedCards": true,
      "useOnEmptyStates": true,
      "useOnSectionHeaders": true,
      "note": "Hikmet motif dili: medrese star geometry and fine arch linework.",
      "lightBehavior": "Light mode motif daha gorunur ama dusuk opaklikta kalir.",
      "darkBehavior": "Dark mode motif daha ince, kontrollu ve dusuk kontrastlidir."
    },
    "density": "balanced",
    "surfaces": {
      "page": "Hikmet page background uses the theme base and subtle motif tint.",
      "panel": "Token-driven panel with theme border and surface contrast.",
      "card": "Card surfaces use theme radius, border, shadow and corner art.",
      "control": "Controls use theme input radius, focus ring and accent.",
      "subtlePattern": "medrese star geometry and fine arch linework"
    },
    "typography": {
      "headingStyle": "Kurumsal ve okunakli baslik agirligi.",
      "bodyStyle": "Yogun ERP verisi icin rahat okunur govde ritmi.",
      "labelStyle": "Kucuk, net ve taranabilir etiketler.",
      "monoStyle": "Kimlik, tarih ve teknik alanlar icin sade monospace."
    },
    "shadows": {
      "shadowSubtle": "0 1px 2px rgba(15, 23, 42, 0.06)",
      "shadowCard": "0 14px 36px rgba(15, 23, 42, 0.10)",
      "shadowFloating": "0 24px 60px rgba(15, 23, 42, 0.18)",
      "shadowFocus": "0 0 0 3px color-mix(in srgb, #0F6B55 28%, transparent)"
    },
    "iconStyle": {
      "strokeWidth": 1.8,
      "iconContainer": "Tokenized icon container with theme accent tint.",
      "moduleIconBackground": "Module icon background follows --eden-module-icon-bg.",
      "statusIconStyle": "Status icons are supported by text and semantic colors."
    },
    "sampleBadges": [
      {
        "label": "Aktif",
        "background": "#DCEBDD",
        "foreground": "#1F7A4B"
      },
      {
        "label": "Bekliyor",
        "background": "#F3E5C9",
        "foreground": "#B89045"
      },
      {
        "label": "Risk",
        "background": "#F0D8D2",
        "foreground": "#A6423A"
      }
    ],
    "designerNote": "Hikmet logosu degistirmeden renk, radius, yuzey, motif ve frame diliyle ayirt edilir."
  },
  {
    "id": "bozkir",
    "name": "Bozkır",
    "description": "Bozkir, Turk modernizmi ve devlet ciddiyetini tas, celik ve bakir vurgularla tasir.",
    "artDirection": "Bozkir ufku, gunes, tas ve disiplinli modern devlet dili.",
    "inspiration": "Bozkir cografyasi, ufuk cizgisi, celik lacivert ve muted bakir.",
    "personality": [
      "guclu",
      "disiplinli",
      "yerli",
      "agirbasli"
    ],
    "bestFor": [
      "holding yonetimi",
      "resmi surecler",
      "operasyon panelleri"
    ],
    "modes": {
      "light": {
        "bg": "#F2E7D6",
        "bgSubtle": "#E8D9C2",
        "surface": "#FAF7F2",
        "surfaceMuted": "#E8D9C2",
        "surfaceRaised": "#FAF7F2",
        "surfaceInset": "#E8D9C2",
        "border": "#D0B996",
        "borderStrong": "#A98255",
        "text": "#1E1F23",
        "textMuted": "#6F6250",
        "textSoft": "#6F6250",
        "accent": "#0F1B2D",
        "accentHover": "#0A1220",
        "accentSoft": "#D8DEE8",
        "accentText": "#FFFFFF",
        "accentWarm": "#B87333",
        "success": "#3D6B45",
        "successSoft": "#DCEBDD",
        "warning": "#B87333",
        "warningSoft": "#F3E5C9",
        "danger": "#A43F34",
        "dangerSoft": "#F0D8D2",
        "info": "#C0392B",
        "infoSoft": "#D8DEE8",
        "navBg": "#111827",
        "navText": "#F8FAFC",
        "navMuted": "#D6CDB9",
        "navActiveBg": "color-mix(in srgb, #0F1B2D 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#FAF7F2",
        "headerBorder": "#D0B996",
        "cardBg": "#FAF7F2",
        "cardBorder": "#D0B996",
        "inputBg": "#FFFFFF",
        "inputBorder": "#A98255",
        "inputFocus": "#0F1B2D",
        "tableHeaderBg": "#E8D9C2",
        "tableRowHover": "color-mix(in srgb, #FAF7F2 70%, #D8DEE8)",
        "tableRowSelected": "#D8DEE8",
        "badgeBg": "#E8D9C2",
        "focusRing": "color-mix(in srgb, #0F1B2D 28%, transparent)",
        "alertBg": "#F3E5C9",
        "alertBorder": "#B87333",
        "iconContainerBg": "#D8DEE8",
        "iconContainerBorder": "#D0B996",
        "moduleIconBg": "#0F1B2D",
        "statusIconBg": "#E8D9C2"
      },
      "dark": {
        "bg": "#0E1116",
        "bgSubtle": "#1D2632",
        "surface": "#141B24",
        "surfaceMuted": "#1D2632",
        "surfaceRaised": "#1D2632",
        "surfaceInset": "#0E1116",
        "border": "#33404D",
        "borderStrong": "#5C6874",
        "text": "#EFE7D8",
        "textMuted": "#B5A68F",
        "textSoft": "#B5A68F",
        "accent": "#B87333",
        "accentHover": "#D08A48",
        "accentSoft": "#332014",
        "accentText": "#07110D",
        "accentWarm": "#C48A4A",
        "success": "#78A36D",
        "successSoft": "#173823",
        "warning": "#C48A4A",
        "warningSoft": "#3A2A13",
        "danger": "#D16A5D",
        "dangerSoft": "#3B1D1A",
        "info": "#C94B3B",
        "infoSoft": "#332014",
        "navBg": "#090C10",
        "navText": "#F4F7FB",
        "navMuted": "#B5A68F",
        "navActiveBg": "color-mix(in srgb, #B87333 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#141B24",
        "headerBorder": "#33404D",
        "cardBg": "#141B24",
        "cardBorder": "#33404D",
        "inputBg": "#0E1116",
        "inputBorder": "#5C6874",
        "inputFocus": "#B87333",
        "tableHeaderBg": "#1D2632",
        "tableRowHover": "color-mix(in srgb, #141B24 70%, #332014)",
        "tableRowSelected": "#332014",
        "badgeBg": "#1D2632",
        "focusRing": "color-mix(in srgb, #B87333 28%, transparent)",
        "alertBg": "#3A2A13",
        "alertBorder": "#C48A4A",
        "iconContainerBg": "#332014",
        "iconContainerBorder": "#33404D",
        "moduleIconBg": "#B87333",
        "statusIconBg": "#1D2632"
      }
    },
    "radius": {
      "radiusSmall": "6px",
      "radiusMedium": "8px",
      "radiusLarge": "10px",
      "cardRadius": "8px",
      "inputRadius": "8px",
      "buttonRadius": "8px",
      "bannerRadius": "10px",
      "wizardRadius": "10px"
    },
    "motif": {
      "style": "steppe_horizon",
      "cornerType": "horizon and sun corner",
      "illustrationType": "low horizon line, sun disk and topographic bands",
      "opacity": {
        "light": 0.16,
        "dark": 0.11
      },
      "lineWeight": 1.2,
      "useOnHero": true,
      "useOnFeaturedCards": true,
      "useOnEmptyStates": true,
      "useOnSectionHeaders": true,
      "note": "Bozkır motif dili: low horizon line, sun disk and topographic bands.",
      "lightBehavior": "Light mode motif daha gorunur ama dusuk opaklikta kalir.",
      "darkBehavior": "Dark mode motif daha ince, kontrollu ve dusuk kontrastlidir."
    },
    "density": "compact",
    "surfaces": {
      "page": "Bozkır page background uses the theme base and subtle motif tint.",
      "panel": "Token-driven panel with theme border and surface contrast.",
      "card": "Card surfaces use theme radius, border, shadow and corner art.",
      "control": "Controls use theme input radius, focus ring and accent.",
      "subtlePattern": "low horizon line, sun disk and topographic bands"
    },
    "typography": {
      "headingStyle": "Kurumsal ve okunakli baslik agirligi.",
      "bodyStyle": "Yogun ERP verisi icin rahat okunur govde ritmi.",
      "labelStyle": "Kucuk, net ve taranabilir etiketler.",
      "monoStyle": "Kimlik, tarih ve teknik alanlar icin sade monospace."
    },
    "shadows": {
      "shadowSubtle": "0 1px 2px rgba(15, 23, 42, 0.06)",
      "shadowCard": "0 14px 36px rgba(15, 23, 42, 0.10)",
      "shadowFloating": "0 24px 60px rgba(15, 23, 42, 0.18)",
      "shadowFocus": "0 0 0 3px color-mix(in srgb, #0F1B2D 28%, transparent)"
    },
    "iconStyle": {
      "strokeWidth": 1.8,
      "iconContainer": "Tokenized icon container with theme accent tint.",
      "moduleIconBackground": "Module icon background follows --eden-module-icon-bg.",
      "statusIconStyle": "Status icons are supported by text and semantic colors."
    },
    "sampleBadges": [
      {
        "label": "Aktif",
        "background": "#DCEBDD",
        "foreground": "#3D6B45"
      },
      {
        "label": "Bekliyor",
        "background": "#F3E5C9",
        "foreground": "#B87333"
      },
      {
        "label": "Risk",
        "background": "#F0D8D2",
        "foreground": "#A43F34"
      }
    ],
    "designerNote": "Bozkır logosu degistirmeden renk, radius, yuzey, motif ve frame diliyle ayirt edilir."
  },
  {
    "id": "esitlik",
    "name": "Eşitlik",
    "description": "Esitlik, kapsayici ve guclu bir kurumsal dili murdum, coral ve halka motifleriyle kurar.",
    "artDirection": "Cagdas, feminist, guclu ve dayanisma odakli arayuz kimligi.",
    "inspiration": "Dayanisma halkalari, akiskan cizgiler, murdum ve gul kurusu tonlari.",
    "personality": [
      "kapsayici",
      "guclu",
      "sicak",
      "ozguvenli"
    ],
    "bestFor": [
      "IK",
      "paydas surecleri",
      "topluluk ve ekip ekranlari"
    ],
    "modes": {
      "light": {
        "bg": "#FFF1F5",
        "bgSubtle": "#F8DDE8",
        "surface": "#FFF8FA",
        "surfaceMuted": "#F8DDE8",
        "surfaceRaised": "#FFF8FA",
        "surfaceInset": "#F8DDE8",
        "border": "#E8BFD0",
        "borderStrong": "#C88AA7",
        "text": "#2B1224",
        "textMuted": "#7D536A",
        "textSoft": "#7D536A",
        "accent": "#B83272",
        "accentHover": "#98295E",
        "accentSoft": "#F7D6E6",
        "accentText": "#FFFFFF",
        "accentWarm": "#D85B86",
        "success": "#2F7D62",
        "successSoft": "#DCEBDD",
        "warning": "#D85B86",
        "warningSoft": "#F3E5C9",
        "danger": "#B8304D",
        "dangerSoft": "#F0D8D2",
        "info": "#D85B86",
        "infoSoft": "#F7D6E6",
        "navBg": "#351729",
        "navText": "#F8FAFC",
        "navMuted": "#D6CDB9",
        "navActiveBg": "color-mix(in srgb, #B83272 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#FFF8FA",
        "headerBorder": "#E8BFD0",
        "cardBg": "#FFF8FA",
        "cardBorder": "#E8BFD0",
        "inputBg": "#FFFFFF",
        "inputBorder": "#C88AA7",
        "inputFocus": "#B83272",
        "tableHeaderBg": "#F8DDE8",
        "tableRowHover": "color-mix(in srgb, #FFF8FA 70%, #F7D6E6)",
        "tableRowSelected": "#F7D6E6",
        "badgeBg": "#F8DDE8",
        "focusRing": "color-mix(in srgb, #B83272 28%, transparent)",
        "alertBg": "#F3E5C9",
        "alertBorder": "#D85B86",
        "iconContainerBg": "#F7D6E6",
        "iconContainerBorder": "#E8BFD0",
        "moduleIconBg": "#B83272",
        "statusIconBg": "#F8DDE8"
      },
      "dark": {
        "bg": "#190B18",
        "bgSubtle": "#34162C",
        "surface": "#261020",
        "surfaceMuted": "#34162C",
        "surfaceRaised": "#34162C",
        "surfaceInset": "#190B18",
        "border": "#56304A",
        "borderStrong": "#85506D",
        "text": "#FFF0F6",
        "textMuted": "#CFAABD",
        "textSoft": "#CFAABD",
        "accent": "#E05297",
        "accentHover": "#F06AAD",
        "accentSoft": "#4A1730",
        "accentText": "#07110D",
        "accentWarm": "#F08CAF",
        "success": "#69C49A",
        "successSoft": "#173823",
        "warning": "#F08CAF",
        "warningSoft": "#3A2A13",
        "danger": "#FF7A8E",
        "dangerSoft": "#3B1D1A",
        "info": "#F08CAF",
        "infoSoft": "#4A1730",
        "navBg": "#120711",
        "navText": "#F4F7FB",
        "navMuted": "#CFAABD",
        "navActiveBg": "color-mix(in srgb, #E05297 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#261020",
        "headerBorder": "#56304A",
        "cardBg": "#261020",
        "cardBorder": "#56304A",
        "inputBg": "#190B18",
        "inputBorder": "#85506D",
        "inputFocus": "#E05297",
        "tableHeaderBg": "#34162C",
        "tableRowHover": "color-mix(in srgb, #261020 70%, #4A1730)",
        "tableRowSelected": "#4A1730",
        "badgeBg": "#34162C",
        "focusRing": "color-mix(in srgb, #E05297 28%, transparent)",
        "alertBg": "#3A2A13",
        "alertBorder": "#F08CAF",
        "iconContainerBg": "#4A1730",
        "iconContainerBorder": "#56304A",
        "moduleIconBg": "#E05297",
        "statusIconBg": "#34162C"
      }
    },
    "radius": {
      "radiusSmall": "12px",
      "radiusMedium": "14px",
      "radiusLarge": "18px",
      "cardRadius": "18px",
      "inputRadius": "14px",
      "buttonRadius": "16px",
      "bannerRadius": "22px",
      "wizardRadius": "20px"
    },
    "motif": {
      "style": "equality_rings",
      "cornerType": "layered solidarity rings",
      "illustrationType": "overlapping rings and fluid connective lines",
      "opacity": {
        "light": 0.15,
        "dark": 0.1
      },
      "lineWeight": 1.25,
      "useOnHero": true,
      "useOnFeaturedCards": true,
      "useOnEmptyStates": true,
      "useOnSectionHeaders": true,
      "note": "Eşitlik motif dili: overlapping rings and fluid connective lines.",
      "lightBehavior": "Light mode motif daha gorunur ama dusuk opaklikta kalir.",
      "darkBehavior": "Dark mode motif daha ince, kontrollu ve dusuk kontrastlidir."
    },
    "density": "comfortable",
    "surfaces": {
      "page": "Eşitlik page background uses the theme base and subtle motif tint.",
      "panel": "Token-driven panel with theme border and surface contrast.",
      "card": "Card surfaces use theme radius, border, shadow and corner art.",
      "control": "Controls use theme input radius, focus ring and accent.",
      "subtlePattern": "overlapping rings and fluid connective lines"
    },
    "typography": {
      "headingStyle": "Kurumsal ve okunakli baslik agirligi.",
      "bodyStyle": "Yogun ERP verisi icin rahat okunur govde ritmi.",
      "labelStyle": "Kucuk, net ve taranabilir etiketler.",
      "monoStyle": "Kimlik, tarih ve teknik alanlar icin sade monospace."
    },
    "shadows": {
      "shadowSubtle": "0 1px 2px rgba(15, 23, 42, 0.06)",
      "shadowCard": "0 14px 36px rgba(15, 23, 42, 0.10)",
      "shadowFloating": "0 24px 60px rgba(15, 23, 42, 0.18)",
      "shadowFocus": "0 0 0 3px color-mix(in srgb, #B83272 28%, transparent)"
    },
    "iconStyle": {
      "strokeWidth": 1.8,
      "iconContainer": "Tokenized icon container with theme accent tint.",
      "moduleIconBackground": "Module icon background follows --eden-module-icon-bg.",
      "statusIconStyle": "Status icons are supported by text and semantic colors."
    },
    "sampleBadges": [
      {
        "label": "Aktif",
        "background": "#DCEBDD",
        "foreground": "#2F7D62"
      },
      {
        "label": "Bekliyor",
        "background": "#F3E5C9",
        "foreground": "#D85B86"
      },
      {
        "label": "Risk",
        "background": "#F0D8D2",
        "foreground": "#B8304D"
      }
    ],
    "designerNote": "Eşitlik logosu degistirmeden renk, radius, yuzey, motif ve frame diliyle ayirt edilir."
  },
  {
    "id": "tabiat",
    "name": "Tabiat",
    "description": "Tabiat, botanik cizgi dili ve dogal kagit yuzeyleriyle sakin ve uretken bir ERP deneyimi verir.",
    "artDirection": "Cevreci, botanik, zanaatkar ve surdurulebilir operasyon dili.",
    "inspiration": "Yaprak, dal, dogal kagit, orman yesili, sage ve ahsap vurgular.",
    "personality": [
      "dogal",
      "sakin",
      "uretken",
      "guvenli"
    ],
    "bestFor": [
      "uretim",
      "surdurulebilirlik",
      "saha ve belge surecleri"
    ],
    "modes": {
      "light": {
        "bg": "#F4F1E6",
        "bgSubtle": "#ECE6D4",
        "surface": "#FFFDF4",
        "surfaceMuted": "#ECE6D4",
        "surfaceRaised": "#FFFDF4",
        "surfaceInset": "#ECE6D4",
        "border": "#D3CBB7",
        "borderStrong": "#AFA58B",
        "text": "#243025",
        "textMuted": "#66725C",
        "textSoft": "#66725C",
        "accent": "#1F5A36",
        "accentHover": "#17442A",
        "accentSoft": "#DCEBDD",
        "accentText": "#FFFFFF",
        "accentWarm": "#A9793C",
        "success": "#2F7D46",
        "successSoft": "#DCEBDD",
        "warning": "#A9793C",
        "warningSoft": "#F3E5C9",
        "danger": "#A84638",
        "dangerSoft": "#F0D8D2",
        "info": "#6C8B5E",
        "infoSoft": "#DCEBDD",
        "navBg": "#163B25",
        "navText": "#F8FAFC",
        "navMuted": "#D6CDB9",
        "navActiveBg": "color-mix(in srgb, #1F5A36 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#FFFDF4",
        "headerBorder": "#D3CBB7",
        "cardBg": "#FFFDF4",
        "cardBorder": "#D3CBB7",
        "inputBg": "#FFFFFF",
        "inputBorder": "#AFA58B",
        "inputFocus": "#1F5A36",
        "tableHeaderBg": "#ECE6D4",
        "tableRowHover": "color-mix(in srgb, #FFFDF4 70%, #DCEBDD)",
        "tableRowSelected": "#DCEBDD",
        "badgeBg": "#ECE6D4",
        "focusRing": "color-mix(in srgb, #1F5A36 28%, transparent)",
        "alertBg": "#F3E5C9",
        "alertBorder": "#A9793C",
        "iconContainerBg": "#DCEBDD",
        "iconContainerBorder": "#D3CBB7",
        "moduleIconBg": "#1F5A36",
        "statusIconBg": "#ECE6D4"
      },
      "dark": {
        "bg": "#0F1A13",
        "bgSubtle": "#263B2B",
        "surface": "#1C2F22",
        "surfaceMuted": "#263B2B",
        "surfaceRaised": "#263B2B",
        "surfaceInset": "#0F1A13",
        "border": "#35513A",
        "borderStrong": "#5E7A5B",
        "text": "#EEF4E7",
        "textMuted": "#B2C2A6",
        "textSoft": "#B2C2A6",
        "accent": "#66A96F",
        "accentHover": "#7FC483",
        "accentSoft": "#203D25",
        "accentText": "#07110D",
        "accentWarm": "#C69A56",
        "success": "#7FC489",
        "successSoft": "#173823",
        "warning": "#C69A56",
        "warningSoft": "#3A2A13",
        "danger": "#D06F5F",
        "dangerSoft": "#3B1D1A",
        "info": "#8EAA78",
        "infoSoft": "#203D25",
        "navBg": "#09150E",
        "navText": "#F4F7FB",
        "navMuted": "#B2C2A6",
        "navActiveBg": "color-mix(in srgb, #66A96F 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#1C2F22",
        "headerBorder": "#35513A",
        "cardBg": "#1C2F22",
        "cardBorder": "#35513A",
        "inputBg": "#0F1A13",
        "inputBorder": "#5E7A5B",
        "inputFocus": "#66A96F",
        "tableHeaderBg": "#263B2B",
        "tableRowHover": "color-mix(in srgb, #1C2F22 70%, #203D25)",
        "tableRowSelected": "#203D25",
        "badgeBg": "#263B2B",
        "focusRing": "color-mix(in srgb, #66A96F 28%, transparent)",
        "alertBg": "#3A2A13",
        "alertBorder": "#C69A56",
        "iconContainerBg": "#203D25",
        "iconContainerBorder": "#35513A",
        "moduleIconBg": "#66A96F",
        "statusIconBg": "#263B2B"
      }
    },
    "radius": {
      "radiusSmall": "10px",
      "radiusMedium": "12px",
      "radiusLarge": "16px",
      "cardRadius": "16px",
      "inputRadius": "12px",
      "buttonRadius": "12px",
      "bannerRadius": "18px",
      "wizardRadius": "18px"
    },
    "motif": {
      "style": "botanical_line",
      "cornerType": "botanical branch corner",
      "illustrationType": "leaf, branch and botanical contour linework",
      "opacity": {
        "light": 0.15,
        "dark": 0.1
      },
      "lineWeight": 1.15,
      "useOnHero": true,
      "useOnFeaturedCards": true,
      "useOnEmptyStates": true,
      "useOnSectionHeaders": true,
      "note": "Tabiat motif dili: leaf, branch and botanical contour linework.",
      "lightBehavior": "Light mode motif daha gorunur ama dusuk opaklikta kalir.",
      "darkBehavior": "Dark mode motif daha ince, kontrollu ve dusuk kontrastlidir."
    },
    "density": "balanced",
    "surfaces": {
      "page": "Tabiat page background uses the theme base and subtle motif tint.",
      "panel": "Token-driven panel with theme border and surface contrast.",
      "card": "Card surfaces use theme radius, border, shadow and corner art.",
      "control": "Controls use theme input radius, focus ring and accent.",
      "subtlePattern": "leaf, branch and botanical contour linework"
    },
    "typography": {
      "headingStyle": "Kurumsal ve okunakli baslik agirligi.",
      "bodyStyle": "Yogun ERP verisi icin rahat okunur govde ritmi.",
      "labelStyle": "Kucuk, net ve taranabilir etiketler.",
      "monoStyle": "Kimlik, tarih ve teknik alanlar icin sade monospace."
    },
    "shadows": {
      "shadowSubtle": "0 1px 2px rgba(15, 23, 42, 0.06)",
      "shadowCard": "0 14px 36px rgba(15, 23, 42, 0.10)",
      "shadowFloating": "0 24px 60px rgba(15, 23, 42, 0.18)",
      "shadowFocus": "0 0 0 3px color-mix(in srgb, #1F5A36 28%, transparent)"
    },
    "iconStyle": {
      "strokeWidth": 1.8,
      "iconContainer": "Tokenized icon container with theme accent tint.",
      "moduleIconBackground": "Module icon background follows --eden-module-icon-bg.",
      "statusIconStyle": "Status icons are supported by text and semantic colors."
    },
    "sampleBadges": [
      {
        "label": "Aktif",
        "background": "#DCEBDD",
        "foreground": "#2F7D46"
      },
      {
        "label": "Bekliyor",
        "background": "#F3E5C9",
        "foreground": "#A9793C"
      },
      {
        "label": "Risk",
        "background": "#F0D8D2",
        "foreground": "#A84638"
      }
    ],
    "designerNote": "Tabiat logosu degistirmeden renk, radius, yuzey, motif ve frame diliyle ayirt edilir."
  },
  {
    "id": "atlas",
    "name": "Atlas",
    "description": "Atlas, retro-futurist Art Deco mimariyi gokyuzu ve okyanus metropolu hissiyle birlestirir.",
    "artDirection": "Premium, sinematik, mimari ve retro-futurist ERP kimligi.",
    "inspiration": "Skyline, deco kemerler, gokyuzu sehri, su alti metropolu, pirinc ve mavi.",
    "personality": [
      "premium",
      "mimari",
      "sinematik",
      "iddiali"
    ],
    "bestFor": [
      "yonetici panelleri",
      "finans",
      "buyuk portfoy ekranlari"
    ],
    "modes": {
      "light": {
        "bg": "#F7F3EB",
        "bgSubtle": "#EAF2FA",
        "surface": "#FFFCF6",
        "surfaceMuted": "#EAF2FA",
        "surfaceRaised": "#FFFCF6",
        "surfaceInset": "#EAF2FA",
        "border": "#D9CFBF",
        "borderStrong": "#B8A77E",
        "text": "#1A2233",
        "textMuted": "#607086",
        "textSoft": "#607086",
        "accent": "#2B5FDE",
        "accentHover": "#1F49B6",
        "accentSoft": "#DCE8FF",
        "accentText": "#FFFFFF",
        "accentWarm": "#C89A44",
        "success": "#34735A",
        "successSoft": "#DCEBDD",
        "warning": "#C89A44",
        "warningSoft": "#F3E5C9",
        "danger": "#A6423A",
        "dangerSoft": "#F0D8D2",
        "info": "#7FB7E8",
        "infoSoft": "#DCE8FF",
        "navBg": "#101A2C",
        "navText": "#F8FAFC",
        "navMuted": "#D6CDB9",
        "navActiveBg": "color-mix(in srgb, #2B5FDE 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#FFFCF6",
        "headerBorder": "#D9CFBF",
        "cardBg": "#FFFCF6",
        "cardBorder": "#D9CFBF",
        "inputBg": "#FFFFFF",
        "inputBorder": "#B8A77E",
        "inputFocus": "#2B5FDE",
        "tableHeaderBg": "#EAF2FA",
        "tableRowHover": "color-mix(in srgb, #FFFCF6 70%, #DCE8FF)",
        "tableRowSelected": "#DCE8FF",
        "badgeBg": "#EAF2FA",
        "focusRing": "color-mix(in srgb, #2B5FDE 28%, transparent)",
        "alertBg": "#F3E5C9",
        "alertBorder": "#C89A44",
        "iconContainerBg": "#DCE8FF",
        "iconContainerBorder": "#D9CFBF",
        "moduleIconBg": "#2B5FDE",
        "statusIconBg": "#EAF2FA"
      },
      "dark": {
        "bg": "#0B1622",
        "bgSubtle": "#193347",
        "surface": "#122131",
        "surfaceMuted": "#193347",
        "surfaceRaised": "#193347",
        "surfaceInset": "#0B1622",
        "border": "#31475B",
        "borderStrong": "#59758D",
        "text": "#F0E8DB",
        "textMuted": "#A9B8C2",
        "textSoft": "#A9B8C2",
        "accent": "#4C8DDA",
        "accentHover": "#68A7F0",
        "accentSoft": "#13324F",
        "accentText": "#07110D",
        "accentWarm": "#C6914A",
        "success": "#6AAE84",
        "successSoft": "#173823",
        "warning": "#C6914A",
        "warningSoft": "#3A2A13",
        "danger": "#D16A5D",
        "dangerSoft": "#3B1D1A",
        "info": "#1F6A73",
        "infoSoft": "#13324F",
        "navBg": "#07101A",
        "navText": "#F4F7FB",
        "navMuted": "#A9B8C2",
        "navActiveBg": "color-mix(in srgb, #4C8DDA 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#122131",
        "headerBorder": "#31475B",
        "cardBg": "#122131",
        "cardBorder": "#31475B",
        "inputBg": "#0B1622",
        "inputBorder": "#59758D",
        "inputFocus": "#4C8DDA",
        "tableHeaderBg": "#193347",
        "tableRowHover": "color-mix(in srgb, #122131 70%, #13324F)",
        "tableRowSelected": "#13324F",
        "badgeBg": "#193347",
        "focusRing": "color-mix(in srgb, #4C8DDA 28%, transparent)",
        "alertBg": "#3A2A13",
        "alertBorder": "#C6914A",
        "iconContainerBg": "#13324F",
        "iconContainerBorder": "#31475B",
        "moduleIconBg": "#4C8DDA",
        "statusIconBg": "#193347"
      }
    },
    "radius": {
      "radiusSmall": "6px",
      "radiusMedium": "8px",
      "radiusLarge": "10px",
      "cardRadius": "10px",
      "inputRadius": "8px",
      "buttonRadius": "8px",
      "bannerRadius": "10px",
      "wizardRadius": "10px"
    },
    "motif": {
      "style": "atlas_deco",
      "cornerType": "deco skyline frame",
      "illustrationType": "skyline, wave lines, light beams and deco arches",
      "opacity": {
        "light": 0.17,
        "dark": 0.11
      },
      "lineWeight": 1.2,
      "useOnHero": true,
      "useOnFeaturedCards": true,
      "useOnEmptyStates": true,
      "useOnSectionHeaders": true,
      "note": "Atlas motif dili: skyline, wave lines, light beams and deco arches.",
      "lightBehavior": "Light mode motif daha gorunur ama dusuk opaklikta kalir.",
      "darkBehavior": "Dark mode motif daha ince, kontrollu ve dusuk kontrastlidir."
    },
    "density": "balanced",
    "surfaces": {
      "page": "Atlas page background uses the theme base and subtle motif tint.",
      "panel": "Token-driven panel with theme border and surface contrast.",
      "card": "Card surfaces use theme radius, border, shadow and corner art.",
      "control": "Controls use theme input radius, focus ring and accent.",
      "subtlePattern": "skyline, wave lines, light beams and deco arches"
    },
    "typography": {
      "headingStyle": "Kurumsal ve okunakli baslik agirligi.",
      "bodyStyle": "Yogun ERP verisi icin rahat okunur govde ritmi.",
      "labelStyle": "Kucuk, net ve taranabilir etiketler.",
      "monoStyle": "Kimlik, tarih ve teknik alanlar icin sade monospace."
    },
    "shadows": {
      "shadowSubtle": "0 1px 2px rgba(15, 23, 42, 0.06)",
      "shadowCard": "0 14px 36px rgba(15, 23, 42, 0.10)",
      "shadowFloating": "0 24px 60px rgba(15, 23, 42, 0.18)",
      "shadowFocus": "0 0 0 3px color-mix(in srgb, #2B5FDE 28%, transparent)"
    },
    "iconStyle": {
      "strokeWidth": 1.8,
      "iconContainer": "Tokenized icon container with theme accent tint.",
      "moduleIconBackground": "Module icon background follows --eden-module-icon-bg.",
      "statusIconStyle": "Status icons are supported by text and semantic colors."
    },
    "sampleBadges": [
      {
        "label": "Aktif",
        "background": "#DCEBDD",
        "foreground": "#34735A"
      },
      {
        "label": "Bekliyor",
        "background": "#F3E5C9",
        "foreground": "#C89A44"
      },
      {
        "label": "Risk",
        "background": "#F0D8D2",
        "foreground": "#A6423A"
      }
    ],
    "designerNote": "Atlas logosu degistirmeden renk, radius, yuzey, motif ve frame diliyle ayirt edilir."
  },
  {
    "id": "avangard",
    "name": "Avangard",
    "description": "Avangard, kontrollu kontrast, parcali grid ve deneysel grafik aksanlarla farkli ama islevsel kalir.",
    "artDirection": "Post-modern, entelektuel, parcali grid ve kontrollu kontrast dili.",
    "inspiration": "Asimetrik bloklar, kirik grid, mor, cyan, coral ve acid green aksanlar.",
    "personality": [
      "deneysel",
      "entelektuel",
      "grafik",
      "keskin"
    ],
    "bestFor": [
      "yaratici ekipler",
      "urun ve proje ekranlari",
      "deneysel dashboardlar"
    ],
    "modes": {
      "light": {
        "bg": "#F7F8FB",
        "bgSubtle": "#EEF1F6",
        "surface": "#FFFFFF",
        "surfaceMuted": "#EEF1F6",
        "surfaceRaised": "#FFFFFF",
        "surfaceInset": "#EEF1F6",
        "border": "#DDE3EE",
        "borderStrong": "#B7C0D2",
        "text": "#10131A",
        "textMuted": "#647084",
        "textSoft": "#647084",
        "accent": "#6D4AFF",
        "accentHover": "#5636E8",
        "accentSoft": "#E8E2FF",
        "accentText": "#FFFFFF",
        "accentWarm": "#FF6B6B",
        "success": "#0E8C61",
        "successSoft": "#DCEBDD",
        "warning": "#FF6B6B",
        "warningSoft": "#F3E5C9",
        "danger": "#D9304F",
        "dangerSoft": "#F0D8D2",
        "info": "#00A3D7",
        "infoSoft": "#E8E2FF",
        "navBg": "#111827",
        "navText": "#F8FAFC",
        "navMuted": "#D6CDB9",
        "navActiveBg": "color-mix(in srgb, #6D4AFF 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#FFFFFF",
        "headerBorder": "#DDE3EE",
        "cardBg": "#FFFFFF",
        "cardBorder": "#DDE3EE",
        "inputBg": "#FFFFFF",
        "inputBorder": "#B7C0D2",
        "inputFocus": "#6D4AFF",
        "tableHeaderBg": "#EEF1F6",
        "tableRowHover": "color-mix(in srgb, #FFFFFF 70%, #E8E2FF)",
        "tableRowSelected": "#E8E2FF",
        "badgeBg": "#EEF1F6",
        "focusRing": "color-mix(in srgb, #6D4AFF 28%, transparent)",
        "alertBg": "#F3E5C9",
        "alertBorder": "#FF6B6B",
        "iconContainerBg": "#E8E2FF",
        "iconContainerBorder": "#DDE3EE",
        "moduleIconBg": "#6D4AFF",
        "statusIconBg": "#EEF1F6"
      },
      "dark": {
        "bg": "#070A10",
        "bgSubtle": "#182232",
        "surface": "#101722",
        "surfaceMuted": "#182232",
        "surfaceRaised": "#182232",
        "surfaceInset": "#070A10",
        "border": "#2B3547",
        "borderStrong": "#4B5870",
        "text": "#F4F7FB",
        "textMuted": "#9BA8BA",
        "textSoft": "#9BA8BA",
        "accent": "#7C5CFF",
        "accentHover": "#9A82FF",
        "accentSoft": "#241A56",
        "accentText": "#07110D",
        "accentWarm": "#FF6B6B",
        "success": "#72D985",
        "successSoft": "#173823",
        "warning": "#FF6B6B",
        "warningSoft": "#3A2A13",
        "danger": "#FF6B7E",
        "dangerSoft": "#3B1D1A",
        "info": "#46D9FF",
        "infoSoft": "#241A56",
        "navBg": "#05070B",
        "navText": "#F4F7FB",
        "navMuted": "#9BA8BA",
        "navActiveBg": "color-mix(in srgb, #7C5CFF 28%, transparent)",
        "navActiveText": "#FFFFFF",
        "navHoverBg": "rgba(255, 255, 255, 0.08)",
        "headerBg": "#101722",
        "headerBorder": "#2B3547",
        "cardBg": "#101722",
        "cardBorder": "#2B3547",
        "inputBg": "#070A10",
        "inputBorder": "#4B5870",
        "inputFocus": "#7C5CFF",
        "tableHeaderBg": "#182232",
        "tableRowHover": "color-mix(in srgb, #101722 70%, #241A56)",
        "tableRowSelected": "#241A56",
        "badgeBg": "#182232",
        "focusRing": "color-mix(in srgb, #7C5CFF 28%, transparent)",
        "alertBg": "#3A2A13",
        "alertBorder": "#FF6B6B",
        "iconContainerBg": "#241A56",
        "iconContainerBorder": "#2B3547",
        "moduleIconBg": "#7C5CFF",
        "statusIconBg": "#182232"
      }
    },
    "radius": {
      "radiusSmall": "4px",
      "radiusMedium": "6px",
      "radiusLarge": "8px",
      "cardRadius": "6px",
      "inputRadius": "6px",
      "buttonRadius": "6px",
      "bannerRadius": "8px",
      "wizardRadius": "8px"
    },
    "motif": {
      "style": "avant_grid",
      "cornerType": "broken asymmetric grid",
      "illustrationType": "fragmented grid, diagonal blocks and restrained graphic accents",
      "opacity": {
        "light": 0.16,
        "dark": 0.11
      },
      "lineWeight": 1.35,
      "useOnHero": true,
      "useOnFeaturedCards": true,
      "useOnEmptyStates": true,
      "useOnSectionHeaders": true,
      "note": "Avangard motif dili: fragmented grid, diagonal blocks and restrained graphic accents.",
      "lightBehavior": "Light mode motif daha gorunur ama dusuk opaklikta kalir.",
      "darkBehavior": "Dark mode motif daha ince, kontrollu ve dusuk kontrastlidir."
    },
    "density": "compact",
    "surfaces": {
      "page": "Avangard page background uses the theme base and subtle motif tint.",
      "panel": "Token-driven panel with theme border and surface contrast.",
      "card": "Card surfaces use theme radius, border, shadow and corner art.",
      "control": "Controls use theme input radius, focus ring and accent.",
      "subtlePattern": "fragmented grid, diagonal blocks and restrained graphic accents"
    },
    "typography": {
      "headingStyle": "Kurumsal ve okunakli baslik agirligi.",
      "bodyStyle": "Yogun ERP verisi icin rahat okunur govde ritmi.",
      "labelStyle": "Kucuk, net ve taranabilir etiketler.",
      "monoStyle": "Kimlik, tarih ve teknik alanlar icin sade monospace."
    },
    "shadows": {
      "shadowSubtle": "0 1px 2px rgba(15, 23, 42, 0.06)",
      "shadowCard": "0 14px 36px rgba(15, 23, 42, 0.10)",
      "shadowFloating": "0 24px 60px rgba(15, 23, 42, 0.18)",
      "shadowFocus": "0 0 0 3px color-mix(in srgb, #6D4AFF 28%, transparent)"
    },
    "iconStyle": {
      "strokeWidth": 1.8,
      "iconContainer": "Tokenized icon container with theme accent tint.",
      "moduleIconBackground": "Module icon background follows --eden-module-icon-bg.",
      "statusIconStyle": "Status icons are supported by text and semantic colors."
    },
    "sampleBadges": [
      {
        "label": "Aktif",
        "background": "#DCEBDD",
        "foreground": "#0E8C61"
      },
      {
        "label": "Bekliyor",
        "background": "#F3E5C9",
        "foreground": "#FF6B6B"
      },
      {
        "label": "Risk",
        "background": "#F0D8D2",
        "foreground": "#D9304F"
      }
    ],
    "designerNote": "Avangard logosu degistirmeden renk, radius, yuzey, motif ve frame diliyle ayirt edilir."
  }
]

export const themeConcepts: ThemeConcept[] = rawThemes.map(makeTheme)

export function isThemeConceptId(value: unknown): value is ThemeConceptId {
  return typeof value === 'string' && themeConcepts.some(theme => theme.id === value)
}

export function normalizeThemeConceptId(value: unknown): ThemeConceptId | null {
  if (isThemeConceptId(value)) return value
  if (typeof value === 'string' && value in LEGACY_THEME_ID_MAP) {
    return LEGACY_THEME_ID_MAP[value as LegacyThemeConceptId]
  }
  return null
}

export function findThemeConcept(id: ThemeConceptId | string | null | undefined) {
  const normalized = normalizeThemeConceptId(id) || DEFAULT_VISUAL_THEME_ID
  return themeConcepts.find(theme => theme.id === normalized) || themeConcepts[0]
}

export function getThemeCssVars(
  theme: ThemeConcept,
  appearance: ThemeAppearanceMode = 'light'
): Record<`--${string}`, string> {
  const mode = theme.modes[appearance]
  return {
    '--dl-background': mode.bg,
    '--dl-foreground': mode.text,
    '--dl-surface-base': mode.surface,
    '--dl-surface-raised': mode.surfaceRaised,
    '--dl-surface-muted': mode.surfaceMuted,
    '--dl-border-subtle': mode.border,
    '--dl-border-strong': mode.borderStrong,
    '--dl-text-primary': mode.text,
    '--dl-text-secondary': mode.textMuted,
    '--dl-text-muted': mode.textSoft,
    '--dl-accent-primary': mode.accent,
    '--dl-accent-secondary': mode.info,
    '--dl-accent-warm': mode.accentWarm,
    '--dl-success': mode.success,
    '--dl-warning': mode.warning,
    '--dl-danger': mode.danger,
    '--dl-info': mode.info,
    '--dl-radius-small': theme.radius.radiusSmall,
    '--dl-radius-medium': theme.radius.radiusMedium,
    '--dl-radius-large': theme.radius.radiusLarge,
    '--dl-card-radius': theme.radius.cardRadius,
    '--dl-input-radius': theme.radius.inputRadius,
    '--dl-shadow-subtle': theme.shadows.shadowSubtle,
    '--dl-shadow-card': theme.shadows.shadowCard,
    '--dl-shadow-floating': theme.shadows.shadowFloating,
    '--dl-shadow-focus': theme.shadows.shadowFocus,
    '--dl-density-row': rowHeight(theme.density),
    '--dl-density-gap': sectionGap(theme.density),
    '--dl-motif-opacity': String(theme.motif.opacity[appearance]),
    '--dl-motif-line-width': `${theme.motif.lineWeight}px`,
    '--dl-motif-corner-size': motifSize(theme),
  }
}

export function getEdenThemeCssVars(theme: ThemeConcept, appearance: ThemeAppearanceMode): Record<`--${string}`, string> {
  const mode = theme.modes[appearance]
  const borderAccentMix = `color-mix(in srgb, ${mode.accent} 34%, ${mode.cardBorder})`
  return {
    '--eden-blue': mode.accent,
    '--eden-blue-dk': mode.accentHover,
    '--eden-blue-lt': mode.accentSoft,
    '--eden-green': mode.success,
    '--eden-green-lt': mode.successSoft,
    '--eden-gold': mode.warning,
    '--eden-gold-dk': mode.accentWarm,
    '--eden-gold-lt': mode.warningSoft,
    '--eden-red': mode.danger,
    '--eden-red-lt': mode.dangerSoft,
    '--eden-navy': mode.navBg,
    '--eden-navy-2': mode.surface,
    '--eden-bg': mode.bg,
    '--eden-bg-subtle': mode.bgSubtle,
    '--eden-surface': mode.surface,
    '--eden-surface-muted': mode.surfaceMuted,
    '--eden-surface-raised': mode.surfaceRaised,
    '--eden-surface-inset': mode.surfaceInset,
    '--eden-border': mode.border,
    '--eden-border-strong': mode.borderStrong,
    '--eden-text': mode.text,
    '--eden-text-muted': mode.textMuted,
    '--eden-text-soft': mode.textSoft,
    '--eden-accent': mode.accent,
    '--eden-accent-hover': mode.accentHover,
    '--eden-accent-soft': mode.accentSoft,
    '--eden-accent-text': mode.accentText,
    '--eden-accent-warm': mode.accentWarm,
    '--eden-accent-secondary': mode.info,
    '--eden-success': mode.success,
    '--eden-success-soft': mode.successSoft,
    '--eden-warning': mode.warning,
    '--eden-warning-soft': mode.warningSoft,
    '--eden-danger': mode.danger,
    '--eden-danger-soft': mode.dangerSoft,
    '--eden-info': mode.info,
    '--eden-info-soft': mode.infoSoft,
    '--eden-nav-bg': mode.navBg,
    '--eden-nav-text': mode.navText,
    '--eden-nav-muted': mode.navMuted,
    '--eden-nav-active-bg': mode.navActiveBg,
    '--eden-nav-active-text': mode.navActiveText,
    '--eden-nav-hover-bg': mode.navHoverBg,
    '--eden-header-bg': mode.headerBg,
    '--eden-header-border': mode.headerBorder,
    '--eden-page-banner-bg': bannerBackground(theme.id, mode, appearance),
    '--eden-page-banner-text': mode.accentText,
    '--eden-page-banner-muted': `color-mix(in srgb, ${mode.accentText} 78%, transparent)`,
    '--eden-page-banner-accent': mode.accentWarm,
    '--eden-page-banner-border': borderAccentMix,
    '--eden-page-banner-shadow': theme.shadows.shadowCard,
    '--eden-page-banner-icon-bg': `color-mix(in srgb, ${mode.accentText} 16%, transparent)`,
    '--eden-page-banner-action-bg': `color-mix(in srgb, ${mode.accentText} 14%, transparent)`,
    '--eden-page-banner-action-hover': `color-mix(in srgb, ${mode.accentText} 24%, transparent)`,
    '--eden-card-bg': mode.cardBg,
    '--eden-card-border': mode.cardBorder,
    '--eden-card-shadow': theme.shadows.shadowCard,
    '--eden-card-hover-bg': `color-mix(in srgb, ${mode.cardBg} 82%, ${mode.accentSoft})`,
    '--eden-input-bg': mode.inputBg,
    '--eden-input-border': mode.inputBorder,
    '--eden-input-focus': mode.inputFocus,
    '--eden-input-placeholder': mode.textSoft,
    '--eden-input-disabled-bg': mode.surfaceMuted,
    '--eden-table-header-bg': mode.tableHeaderBg,
    '--eden-table-header-text': mode.textMuted,
    '--eden-table-border': mode.border,
    '--eden-table-row-hover': mode.tableRowHover,
    '--eden-table-row-selected': mode.tableRowSelected,
    '--eden-smart-list-bg': `color-mix(in srgb, ${mode.cardBg} 88%, ${mode.accentSoft})`,
    '--eden-smart-list-border': borderAccentMix,
    '--eden-smart-list-hover': `color-mix(in srgb, ${mode.cardBg} 62%, ${mode.accentSoft})`,
    '--eden-smart-toolbar-bg': `color-mix(in srgb, ${mode.cardBg} 70%, ${mode.accentSoft})`,
    '--eden-smart-toolbar-border': borderAccentMix,
    '--eden-smart-table-bg': `color-mix(in srgb, ${mode.cardBg} 92%, ${mode.accentSoft})`,
    '--eden-smart-table-header-bg': `color-mix(in srgb, ${mode.tableHeaderBg} 74%, ${mode.accentSoft})`,
    '--eden-smart-table-border': borderAccentMix,
    '--eden-smart-row-bg': `color-mix(in srgb, ${mode.cardBg} 86%, ${mode.accentSoft})`,
    '--eden-smart-row-alt-bg': `color-mix(in srgb, ${mode.cardBg} 94%, ${mode.accentSoft})`,
    '--eden-smart-row-hover': `color-mix(in srgb, ${mode.cardBg} 62%, ${mode.accentSoft})`,
    '--eden-smart-control-bg': mode.surfaceMuted,
    '--eden-smart-control-active-bg': mode.accentSoft,
    '--eden-smart-control-active-text': mode.accent,
    '--eden-smart-count-bg': mode.accent,
    '--eden-smart-count-text': mode.accentText,
    '--eden-badge-bg': mode.badgeBg,
    '--eden-badge-neutral-bg': mode.badgeBg,
    '--eden-badge-neutral-text': mode.textMuted,
    '--eden-badge-success-bg': mode.successSoft,
    '--eden-badge-success-text': mode.success,
    '--eden-badge-warning-bg': mode.warningSoft,
    '--eden-badge-warning-text': mode.warning,
    '--eden-badge-danger-bg': mode.dangerSoft,
    '--eden-badge-danger-text': mode.danger,
    '--eden-badge-info-bg': mode.infoSoft,
    '--eden-badge-info-text': mode.info,
    '--eden-wizard-bg': mode.bg,
    '--eden-wizard-panel-bg': mode.cardBg,
    '--eden-wizard-panel-border': mode.cardBorder,
    '--eden-wizard-step-bg': mode.surfaceMuted,
    '--eden-wizard-step-active-bg': mode.accent,
    '--eden-wizard-step-active-text': mode.accentText,
    '--eden-wizard-step-complete-bg': mode.successSoft,
    '--eden-wizard-step-line': mode.border,
    '--eden-wizard-summary-bg': `color-mix(in srgb, ${mode.cardBg} 74%, ${mode.accentSoft})`,
    '--eden-wizard-sidebar-bg': `color-mix(in srgb, ${mode.cardBg} 70%, ${mode.accentSoft})`,
    '--eden-wizard-sidebar-border': borderAccentMix,
    '--eden-focus-ring': mode.focusRing,
    '--eden-hover-overlay': `color-mix(in srgb, ${mode.accentSoft} 52%, transparent)`,
    '--eden-selected-overlay': `color-mix(in srgb, ${mode.accentSoft} 72%, ${mode.cardBg})`,
    '--eden-alert-bg': mode.alertBg,
    '--eden-alert-border': mode.alertBorder,
    '--eden-radius-sm': theme.radius.radiusSmall,
    '--eden-radius-md': theme.radius.radiusMedium,
    '--eden-radius-lg': theme.radius.radiusLarge,
    '--eden-radius-card': theme.radius.cardRadius,
    '--eden-radius-button': theme.radius.buttonRadius,
    '--eden-radius-input': theme.radius.inputRadius,
    '--eden-radius-banner': theme.radius.bannerRadius,
    '--eden-radius-wizard': theme.radius.wizardRadius,
    '--eden-shadow-subtle': theme.shadows.shadowSubtle,
    '--eden-shadow-card': theme.shadows.shadowCard,
    '--eden-shadow-floating': theme.shadows.shadowFloating,
    '--eden-shadow-focus': theme.shadows.shadowFocus,
    '--eden-shadow-banner': theme.shadows.shadowCard,
    '--eden-table-row-height': rowHeight(theme.density),
    '--eden-form-field-height': fieldHeight(theme.density),
    '--eden-card-padding': cardPadding(theme.density),
    '--eden-section-gap': sectionGap(theme.density),
    '--eden-icon-stroke': String(theme.iconStyle.strokeWidth),
    '--eden-icon-container-bg': mode.iconContainerBg,
    '--eden-icon-container-border': mode.iconContainerBorder,
    '--eden-module-icon-bg': mode.moduleIconBg,
    '--eden-status-icon-bg': mode.statusIconBg,
    '--eden-motif-primary': mode.accent,
    '--eden-motif-secondary': mode.info,
    '--eden-motif-warm': mode.accentWarm,
    '--eden-motif-opacity': String(theme.motif.opacity[appearance]),
    '--eden-motif-line': `${theme.motif.lineWeight}px`,
    '--eden-motif-line-width': `${theme.motif.lineWeight}px`,
    '--eden-motif-corner-size': motifSize(theme),
    '--eden-corner-art-bg': `color-mix(in srgb, ${mode.accentSoft} 72%, ${mode.cardBg})`,
    '--eden-corner-art-border': borderAccentMix,
  }
}

function bannerBackground(themeId: ThemeConceptId, mode: ThemeModeVisualTokens, appearance: ThemeAppearanceMode) {
  if (themeId === 'hikmet') return `linear-gradient(135deg, ${mode.accentHover} 0%, ${mode.accent} 58%, ${mode.accentWarm} 100%)`
  if (themeId === 'bozkir') return `radial-gradient(circle at 88% 20%, color-mix(in srgb, ${mode.accentWarm} 58%, transparent) 0 62px, transparent 63px), linear-gradient(135deg, ${mode.navBg} 0%, ${mode.accent} 54%, ${mode.accentWarm} 100%)`
  if (themeId === 'esitlik') return `radial-gradient(circle at 86% 20%, color-mix(in srgb, ${mode.accentWarm} 38%, transparent) 0 70px, transparent 71px), linear-gradient(135deg, ${mode.accentHover} 0%, ${mode.accent} 56%, ${mode.accentWarm} 100%)`
  if (themeId === 'tabiat') return `radial-gradient(ellipse at 90% 18%, color-mix(in srgb, ${mode.success} 32%, transparent) 0 92px, transparent 93px), linear-gradient(135deg, ${mode.navBg} 0%, ${mode.accent} 58%, ${mode.accentWarm} 100%)`
  if (themeId === 'atlas') return appearance === 'dark'
    ? `linear-gradient(135deg, ${mode.navBg} 0%, ${mode.surfaceMuted} 52%, ${mode.accentWarm} 100%)`
    : `linear-gradient(135deg, ${mode.accentHover} 0%, ${mode.accent} 54%, ${mode.accentWarm} 100%)`
  return `linear-gradient(135deg, ${mode.navBg} 0%, ${mode.accent} 48%, ${mode.accentWarm} 100%)`
}

function motifSize(theme: ThemeConcept) {
  if (theme.motif.style === 'medrese_geometry') return '148px'
  if (theme.motif.style === 'atlas_deco') return '168px'
  if (theme.motif.style === 'avant_grid') return '132px'
  return '140px'
}

function rowHeight(density: ThemeDensity) {
  if (density === 'compact') return '42px'
  if (density === 'comfortable') return '58px'
  return '50px'
}

function fieldHeight(density: ThemeDensity) {
  if (density === 'compact') return '36px'
  if (density === 'comfortable') return '44px'
  return '40px'
}

function cardPadding(density: ThemeDensity) {
  if (density === 'compact') return '14px'
  if (density === 'comfortable') return '22px'
  return '18px'
}

function sectionGap(density: ThemeDensity) {
  if (density === 'compact') return '12px'
  if (density === 'comfortable') return '22px'
  return '16px'
}
