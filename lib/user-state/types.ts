export type UiThemePreference = 'system' | 'light' | 'dark'
export type UiDensityPreference = 'comfortable' | 'compact'

export interface UserUiPreferences {
  theme: UiThemePreference
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
  completedTourSteps: string[]
  dismissedPageTours: string[]
  dismissedOperationHints: string[]
  preferredHelpMode: 'tour' | 'guide' | 'both'
  lastTourVersion: string | null
  actionGuideDismissed: boolean
  dismissedFieldHelpers: string[]
  lockedFieldHintsDismissed: string[]
}

export type UserUiPreferencesPatch = Partial<{
  theme: unknown
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
  completedTourSteps: unknown
  dismissedPageTours: unknown
  dismissedOperationHints: unknown
  preferredHelpMode: unknown
  lastTourVersion: unknown
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
    completedTourSteps: string[]
    dismissedPageTours: string[]
    dismissedOperationHints: string[]
    preferredHelpMode: 'tour' | 'guide' | 'both'
    lastTourVersion: string | null
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
