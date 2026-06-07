export type UiAppearancePreference = 'system' | 'light' | 'dark'
export type UiThemePreference = UiAppearancePreference
export type VisualThemePreference = 'classic' | 'executive_premium' | 'anatolian_modern' | 'technical_command'
export type UiDensityPreference = 'comfortable' | 'compact'

export interface UserUiPreferences {
  appearanceMode: UiAppearancePreference
  theme: UiThemePreference
  visualTheme: VisualThemePreference
  accentColor: string
  sidebarCollapsed: boolean
  density: UiDensityPreference
  language: string
  dateFormat: string
  timeFormat: string
  defaultLandingPage: string
  tablePreferences: Record<string, unknown>
  dismissedHints: string[]
  hasSeenGlobalTour: boolean
  hasSeenFirstRunWelcome: boolean
  completedTourSteps: string[]
  completedPageTours: string[]
  dismissedPageTours: string[]
  dismissedOperationHints: string[]
  preferredHelpMode: 'tour' | 'guide' | 'both'
  lastTourVersion: string | null
  lastOnboardingVersion: string | null
  helpLevel: 'minimal' | 'guided' | 'detailed'
  actionGuideIntroSeen: boolean
  actionCenterIntroSeen: boolean
  actionGuideDismissed: boolean
  dismissedFieldHelpers: string[]
  lockedFieldHintsDismissed: string[]
}

export type UserUiPreferencesPatch = Partial<{
  appearanceMode: unknown
  appearance_mode: unknown
  theme: unknown
  visualTheme: unknown
  visual_theme: unknown
  accentColor: unknown
  sidebarCollapsed: unknown
  density: unknown
  language: unknown
  dateFormat: unknown
  timeFormat: unknown
  defaultLandingPage: unknown
  tablePreferences: unknown
  dismissedHints: unknown
  hasSeenGlobalTour: unknown
  hasSeenFirstRunWelcome: unknown
  completedTourSteps: unknown
  completedPageTours: unknown
  dismissedPageTours: unknown
  dismissedOperationHints: unknown
  preferredHelpMode: unknown
  lastTourVersion: unknown
  lastOnboardingVersion: unknown
  helpLevel: unknown
  actionGuideIntroSeen: unknown
  actionCenterIntroSeen: unknown
  actionGuideDismissed: unknown
  dismissedFieldHelpers: unknown
  lockedFieldHintsDismissed: unknown
}>

export interface BootstrapWorkspace {
  id: string
  name: string
  logoUrl?: string | null
  lightLogoUrl?: string | null
  darkLogoUrl?: string | null
}

export interface BootstrapUserState {
  isFirstLogin: boolean
  shouldShowSystemTour: boolean
  introVersion: string
  introCurrentStep: string | null
  uiPreferences: UserUiPreferences
}

export interface SessionBootstrapResponse {
  workspace: BootstrapWorkspace
  userState: BootstrapUserState
  onboardingPreferences?: {
    hasSeenGlobalTour: boolean
    hasSeenFirstRunWelcome: boolean
    completedTourSteps: string[]
    completedPageTours: string[]
    dismissedHints: string[]
    dismissedPageTours: string[]
    dismissedOperationHints: string[]
    preferredHelpMode: 'tour' | 'guide' | 'both'
    lastTourVersion: string | null
    lastOnboardingVersion: string | null
    helpLevel: 'minimal' | 'guided' | 'detailed'
    actionGuideIntroSeen: boolean
    actionCenterIntroSeen: boolean
    actionGuideDismissed: boolean
    dismissedFieldHelpers: string[]
    lockedFieldHintsDismissed: string[]
  }
  modules?: Array<{
    key: string
    name: string
    enabled: boolean
    licensed: boolean
    setupComplete: boolean
    status: 'available' | 'disabled' | 'unlicensed' | 'setup_required' | 'dependency_missing'
    permissions: string[]
    actions: Array<Record<string, unknown>>
    routes: Array<Record<string, unknown>>
    warnings: string[]
  }>
  permissions?: {
    effectivePermissions: string[]
    permissionFallbacks: Record<string, string[]>
  }
  policy?: {
    availableModules: string[]
    availableActions: Array<{
      moduleKey: string
      actionKey: string
      canStart: boolean
      warnings: string[]
    }>
    deniedActions?: Array<Record<string, unknown>>
  }
}
