export type ThemeConceptId = 'classic' | 'executive_premium' | 'anatolian_modern' | 'technical_command'
export type LegacyThemeConceptId = 'classicCurrent' | 'executivePremium' | 'anatolianModern' | 'technicalCommand'
export type ThemeDensity = 'compact' | 'balanced' | 'comfortable'
export type ThemeAppearanceMode = 'light' | 'dark'

export const DEFAULT_VISUAL_THEME_ID: ThemeConceptId = 'classic'
export const DEFAULT_DESIGN_LAB_THEME_ID: ThemeConceptId = DEFAULT_VISUAL_THEME_ID
export const VISUAL_THEME_CHANGE_EVENT = 'eden:visual-theme-change'
export const VISUAL_THEME_STORAGE_KEY = 'eden.visualTheme'
export const LEGACY_DESIGN_LAB_THEME_STORAGE_KEY = 'eden.designLab.activeTheme'
export const DESIGN_LAB_THEME_CHANGE_EVENT = VISUAL_THEME_CHANGE_EVENT
export const DESIGN_LAB_THEME_STORAGE_KEY = VISUAL_THEME_STORAGE_KEY

export const VISUAL_THEME_LABELS: Record<ThemeConceptId, string> = {
  classic: 'Klasik',
  executive_premium: 'Kurumsal Premium',
  anatolian_modern: 'Anadolu Modern',
  technical_command: 'Teknik Komuta',
}

