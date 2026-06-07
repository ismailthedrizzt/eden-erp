export type ThemeConceptId = 'classic' | 'art_deco' | 'anatolian_60s' | 'command_bauhaus' | 'pop_studio'
export type LegacyThemeConceptId =
  | 'classicCurrent'
  | 'executivePremium'
  | 'anatolianModern'
  | 'technicalCommand'
  | 'executive_premium'
  | 'anatolian_modern'
  | 'technical_command'
export type ThemeDensity = 'compact' | 'balanced' | 'comfortable'
export type ThemeAppearanceMode = 'light' | 'dark'
export type ThemeMotifStyle =
  | 'minimal_grid'
  | 'art_deco_geometry'
  | 'retro_sun'
  | 'botanical_line'
  | 'pop_blocks'

export const DEFAULT_VISUAL_THEME_ID: ThemeConceptId = 'classic'
export const DEFAULT_DESIGN_LAB_THEME_ID: ThemeConceptId = DEFAULT_VISUAL_THEME_ID
export const VISUAL_THEME_CHANGE_EVENT = 'eden:visual-theme-change'
export const VISUAL_THEME_STORAGE_KEY = 'eden.visualTheme'
export const LEGACY_DESIGN_LAB_THEME_STORAGE_KEY = 'eden.designLab.activeTheme'
export const DESIGN_LAB_THEME_CHANGE_EVENT = VISUAL_THEME_CHANGE_EVENT
export const DESIGN_LAB_THEME_STORAGE_KEY = VISUAL_THEME_STORAGE_KEY

export const VISUAL_THEME_LABELS: Record<ThemeConceptId, string> = {
  classic: 'Klasik',
  art_deco: 'Art Deco Premium',
  anatolian_60s: 'Anadolu Modern',
  command_bauhaus: 'Yeşil Atölye',
  pop_studio: 'Pop Studio',
}

