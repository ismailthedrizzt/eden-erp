import type { UserUiPreferences } from './types'

export const DEFAULT_UI_PREFERENCES: UserUiPreferences = {
  theme: 'system',
  accentColor: 'emerald',
  sidebarCollapsed: false,
  density: 'comfortable',
  language: 'tr',
  dateFormat: 'dd.MM.yyyy',
  timeFormat: '24h',
  defaultLandingPage: '/dashboard',
  tablePreferences: {},
  dismissedHints: [],
  hasSeenGlobalTour: false,
  completedTourSteps: [],
  dismissedPageTours: [],
  dismissedOperationHints: [],
  preferredHelpMode: 'both',
  lastTourVersion: null,
}