const LEGACY_THEME_ID_MAP: Record<LegacyThemeConceptId, ThemeConceptId> = {
  classicCurrent: 'classic',
  executivePremium: 'executive_premium',
  anatolianModern: 'anatolian_modern',
  technicalCommand: 'technical_command',
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

export interface ThemeConcept {
  id: ThemeConceptId
  name: string
  description: string
  personality: string[]
  bestFor: string[]
  colors: ThemeConceptColors
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
  density: ThemeDensity
  sampleBadges: {
    label: string
    background: string
    foreground: string
  }[]
  designerNote: string
}

export const themeConcepts: ThemeConcept[] = [
  {
    id: 'classic',
    name: VISUAL_THEME_LABELS.classic,
    description: 'Mevcut Eden UI temizligini baseline olarak koruyan, notr ve tanidik referans gorunum.',
    personality: ['sade', 'temiz', 'notr', 'referans'],
    bestFor: ['mevcut kaliteyi koruma', 'release karsilastirmasi', 'dusuk riskli temel'],
    colors: {
      background: '#f7fafc',
      foreground: '#0f172a',
      surfaceBase: '#ffffff',
      surfaceRaised: '#ffffff',
      surfaceMuted: '#edf6fa',
      borderSubtle: '#dbe5ec',
      borderStrong: '#b8c7d2',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#7b8794',
      accentPrimary: '#216688',
      accentSecondary: '#0e8c61',
      accentWarm: '#f4c323',
      success: '#0e8c61',
      warning: '#c98a04',
      danger: '#d93025',
      info: '#216688',
    },
    surfaces: {
      page: 'Aydinlik, notr gri zemin.',
      panel: 'Beyaz yuzey, ince gri border.',
      card: 'Temiz kart, az golge, genis okunabilir alan.',
      control: 'Mevcut yuvarlatilmis input ve button dili.',
      subtlePattern: 'Desensiz, duz kurumsal yuzey.',
    },
    typography: {
      headingStyle: 'Net, agirligi dengeli, mevcut Plus Jakarta ritmine yakin.',
      bodyStyle: 'Okunabilir, fazla karakter eklemeyen is yazilimi metni.',
      labelStyle: 'Kucuk, semi-bold ve notr.',
      monoStyle: 'ID, tarih ve maskeli degerler icin sade monospace.',
    },
    radius: {
      radiusSmall: '6px',
      radiusMedium: '8px',
      radiusLarge: '10px',
      cardRadius: '10px',
      inputRadius: '8px',
    },
    shadows: {
      shadowSubtle: '0 1px 2px rgba(15, 34, 51, 0.05)',
      shadowCard: '0 8px 24px rgba(15, 34, 51, 0.07)',
      shadowFloating: '0 18px 40px rgba(15, 34, 51, 0.12)',
      shadowFocus: '0 0 0 3px rgba(33, 102, 136, 0.18)',
    },
    iconStyle: {
      strokeWidth: 1.8,
      iconContainer: 'Mevcut soft renkli kare container.',
      moduleIconBackground: 'Acik mavi veya yesil tint.',
      statusIconStyle: 'Ince stroke, text ile birlikte kullanilir.',
    },
    density: 'balanced',
    sampleBadges: [
      { label: 'Aktif', background: '#e5f5ef', foreground: '#0b6b4b' },
      { label: 'Eksik belge', background: '#fef8e3', foreground: '#8a5d05' },
      { label: 'Risk', background: '#fde8e7', foreground: '#a32820' },
    ],
    designerNote: 'Mevcut arayuzun baseline halidir. Karsilastirma icin korunur.',
  },
  {
    id: 'executive_premium',
    name: VISUAL_THEME_LABELS.executive_premium,
    description: 'Ciddi, pahali ve guven veren kurumsal ERP hissi; kontrollu renk, rafine border ve karar verici dashboard dili.',
    personality: ['ciddi', 'guven veren', 'rafine', 'yonetici odakli'],
    bestFor: ['holding/KOBI ust yonetimi', 'finans ciddiyeti', 'savunma ve danismanlik', 'ilk release gorsel yonu'],
    colors: {
      background: '#eef2f5',
      foreground: '#111827',
      surfaceBase: '#f9faf9',
      surfaceRaised: '#ffffff',
      surfaceMuted: '#e7edf2',
      borderSubtle: '#cfd8df',
      borderStrong: '#8da0ad',
      textPrimary: '#121a24',
      textSecondary: '#3b4a59',
      textMuted: '#74808b',
      accentPrimary: '#16324a',
      accentSecondary: '#46525f',
      accentWarm: '#b88932',
      success: '#3f7c62',
      warning: '#b88932',
      danger: '#a64b4b',
      info: '#315f7c',
    },
    surfaces: {
      page: 'Kirli beyaz zemin, grafit ve lacivert kontrast.',
      panel: 'Beyaz yuzey, soguk gri border, premium is yazilimi sakinligi.',
      card: 'Kontrollu golge, daha ince border ve baslik hiyerarsisi.',
      control: 'Daha keskin input, ciddi button, amber vurgu.',
      subtlePattern: 'Hafif header tint ve tonal katman.',
    },
    typography: {
      headingStyle: 'Sikistirilmis degil; ciddi, kurumsal, agirligi kontrollu.',
      bodyStyle: 'Finans/yonetim ekrani okunabilirligi.',
      labelStyle: 'Buyuk harf kullanmadan net label ritmi.',
      monoStyle: 'Tarih, tutar ve belge kodlarinda soguk gri monospace.',
    },
    radius: {
      radiusSmall: '5px',
      radiusMedium: '7px',
      radiusLarge: '8px',
      cardRadius: '8px',
      inputRadius: '7px',
    },
    shadows: {
      shadowSubtle: '0 1px 2px rgba(17, 24, 39, 0.08)',
      shadowCard: '0 14px 36px rgba(22, 50, 74, 0.10)',
      shadowFloating: '0 24px 60px rgba(17, 24, 39, 0.18)',
      shadowFocus: '0 0 0 3px rgba(184, 137, 50, 0.22)',
    },
    iconStyle: {
      strokeWidth: 1.65,
      iconContainer: 'Koyu lacivert veya grafit container icinde rafine ikon.',
      moduleIconBackground: 'Lacivert zemin, amber mikro vurgu.',
      statusIconStyle: 'Muted yesil/kirmizi ve dusuk saturasyon.',
    },
    density: 'compact',
    sampleBadges: [
      { label: 'Onayli', background: '#dfece6', foreground: '#2f614b' },
      { label: 'Yonetici', background: '#efe1c8', foreground: '#6f4e18' },
      { label: 'Kritik', background: '#ead7d7', foreground: '#803a3a' },
    ],
    designerNote: 'Daha ciddi, pahali ve guven veren bir kurumsal ERP hissi verir. Ilk release icin en guvenli gorsel yon olabilir.',
  },
  {
    id: 'anatolian_modern',
    name: VISUAL_THEME_LABELS.anatolian_modern,
    description: 'Sicak ama kurumsal; petrol mavisi, tas grisi, bakir vurgu ve yerel pazara yakin sofistike yuzey dili.',
    personality: ['sicak', 'yerel karakterli', 'sofistike', 'uretim odakli'],
    bestFor: ['Turkiye pazari', 'uretim sirketleri', 'buyuyen KOBI', 'aile sirketleri'],
    colors: {
      background: '#f4f0e8',
      foreground: '#17221f',
      surfaceBase: '#fffaf1',
      surfaceRaised: '#ffffff',
      surfaceMuted: '#ece4d6',
      borderSubtle: '#d8cdbc',
      borderStrong: '#a89a86',
      textPrimary: '#17221f',
      textSecondary: '#4f5b55',
      textMuted: '#827668',
      accentPrimary: '#0e5a66',
      accentSecondary: '#465f3c',
      accentWarm: '#b86d3a',
      success: '#4f7d43',
      warning: '#c79b36',
      danger: '#a54d3d',
      info: '#286d78',
    },
    surfaces: {
      page: 'Krem zemin, petrol mavisi ve tas grisi dengesi.',
      panel: 'Sicak beyaz yuzey, dogal border.',
      card: 'Hafif katmanli, abartisiz dokulu his.',
      control: 'Daha yumusak input, bakir vurgu ile secili durum.',
      subtlePattern: 'Cok hafif tonal katman ve sicak spacing.',
    },
    typography: {
      headingStyle: 'Kurumsal ama daha insani, marka karakteri daha belirgin.',
      bodyStyle: 'Rahat okunur, operasyonel is diliyle uyumlu.',
      labelStyle: 'Sakin ve dogal label agirligi.',
      monoStyle: 'Belge kodlarinda koyu zeytin/gri monospace.',
    },
    radius: {
      radiusSmall: '6px',
      radiusMedium: '8px',
      radiusLarge: '10px',
      cardRadius: '10px',
      inputRadius: '8px',
    },
    shadows: {
      shadowSubtle: '0 1px 2px rgba(69, 53, 35, 0.06)',
      shadowCard: '0 12px 34px rgba(69, 53, 35, 0.11)',
      shadowFloating: '0 22px 52px rgba(69, 53, 35, 0.16)',
      shadowFocus: '0 0 0 3px rgba(184, 109, 58, 0.22)',
    },
    iconStyle: {
      strokeWidth: 1.8,
      iconContainer: 'Petrol veya zeytin tint container icinde sakin ikon.',
      moduleIconBackground: 'Krem yuzey uzerinde petrol/bakir aksan.',
      statusIconStyle: 'Daha dogal, dusuk parlaklikli state ikonlari.',
    },
    density: 'comfortable',
    sampleBadges: [
      { label: 'Hazir', background: '#e1ebdb', foreground: '#385c31' },
      { label: 'Bekliyor', background: '#f2dfbd', foreground: '#7a5419' },
      { label: 'Eksik', background: '#ead6cf', foreground: '#7d3e32' },
    ],
    designerNote: 'Daha sicak, yerel karakterli ve uretim/KOBI pazarina yakin bir gorsel dil sunar. Marka karakteri Executive Premiuma gore daha ozgundur.',
  },
  {
    id: 'technical_command',
    name: VISUAL_THEME_LABELS.technical_command,
    description: 'Operasyon merkezi hissi; koyu slate/navy yuzey, teal-cyan vurgu, belirgin status ve yogun tablo okunabilirligi.',
    personality: ['operasyonel', 'teknik', 'guvenlik odakli', 'analitik'],
    bestFor: ['PlaneGuard', 'teknik servis', 'operasyon', 'guvenlik', 'C-UAS ve savunma'],
    colors: {
      background: '#07121d',
      foreground: '#e6f1f4',
      surfaceBase: '#0d1b29',
      surfaceRaised: '#12263a',
      surfaceMuted: '#182f43',
      borderSubtle: '#24445b',
      borderStrong: '#3b6f83',
      textPrimary: '#ecf7f9',
      textSecondary: '#b6ccd3',
      textMuted: '#7894a0',
      accentPrimary: '#35c4c8',
      accentSecondary: '#4ca66a',
      accentWarm: '#d49a35',
      success: '#62b36f',
      warning: '#d49a35',
      danger: '#d45f5f',
      info: '#58a6ff',
    },
    surfaces: {
      page: 'Koyu operasyon zemini, yuksek ama kontrollu kontrast.',
      panel: 'Slate panel, cyan border ve analitik ayirim.',
      card: 'Teknik dashboard karti, daha belirgin status dili.',
      control: 'Koyu input, net focus ve operasyonel action butonlari.',
      subtlePattern: 'Grid hissi veren tonal katman, dekoratif degil islevsel.',
    },
    typography: {
      headingStyle: 'Kompakt, operasyon ekranina uygun, net.',
      bodyStyle: 'Koyu zeminde goz yormayan satir yuksekligi.',
      labelStyle: 'Status odakli, kisa ve okunakli.',
      monoStyle: 'Kod, zaman ve audit degerlerinde teknik monospace.',
    },
    radius: {
      radiusSmall: '4px',
      radiusMedium: '6px',
      radiusLarge: '8px',
      cardRadius: '8px',
      inputRadius: '6px',
    },
    shadows: {
      shadowSubtle: '0 1px 2px rgba(0, 0, 0, 0.28)',
      shadowCard: '0 14px 34px rgba(0, 0, 0, 0.32)',
      shadowFloating: '0 28px 64px rgba(0, 0, 0, 0.42)',
      shadowFocus: '0 0 0 3px rgba(53, 196, 200, 0.24)',
    },
    iconStyle: {
      strokeWidth: 1.9,
      iconContainer: 'Teknik moduller icin koyu container ve cyan kenar.',
      moduleIconBackground: 'Slate/cyan katmanli module tile.',
      statusIconStyle: 'Belirgin, hizli taranabilir, operasyon renkleri.',
    },
    density: 'compact',
    sampleBadges: [
      { label: 'Online', background: '#143829', foreground: '#8ee0a0' },
      { label: 'SLA 15g', background: '#3b2d15', foreground: '#ffd387' },
      { label: 'Alert', background: '#3b1f28', foreground: '#ff9b9b' },
    ],
    designerNote: 'Operasyon, savunma, teknik servis ve guvenlik modulleri icin gucludur. Tum ERPye uygulanirsa fazla koyu/operasyonel olabilir.',
  },
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

export function getThemeCssVars(theme: ThemeConcept): Record<`--${string}`, string> {
  return {
    '--dl-background': theme.colors.background,
    '--dl-foreground': theme.colors.foreground,
    '--dl-surface-base': theme.colors.surfaceBase,
    '--dl-surface-raised': theme.colors.surfaceRaised,
    '--dl-surface-muted': theme.colors.surfaceMuted,
    '--dl-border-subtle': theme.colors.borderSubtle,
    '--dl-border-strong': theme.colors.borderStrong,
    '--dl-text-primary': theme.colors.textPrimary,
    '--dl-text-secondary': theme.colors.textSecondary,
    '--dl-text-muted': theme.colors.textMuted,
    '--dl-accent-primary': theme.colors.accentPrimary,
    '--dl-accent-secondary': theme.colors.accentSecondary,
    '--dl-accent-warm': theme.colors.accentWarm,
    '--dl-success': theme.colors.success,
    '--dl-warning': theme.colors.warning,
    '--dl-danger': theme.colors.danger,
    '--dl-info': theme.colors.info,
    '--dl-radius-small': theme.radius.radiusSmall,
    '--dl-radius-medium': theme.radius.radiusMedium,
    '--dl-radius-large': theme.radius.radiusLarge,
    '--dl-card-radius': theme.radius.cardRadius,
    '--dl-input-radius': theme.radius.inputRadius,
    '--dl-shadow-subtle': theme.shadows.shadowSubtle,
    '--dl-shadow-card': theme.shadows.shadowCard,
    '--dl-shadow-floating': theme.shadows.shadowFloating,
    '--dl-shadow-focus': theme.shadows.shadowFocus,
    '--dl-density-row': theme.density === 'compact' ? '42px' : theme.density === 'comfortable' ? '58px' : '50px',
    '--dl-density-gap': theme.density === 'compact' ? '12px' : theme.density === 'comfortable' ? '20px' : '16px',
  }
}

export function getEdenThemeCssVars(theme: ThemeConcept, appearance: ThemeAppearanceMode): Record<`--${string}`, string> {
  if (appearance === 'dark') {
    const commandLike = theme.id === 'technical_command'
    return {
      '--eden-bg': commandLike ? theme.colors.background : '#09141e',
      '--eden-surface': commandLike ? theme.colors.surfaceBase : '#0f2233',
      '--eden-surface-muted': commandLike ? theme.colors.surfaceMuted : '#13263a',
      '--eden-surface-raised': commandLike ? theme.colors.surfaceRaised : '#162b46',
      '--eden-border': commandLike ? theme.colors.borderSubtle : '#24445b',
      '--eden-border-strong': commandLike ? theme.colors.borderStrong : '#3b6f83',
      '--eden-text': commandLike ? theme.colors.textPrimary : '#f3f7fb',
      '--eden-text-muted': commandLike ? theme.colors.textSecondary : '#a8bdc9',
      '--eden-accent': theme.colors.accentPrimary,
      '--eden-accent-soft': commandLike ? theme.colors.surfaceMuted : '#17344a',
      '--eden-success': theme.colors.success,
      '--eden-warning': theme.colors.warning,
      '--eden-danger': theme.colors.danger,
      '--eden-info': theme.colors.info,
      '--eden-radius-card': theme.radius.cardRadius,
      '--eden-shadow-card': theme.shadows.shadowCard,
    }
  }

  return {
    '--eden-bg': theme.colors.background,
    '--eden-surface': theme.colors.surfaceBase,
    '--eden-surface-muted': theme.colors.surfaceMuted,
    '--eden-surface-raised': theme.colors.surfaceRaised,
    '--eden-border': theme.colors.borderSubtle,
    '--eden-border-strong': theme.colors.borderStrong,
    '--eden-text': theme.colors.textPrimary,
    '--eden-text-muted': theme.colors.textSecondary,
    '--eden-accent': theme.colors.accentPrimary,
    '--eden-accent-soft': theme.colors.surfaceMuted,
    '--eden-success': theme.colors.success,
    '--eden-warning': theme.colors.warning,
    '--eden-danger': theme.colors.danger,
    '--eden-info': theme.colors.info,
    '--eden-radius-card': theme.radius.cardRadius,
    '--eden-shadow-card': theme.shadows.shadowCard,
  }
}