const LEGACY_THEME_ID_MAP: Record<LegacyThemeConceptId, ThemeConceptId> = {
  classicCurrent: 'classic',
  executivePremium: 'art_deco',
  anatolianModern: 'anatolian_60s',
  technicalCommand: 'command_bauhaus',
  executive_premium: 'art_deco',
  anatolian_modern: 'anatolian_60s',
  technical_command: 'command_bauhaus',
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

export const themeConcepts: ThemeConcept[] = [
  makeTheme({
    id: 'classic',
    name: VISUAL_THEME_LABELS.classic,
    description: 'Safe neutral ERP baseline with calm SaaS surfaces and low-risk readability.',
    artDirection: 'Neutral modern enterprise baseline.',
    inspiration: 'Timeless SaaS systems, quiet operational software, dense data readability.',
    personality: ['clean', 'neutral', 'safe', 'baseline'],
    bestFor: ['default release', 'low-risk rollout', 'comparison baseline'],
    modes: {
      light: {
        bg: '#F8FAFC',
        bgSubtle: '#F1F5F9',
        surface: '#FFFFFF',
        surfaceMuted: '#F1F5F9',
        surfaceRaised: '#FFFFFF',
        surfaceInset: '#EAF0F6',
        border: '#E2E8F0',
        borderStrong: '#CBD5E1',
        text: '#0F172A',
        textMuted: '#475569',
        textSoft: '#64748B',
        accent: '#2563EB',
        accentHover: '#1D4ED8',
        accentSoft: '#DBEAFE',
        accentText: '#FFFFFF',
        accentWarm: '#C98A04',
        success: '#15803D',
        successSoft: '#DCFCE7',
        warning: '#B7791F',
        warningSoft: '#FEF3C7',
        danger: '#B91C1C',
        dangerSoft: '#FEE2E2',
        info: '#2563EB',
        infoSoft: '#DBEAFE',
        navBg: '#0F2233',
        navText: '#F8FAFC',
        navMuted: '#B9C6D3',
        navActiveBg: 'rgba(37, 99, 235, 0.30)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(255, 255, 255, 0.08)',
        headerBg: '#FFFFFF',
        headerBorder: '#E2E8F0',
        cardBg: '#FFFFFF',
        cardBorder: '#E2E8F0',
        inputBg: '#FFFFFF',
        inputBorder: '#CBD5E1',
        inputFocus: '#2563EB',
        tableHeaderBg: '#F1F5F9',
        tableRowHover: '#EFF6FF',
        tableRowSelected: '#DBEAFE',
        badgeBg: '#F1F5F9',
        focusRing: 'rgba(37, 99, 235, 0.22)',
        alertBg: '#FEF3C7',
        alertBorder: '#F59E0B',
        iconContainerBg: '#EFF6FF',
        iconContainerBorder: '#BFDBFE',
        moduleIconBg: '#DBEAFE',
        statusIconBg: '#E2E8F0',
      },
      dark: {
        bg: '#0F172A',
        bgSubtle: '#111827',
        surface: '#111827',
        surfaceMuted: '#1E293B',
        surfaceRaised: '#162033',
        surfaceInset: '#0B1220',
        border: '#334155',
        borderStrong: '#475569',
        text: '#E5E7EB',
        textMuted: '#CBD5E1',
        textSoft: '#94A3B8',
        accent: '#60A5FA',
        accentHover: '#93C5FD',
        accentSoft: '#1E3A8A',
        accentText: '#07111F',
        accentWarm: '#FBBF24',
        success: '#4ADE80',
        successSoft: '#143822',
        warning: '#FBBF24',
        warningSoft: '#3A2D12',
        danger: '#F87171',
        dangerSoft: '#3B1D22',
        info: '#60A5FA',
        infoSoft: '#172B4D',
        navBg: '#07111F',
        navText: '#EAF6FF',
        navMuted: '#8FA8BA',
        navActiveBg: 'rgba(96, 165, 250, 0.18)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(255, 255, 255, 0.07)',
        headerBg: '#111827',
        headerBorder: '#334155',
        cardBg: '#111827',
        cardBorder: '#334155',
        inputBg: '#0B1220',
        inputBorder: '#334155',
        inputFocus: '#60A5FA',
        tableHeaderBg: '#1E293B',
        tableRowHover: '#172033',
        tableRowSelected: '#1E3A8A',
        badgeBg: '#1E293B',
        focusRing: 'rgba(96, 165, 250, 0.26)',
        alertBg: '#3A2D12',
        alertBorder: '#FBBF24',
        iconContainerBg: '#172B4D',
        iconContainerBorder: '#2C5282',
        moduleIconBg: '#1E3A8A',
        statusIconBg: '#1E293B',
      },
    },
    surfaces: {
      page: 'Neutral light gray page with white work surfaces.',
      panel: 'Clean panel, low-risk border and shadow.',
      card: 'Readable ERP card with minimal visual noise.',
      control: 'Familiar rounded input and button rhythm.',
      subtlePattern: 'No decoration; baseline comparison surface.',
    },
    typography: {
      headingStyle: 'Balanced enterprise heading weight.',
      bodyStyle: 'Readable dense-data body rhythm.',
      labelStyle: 'Small semibold neutral labels.',
      monoStyle: 'Plain monospace for ids, dates and masked values.',
    },
    radius: {
      radiusSmall: '6px',
      radiusMedium: '8px',
      radiusLarge: '10px',
      cardRadius: '10px',
      inputRadius: '8px',
    },
    shadows: {
      shadowSubtle: '0 1px 2px rgba(15, 23, 42, 0.06)',
      shadowCard: '0 8px 24px rgba(15, 23, 42, 0.07)',
      shadowFloating: '0 20px 48px rgba(15, 23, 42, 0.16)',
      shadowFocus: '0 0 0 3px rgba(37, 99, 235, 0.22)',
    },
    iconStyle: {
      strokeWidth: 1.8,
      iconContainer: 'Soft blue-tinted icon containers.',
      moduleIconBackground: 'Quiet blue module tile.',
      statusIconStyle: 'Status color plus text label.',
    },
    motif: {
      style: 'minimal_grid',
      cornerType: 'hairline corner ticks',
      illustrationType: 'near-invisible grid frame',
      opacity: { light: 0.16, dark: 0.12 },
      lineWeight: 1,
      useOnHero: true,
      useOnFeaturedCards: false,
      useOnEmptyStates: false,
      useOnSectionHeaders: true,
      note: 'Classic keeps decoration almost invisible: fine corner ticks and a quiet grid frame only.',
      lightBehavior: 'Soft gray-blue hairlines may appear on hero and section headers.',
      darkBehavior: 'Very low-contrast linework only; no illustrative motif.',
    },
    density: 'balanced',
    sampleBadges: [
      { label: 'Aktif', background: '#DCFCE7', foreground: '#166534' },
      { label: 'Bekliyor', background: '#FEF3C7', foreground: '#854D0E' },
      { label: 'Risk', background: '#FEE2E2', foreground: '#991B1B' },
    ],
    designerNote: 'Classic remains the safe baseline. It should feel calm, predictable and low risk, with only near-invisible frame details.',
  }),
  makeTheme({
    id: 'art_deco',
    name: VISUAL_THEME_LABELS.art_deco,
    description: 'Premium executive ERP identity with Art Deco symmetry, graphite text and controlled gold accents.',
    artDirection: 'Art Deco Premium.',
    inspiration: 'Art Deco geometry, architectural symmetry, executive finance screens and controlled luxury.',
    personality: ['premium', 'executive', 'geometric', 'refined'],
    bestFor: ['executive dashboards', 'finance', 'holding management'],
    modes: {
      light: {
        bg: '#F6F1E8',
        bgSubtle: '#EFE7D8',
        surface: '#FFFCF5',
        surfaceMuted: '#F1E8D7',
        surfaceRaised: '#FFFFFF',
        surfaceInset: '#E8DDCB',
        border: '#D9CFBB',
        borderStrong: '#BDAF92',
        text: '#172033',
        textMuted: '#5F6470',
        textSoft: '#7B7280',
        accent: '#1D3557',
        accentHover: '#14243B',
        accentSoft: '#DDE7F2',
        accentText: '#FFFFFF',
        accentWarm: '#B88746',
        success: '#34735A',
        successSoft: '#DDECE4',
        warning: '#B88746',
        warningSoft: '#F3E5C9',
        danger: '#A6423A',
        dangerSoft: '#F0D8D2',
        info: '#2F5F88',
        infoSoft: '#DDE7F2',
        navBg: '#101A2C',
        navText: '#F7EFE1',
        navMuted: '#C8BCA8',
        navActiveBg: 'rgba(184, 135, 70, 0.24)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(255, 252, 245, 0.08)',
        headerBg: '#FFFCF5',
        headerBorder: '#D9CFBB',
        cardBg: '#FFFCF5',
        cardBorder: '#D9CFBB',
        inputBg: '#FFFFFF',
        inputBorder: '#BDAF92',
        inputFocus: '#B88746',
        tableHeaderBg: '#F1E8D7',
        tableRowHover: '#F7EDDC',
        tableRowSelected: '#DDE7F2',
        badgeBg: '#F1E8D7',
        focusRing: 'rgba(184, 135, 70, 0.24)',
        alertBg: '#F3E5C9',
        alertBorder: '#B88746',
        iconContainerBg: '#F3E5C9',
        iconContainerBorder: '#D2B175',
        moduleIconBg: '#1D3557',
        statusIconBg: '#EFE7D8',
      },
      dark: {
        bg: '#0B1020',
        bgSubtle: '#111827',
        surface: '#151C2C',
        surfaceMuted: '#1E293B',
        surfaceRaised: '#202A3D',
        surfaceInset: '#0A0F1D',
        border: '#34415A',
        borderStrong: '#5C6A86',
        text: '#F4EFE6',
        textMuted: '#CFC2AD',
        textSoft: '#AFA38F',
        accent: '#D6A85C',
        accentHover: '#E8BE75',
        accentSoft: '#3A2D18',
        accentText: '#10131D',
        accentWarm: '#C7964A',
        success: '#5AA87D',
        successSoft: '#173629',
        warning: '#D6A85C',
        warningSoft: '#3A2D18',
        danger: '#D16A5D',
        dangerSoft: '#3E1F1E',
        info: '#7CA7D9',
        infoSoft: '#172B45',
        navBg: '#080D19',
        navText: '#F4EFE6',
        navMuted: '#B7AC9A',
        navActiveBg: 'rgba(214, 168, 92, 0.20)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(244, 239, 230, 0.07)',
        headerBg: '#151C2C',
        headerBorder: '#34415A',
        cardBg: '#151C2C',
        cardBorder: '#34415A',
        inputBg: '#0F1626',
        inputBorder: '#34415A',
        inputFocus: '#D6A85C',
        tableHeaderBg: '#1E293B',
        tableRowHover: '#202A3D',
        tableRowSelected: '#3A2D18',
        badgeBg: '#1E293B',
        focusRing: 'rgba(214, 168, 92, 0.25)',
        alertBg: '#3A2D18',
        alertBorder: '#D6A85C',
        iconContainerBg: '#3A2D18',
        iconContainerBorder: '#6E532A',
        moduleIconBg: '#D6A85C',
        statusIconBg: '#202A3D',
      },
    },
    surfaces: {
      page: 'Warm ivory page, graphite structure and premium navy accents.',
      panel: 'Architectural card stacking with warm borders.',
      card: 'Refined, controlled shadow and gold micro accents.',
      control: 'Precise input language with executive-grade focus state.',
      subtlePattern: 'Symmetry and geometry through border, radius and surface rhythm.',
    },
    typography: {
      headingStyle: 'Composed executive heading, never decorative.',
      bodyStyle: 'Readable finance-grade text hierarchy.',
      labelStyle: 'Small refined labels with measured weight.',
      monoStyle: 'Graphite/gold technical metadata rhythm.',
    },
    radius: {
      radiusSmall: '8px',
      radiusMedium: '12px',
      radiusLarge: '14px',
      cardRadius: '16px',
      inputRadius: '12px',
    },
    shadows: {
      shadowSubtle: '0 1px 2px rgba(23, 32, 51, 0.08)',
      shadowCard: '0 18px 44px rgba(29, 53, 87, 0.13)',
      shadowFloating: '0 28px 70px rgba(8, 13, 25, 0.22)',
      shadowFocus: '0 0 0 3px rgba(184, 135, 70, 0.24)',
    },
    iconStyle: {
      strokeWidth: 1.65,
      iconContainer: 'Symmetric premium icon frame with fine border.',
      moduleIconBackground: 'Deep navy or muted gold module tile.',
      statusIconStyle: 'Low-saturation status, always text-backed.',
    },
    motif: {
      style: 'art_deco_geometry',
      cornerType: 'stepped geometric corner frame',
      illustrationType: 'thin architectural deco linework',
      opacity: { light: 0.24, dark: 0.18 },
      lineWeight: 1.25,
      useOnHero: true,
      useOnFeaturedCards: true,
      useOnEmptyStates: true,
      useOnSectionHeaders: true,
      note: 'Art Deco Premium uses restrained stepped geometry and fine gold-adjacent corner art.',
      lightBehavior: 'Ivory surfaces can show clearer muted-gold geometry at the corners.',
      darkBehavior: 'Dark mode keeps the same geometry as low-glow linework, never a thick gold frame.',
    },
    density: 'balanced',
    sampleBadges: [
      { label: 'Onayli', background: '#DDECE4', foreground: '#285B46' },
      { label: 'Yonetici', background: '#F3E5C9', foreground: '#6F4E18' },
      { label: 'Kritik', background: '#F0D8D2', foreground: '#7A312B' },
    ],
    designerNote: 'Art Deco Premium should feel expensive and calm, with thin architectural corner geometry instead of heavy ornament.',
  }),
  makeTheme({
    id: 'anatolian_60s',
    name: VISUAL_THEME_LABELS.anatolian_60s,
    description: 'Warm Anatolian mid-century ERP identity with stone, cream, petrol blue and copper accents.',
    artDirection: 'Anatolian Modern 60s.',
    inspiration: '1960s modernism, warm neutrals, stone, copper, olive and petrol blue.',
    personality: ['warm', 'local', 'modernist', 'human'],
    bestFor: ['manufacturing', 'growing SMEs', 'family companies'],
    modes: {
      light: {
        bg: '#F4EFE6',
        bgSubtle: '#EDE3D4',
        surface: '#FFF9EF',
        surfaceMuted: '#EFE5D6',
        surfaceRaised: '#FFFFFF',
        surfaceInset: '#E4D8C6',
        border: '#D8CBB8',
        borderStrong: '#BDAE96',
        text: '#2F2A24',
        textMuted: '#675D50',
        textSoft: '#7A6F62',
        accent: '#1F5E64',
        accentHover: '#17484D',
        accentSoft: '#D8ECEA',
        accentText: '#FFFFFF',
        accentWarm: '#B66A3C',
        success: '#526F3F',
        successSoft: '#E0E8D6',
        warning: '#C7863D',
        warningSoft: '#F2DFBD',
        danger: '#A94E3B',
        dangerSoft: '#ECD6CF',
        info: '#2D6F7A',
        infoSoft: '#D8ECEA',
        navBg: '#142A2C',
        navText: '#F2E8D8',
        navMuted: '#B8AA96',
        navActiveBg: 'rgba(182, 106, 60, 0.24)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(242, 232, 216, 0.08)',
        headerBg: '#FFF9EF',
        headerBorder: '#D8CBB8',
        cardBg: '#FFF9EF',
        cardBorder: '#D8CBB8',
        inputBg: '#FFFFFF',
        inputBorder: '#BDAE96',
        inputFocus: '#B66A3C',
        tableHeaderBg: '#EFE5D6',
        tableRowHover: '#F8ECDD',
        tableRowSelected: '#D8ECEA',
        badgeBg: '#EFE5D6',
        focusRing: 'rgba(182, 106, 60, 0.24)',
        alertBg: '#F2DFBD',
        alertBorder: '#C7863D',
        iconContainerBg: '#E8DAC5',
        iconContainerBorder: '#C9B99F',
        moduleIconBg: '#1F5E64',
        statusIconBg: '#EFE5D6',
      },
      dark: {
        bg: '#101C1E',
        bgSubtle: '#172728',
        surface: '#1E2F2F',
        surfaceMuted: '#263A37',
        surfaceRaised: '#243635',
        surfaceInset: '#0C1718',
        border: '#3A4E49',
        borderStrong: '#5D746C',
        text: '#F2E8D8',
        textMuted: '#D4C4AE',
        textSoft: '#B8AA96',
        accent: '#5EA4A7',
        accentHover: '#75BCBF',
        accentSoft: '#173F42',
        accentText: '#0B1A1B',
        accentWarm: '#D18A57',
        success: '#8BAA6B',
        successSoft: '#233725',
        warning: '#D89A4E',
        warningSoft: '#3D2B18',
        danger: '#D07461',
        dangerSoft: '#3D211F',
        info: '#6CBAC2',
        infoSoft: '#173F42',
        navBg: '#0C1718',
        navText: '#F2E8D8',
        navMuted: '#B8AA96',
        navActiveBg: 'rgba(209, 138, 87, 0.22)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(242, 232, 216, 0.08)',
        headerBg: '#1E2F2F',
        headerBorder: '#3A4E49',
        cardBg: '#1E2F2F',
        cardBorder: '#3A4E49',
        inputBg: '#172728',
        inputBorder: '#3A4E49',
        inputFocus: '#D18A57',
        tableHeaderBg: '#263A37',
        tableRowHover: '#243635',
        tableRowSelected: '#173F42',
        badgeBg: '#263A37',
        focusRing: 'rgba(209, 138, 87, 0.25)',
        alertBg: '#3D2B18',
        alertBorder: '#D89A4E',
        iconContainerBg: '#243635',
        iconContainerBorder: '#5D746C',
        moduleIconBg: '#5EA4A7',
        statusIconBg: '#263A37',
      },
    },
    surfaces: {
      page: 'Warm stone background with petrol-blue order.',
      panel: 'Natural border and cream paper-like cards.',
      card: 'Inviting but disciplined ERP cards.',
      control: 'Soft input geometry with copper focus.',
      subtlePattern: 'Mid-century warmth through tone and spacing, not ornament.',
    },
    typography: {
      headingStyle: 'Human, warm and professional.',
      bodyStyle: 'Comfortable reading for production and SME workflows.',
      labelStyle: 'Soft but clear label weight.',
      monoStyle: 'Muted petrol/stone metadata.',
    },
    radius: {
      radiusSmall: '8px',
      radiusMedium: '12px',
      radiusLarge: '16px',
      cardRadius: '20px',
      inputRadius: '14px',
    },
    shadows: {
      shadowSubtle: '0 1px 2px rgba(69, 53, 35, 0.06)',
      shadowCard: '0 14px 36px rgba(69, 53, 35, 0.10)',
      shadowFloating: '0 24px 58px rgba(42, 34, 24, 0.18)',
      shadowFocus: '0 0 0 3px rgba(182, 106, 60, 0.24)',
    },
    iconStyle: {
      strokeWidth: 1.8,
      iconContainer: 'Warm stone icon tile with petrol/copper accent.',
      moduleIconBackground: 'Petrol module tile over cream surfaces.',
      statusIconStyle: 'Natural state colors with text support.',
    },
    motif: {
      style: 'retro_sun',
      cornerType: 'half sun corner mark',
      illustrationType: 'mid-century sun rays and warm rings',
      opacity: { light: 0.28, dark: 0.16 },
      lineWeight: 1.4,
      useOnHero: true,
      useOnFeaturedCards: true,
      useOnEmptyStates: true,
      useOnSectionHeaders: true,
      note: 'Anadolu Modern uses a small retro sun/ray motif to bring warm 60s modernism into large surfaces.',
      lightBehavior: 'Light mode can show a warmer copper sun tint and soft abstract rings.',
      darkBehavior: 'Dark mode keeps the motif as subdued warm contour lines over petrol surfaces.',
    },
    density: 'comfortable',
    sampleBadges: [
      { label: 'Hazir', background: '#E0E8D6', foreground: '#385C31' },
      { label: 'Bekliyor', background: '#F2DFBD', foreground: '#765018' },
      { label: 'Eksik', background: '#ECD6CF', foreground: '#7D3E32' },
    ],
    designerNote: 'Anadolu Modern should feel warm and local with a controlled retro sun motif, never rustic or cartoonish.',
  }),
  makeTheme({
    id: 'command_bauhaus',
    name: VISUAL_THEME_LABELS.command_bauhaus,
    description: 'Natural workshop ERP identity with deep green structure, craft calm and botanical corner details.',
    artDirection: 'Green Atelier.',
    inspiration: 'Botanical linework, crafted workshop discipline, natural materials and calm production surfaces.',
    personality: ['natural', 'calm', 'productive', 'crafted'],
    bestFor: ['production', 'document workflows', 'field operations', 'daily ERP work'],
    modes: {
      light: {
        bg: '#F3F1E6',
        bgSubtle: '#E7E1CF',
        surface: '#FFFDF4',
        surfaceMuted: '#EDE7D5',
        surfaceRaised: '#FFFFFF',
        surfaceInset: '#DDD4BE',
        border: '#D1C8B2',
        borderStrong: '#AFA287',
        text: '#173225',
        textMuted: '#48614E',
        textSoft: '#6D7D68',
        accent: '#1F6B3A',
        accentHover: '#174F2C',
        accentSoft: '#DCEADB',
        accentText: '#FFFFFF',
        accentWarm: '#A36F2C',
        success: '#2F7D46',
        successSoft: '#DCEEDC',
        warning: '#B8862D',
        warningSoft: '#F3E4BF',
        danger: '#A84638',
        dangerSoft: '#EBD5CD',
        info: '#2C6E58',
        infoSoft: '#DDECE5',
        navBg: '#163B25',
        navText: '#F4F1E6',
        navMuted: '#C8D2BE',
        navActiveBg: 'rgba(47, 125, 70, 0.26)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(244, 241, 230, 0.09)',
        headerBg: '#FFFDF4',
        headerBorder: '#D1C8B2',
        cardBg: '#FFFDF4',
        cardBorder: '#D1C8B2',
        inputBg: '#FFFFFF',
        inputBorder: '#AFA287',
        inputFocus: '#2F7D46',
        tableHeaderBg: '#EDE7D5',
        tableRowHover: '#EEF5E8',
        tableRowSelected: '#DCEADB',
        badgeBg: '#EDE7D5',
        focusRing: 'rgba(47, 125, 70, 0.24)',
        alertBg: '#F3E4BF',
        alertBorder: '#B8862D',
        iconContainerBg: '#DCEADB',
        iconContainerBorder: '#9EC28D',
        moduleIconBg: '#1F6B3A',
        statusIconBg: '#EDE7D5',
      },
      dark: {
        bg: '#0F1E16',
        bgSubtle: '#13261B',
        surface: '#182D20',
        surfaceMuted: '#203A29',
        surfaceRaised: '#1E3527',
        surfaceInset: '#0A1710',
        border: '#33543D',
        borderStrong: '#5D7B61',
        text: '#EEF4E8',
        textMuted: '#CAD8C2',
        textSoft: '#A8BA9C',
        accent: '#7FC489',
        accentHover: '#9AD69F',
        accentSoft: '#193A24',
        accentText: '#07140B',
        accentWarm: '#D2A25C',
        success: '#7FC489',
        successSoft: '#173823',
        warning: '#D2A25C',
        warningSoft: '#3A2A13',
        danger: '#D06F5F',
        dangerSoft: '#3B1D1A',
        info: '#7CC0A1',
        infoSoft: '#153829',
        navBg: '#09150E',
        navText: '#EEF4E8',
        navMuted: '#A8BA9C',
        navActiveBg: 'rgba(127, 196, 137, 0.19)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(238, 244, 232, 0.07)',
        headerBg: '#182D20',
        headerBorder: '#33543D',
        cardBg: '#182D20',
        cardBorder: '#33543D',
        inputBg: '#13261B',
        inputBorder: '#33543D',
        inputFocus: '#7FC489',
        tableHeaderBg: '#203A29',
        tableRowHover: '#1E3527',
        tableRowSelected: '#193A24',
        badgeBg: '#203A29',
        focusRing: 'rgba(127, 196, 137, 0.24)',
        alertBg: '#3A2A13',
        alertBorder: '#D2A25C',
        iconContainerBg: '#193A24',
        iconContainerBorder: '#3F704B',
        moduleIconBg: '#7FC489',
        statusIconBg: '#203A29',
      },
    },
    surfaces: {
      page: 'Calm warm-neutral page field with deep green structure.',
      panel: 'Natural paper-like panels with controlled botanical edges.',
      card: 'Crafted cards with soft green borders and subtle organic frame language.',
      control: 'Grounded input focus with green atelier confidence.',
      subtlePattern: 'Botanical linework and workshop calm through corners, borders and surface tone.',
    },
    typography: {
      headingStyle: 'Calm workshop heading with natural authority.',
      bodyStyle: 'Readable daily ERP rhythm with softer line height.',
      labelStyle: 'Clear semibold labels with crafted restraint.',
      monoStyle: 'Muted green metadata for documents and process ids.',
    },
    radius: {
      radiusSmall: '4px',
      radiusMedium: '8px',
      radiusLarge: '10px',
      cardRadius: '12px',
      inputRadius: '8px',
    },
    shadows: {
      shadowSubtle: '0 1px 2px rgba(23, 50, 37, 0.08)',
      shadowCard: '0 14px 34px rgba(23, 50, 37, 0.12)',
      shadowFloating: '0 24px 58px rgba(10, 23, 16, 0.24)',
      shadowFocus: '0 0 0 3px rgba(47, 125, 70, 0.24)',
    },
    iconStyle: {
      strokeWidth: 1.75,
      iconContainer: 'Soft botanical icon container with fine green border.',
      moduleIconBackground: 'Deep green module tile over warm neutral surfaces.',
      statusIconStyle: 'Natural status tones, always paired with text.',
    },
    motif: {
      style: 'botanical_line',
      cornerType: 'botanical vine corner',
      illustrationType: 'flat leaf and branch contour',
      opacity: { light: 0.24, dark: 0.15 },
      lineWeight: 1.35,
      useOnHero: true,
      useOnFeaturedCards: true,
      useOnEmptyStates: true,
      useOnSectionHeaders: true,
      note: 'Green Atelier uses delicate leaf and branch linework as a restrained workshop/botanical signature.',
      lightBehavior: 'Light mode shows soft green botanical contours in hero, empty state and featured card corners.',
      darkBehavior: 'Dark mode reduces the motif to quiet green contour lines with no bright glow.',
    },
    density: 'balanced',
    sampleBadges: [
      { label: 'Hazir', background: '#DCEEDC', foreground: '#255E36' },
      { label: 'Atolye', background: '#F3E4BF', foreground: '#714D17' },
      { label: 'Eksik', background: '#EBD5CD', foreground: '#74342A' },
    ],
    designerNote: 'Green Atelier should feel natural, productive and crafted, with botanical details that never turn into a poster.',
  }),
  makeTheme({
    id: 'pop_studio',
    name: VISUAL_THEME_LABELS.pop_studio,
    description: 'Energetic studio identity with controlled Pop Art color blocks inside enterprise-safe boundaries.',
    artDirection: 'Pop Studio.',
    inspiration: 'Pop Art, graphic color blocks, studio energy and controlled creative contrast.',
    personality: ['energetic', 'graphic', 'creative', 'controlled'],
    bestFor: ['project teams', 'creative operations', 'young teams'],
    modes: {
      light: {
        bg: '#FFF8E8',
        bgSubtle: '#F5EEDC',
        surface: '#FFFFFF',
        surfaceMuted: '#FFF1C7',
        surfaceRaised: '#FFFFFF',
        surfaceInset: '#F1E4C6',
        border: '#E7D9BE',
        borderStrong: '#CDBB95',
        text: '#171717',
        textMuted: '#4F463D',
        textSoft: '#6B5F52',
        accent: '#2563EB',
        accentHover: '#1D4ED8',
        accentSoft: '#DBEAFE',
        accentText: '#FFFFFF',
        accentWarm: '#FF6B35',
        success: '#2A9D8F',
        successSoft: '#D8F3EE',
        warning: '#F9A620',
        warningSoft: '#FFF1C7',
        danger: '#E63946',
        dangerSoft: '#FFE1E5',
        info: '#277DA1',
        infoSoft: '#DCEFF8',
        navBg: '#171717',
        navText: '#FAF3E3',
        navMuted: '#BDB1A1',
        navActiveBg: 'rgba(255, 107, 53, 0.24)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(250, 243, 227, 0.08)',
        headerBg: '#FFFFFF',
        headerBorder: '#E7D9BE',
        cardBg: '#FFFFFF',
        cardBorder: '#E7D9BE',
        inputBg: '#FFFFFF',
        inputBorder: '#CDBB95',
        inputFocus: '#FF6B35',
        tableHeaderBg: '#FFF1C7',
        tableRowHover: '#FFF5D8',
        tableRowSelected: '#DBEAFE',
        badgeBg: '#FFF1C7',
        focusRing: 'rgba(255, 107, 53, 0.24)',
        alertBg: '#FFF1C7',
        alertBorder: '#F9A620',
        iconContainerBg: '#DBEAFE',
        iconContainerBorder: '#93C5FD',
        moduleIconBg: '#FF6B35',
        statusIconBg: '#FFF1C7',
      },
      dark: {
        bg: '#111111',
        bgSubtle: '#1A1A1A',
        surface: '#1F1F1F',
        surfaceMuted: '#2A2520',
        surfaceRaised: '#292929',
        surfaceInset: '#0C0C0C',
        border: '#3A332B',
        borderStrong: '#5C5142',
        text: '#FAF3E3',
        textMuted: '#D6CBBB',
        textSoft: '#BDB1A1',
        accent: '#60A5FA',
        accentHover: '#93C5FD',
        accentSoft: '#1E3A8A',
        accentText: '#07111F',
        accentWarm: '#FF8A4C',
        success: '#42D6A4',
        successSoft: '#103A30',
        warning: '#FFD166',
        warningSoft: '#3F3216',
        danger: '#FF5A66',
        dangerSoft: '#421C22',
        info: '#4CC9F0',
        infoSoft: '#0B3346',
        navBg: '#0C0C0C',
        navText: '#FAF3E3',
        navMuted: '#BDB1A1',
        navActiveBg: 'rgba(255, 138, 76, 0.22)',
        navActiveText: '#FFFFFF',
        navHoverBg: 'rgba(250, 243, 227, 0.08)',
        headerBg: '#1F1F1F',
        headerBorder: '#3A332B',
        cardBg: '#1F1F1F',
        cardBorder: '#3A332B',
        inputBg: '#171717',
        inputBorder: '#3A332B',
        inputFocus: '#FF8A4C',
        tableHeaderBg: '#2A2520',
        tableRowHover: '#292929',
        tableRowSelected: '#1E3A8A',
        badgeBg: '#2A2520',
        focusRing: 'rgba(255, 138, 76, 0.25)',
        alertBg: '#3F3216',
        alertBorder: '#FFD166',
        iconContainerBg: '#1E3A8A',
        iconContainerBorder: '#315AA7',
        moduleIconBg: '#FF8A4C',
        statusIconBg: '#2A2520',
      },
    },
    surfaces: {
      page: 'Warm neutral field with controlled graphic energy.',
      panel: 'Enterprise-safe cards with color-block accents.',
      card: 'Softer, energetic cards that remain data-readable.',
      control: 'Vivid focus and CTA rhythm, not playful clutter.',
      subtlePattern: 'Pop energy limited to accents, badges and icons.',
    },
    typography: {
      headingStyle: 'Confident studio heading without display-scale excess.',
      bodyStyle: 'Clear enterprise body copy under graphic accents.',
      labelStyle: 'Punchy but readable labels.',
      monoStyle: 'Dark ink metadata with color-coded support.',
    },
    radius: {
      radiusSmall: '10px',
      radiusMedium: '14px',
      radiusLarge: '18px',
      cardRadius: '22px',
      inputRadius: '14px',
    },
    shadows: {
      shadowSubtle: '0 1px 2px rgba(23, 23, 23, 0.08)',
      shadowCard: '0 14px 34px rgba(23, 23, 23, 0.12)',
      shadowFloating: '0 26px 62px rgba(23, 23, 23, 0.24)',
      shadowFocus: '0 0 0 3px rgba(255, 107, 53, 0.24)',
    },
    iconStyle: {
      strokeWidth: 1.85,
      iconContainer: 'Graphic color-block icon tile with disciplined border.',
      moduleIconBackground: 'Warm coral or blue module tile.',
      statusIconStyle: 'Colorful status, always backed by text/icon.',
    },
    motif: {
      style: 'pop_blocks',
      cornerType: 'graphic color-block corner accent',
      illustrationType: 'dots, blocks, half circles and compact burst marks',
      opacity: { light: 0.30, dark: 0.18 },
      lineWeight: 1.5,
      useOnHero: true,
      useOnFeaturedCards: true,
      useOnEmptyStates: true,
      useOnSectionHeaders: true,
      note: 'Pop Studio uses controlled graphic corner accents so the theme has energy without comic-book noise.',
      lightBehavior: 'Light mode can show brighter block accents, dots and compact burst geometry.',
      darkBehavior: 'Dark mode keeps the same graphic rhythm with reduced contrast and smaller accent weight.',
    },
    density: 'balanced',
    sampleBadges: [
      { label: 'Yeni', background: '#DBEAFE', foreground: '#1E40AF' },
      { label: 'Yaratim', background: '#FFF1C7', foreground: '#8A5A08' },
      { label: 'Dikkat', background: '#FFE1E5', foreground: '#9F1D2A' },
    ],
    designerNote: 'Pop Studio should feel energetic and graphic, with corner accents kept concentrated and professional.',
  }),
]

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
    '--dl-motif-corner-size': theme.motif.style === 'minimal_grid' ? '92px' : '132px',
  }
}

export function getEdenThemeCssVars(theme: ThemeConcept, appearance: ThemeAppearanceMode): Record<`--${string}`, string> {
  const mode = theme.modes[appearance]
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
    '--eden-card-bg': mode.cardBg,
    '--eden-card-border': mode.cardBorder,
    '--eden-card-shadow': theme.shadows.shadowCard,
    '--eden-input-bg': mode.inputBg,
    '--eden-input-border': mode.inputBorder,
    '--eden-input-focus': mode.inputFocus,
    '--eden-table-header-bg': mode.tableHeaderBg,
    '--eden-table-row-hover': mode.tableRowHover,
    '--eden-table-row-selected': mode.tableRowSelected,
    '--eden-badge-bg': mode.badgeBg,
    '--eden-focus-ring': mode.focusRing,
    '--eden-alert-bg': mode.alertBg,
    '--eden-alert-border': mode.alertBorder,
    '--eden-radius-sm': theme.radius.radiusSmall,
    '--eden-radius-md': theme.radius.radiusMedium,
    '--eden-radius-lg': theme.radius.radiusLarge,
    '--eden-radius-card': theme.radius.cardRadius,
    '--eden-radius-button': theme.radius.radiusMedium,
    '--eden-radius-input': theme.radius.inputRadius,
    '--eden-shadow-subtle': theme.shadows.shadowSubtle,
    '--eden-shadow-card': theme.shadows.shadowCard,
    '--eden-shadow-floating': theme.shadows.shadowFloating,
    '--eden-shadow-focus': theme.shadows.shadowFocus,
    '--eden-table-row-height': rowHeight(theme.density),
    '--eden-form-field-height': fieldHeight(theme.density),
    '--eden-card-padding': cardPadding(theme.density),
    '--eden-section-gap': sectionGap(theme.density),
    '--eden-icon-stroke': String(theme.iconStyle.strokeWidth),
    '--eden-icon-container-bg': mode.iconContainerBg,
    '--eden-icon-container-border': mode.iconContainerBorder,
    '--eden-module-icon-bg': mode.moduleIconBg,
    '--eden-status-icon-bg': mode.statusIconBg,
    '--eden-motif-opacity': String(theme.motif.opacity[appearance]),
    '--eden-motif-line-width': `${theme.motif.lineWeight}px`,
    '--eden-motif-corner-size': theme.motif.style === 'minimal_grid' ? '92px' : '132px',
  }
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
