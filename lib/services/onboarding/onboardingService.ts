'use client'

import { apiClient } from '@/lib/api/apiClient'

export type ApiEnvelope<T> = {
  data: T
  message?: string | null
  warnings?: string[]
}

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped'
export type OnboardingItemStatus = 'completed' | 'current' | 'pending' | 'warning' | 'blocked'
export type HelpLevel = 'minimal' | 'guided' | 'detailed'
export type PreferredHelpMode = 'tour' | 'guide' | 'both'

export type WorkspaceOnboardingState = {
  id?: string | null
  tenant_id?: string | null
  onboarding_version: string
  status: OnboardingStatus
  first_login_at?: string | null
  completed_at?: string | null
  skipped_at?: string | null
  current_step?: string | null
  completed_steps: string[]
  dismissed_steps: string[]
  recommended_steps: OnboardingChecklistItem[]
  workspace_profile: Record<string, unknown>
  selected_module_packages: string[]
  created_at?: string | null
  updated_at?: string | null
}

export type UserOnboardingState = {
  hasSeenGlobalTour: boolean
  hasSeenFirstRunWelcome: boolean
  completedTourSteps: string[]
  completedPageTours: string[]
  dismissedHints: string[]
  preferredHelpMode: PreferredHelpMode
  actionGuideIntroSeen: boolean
  actionCenterIntroSeen: boolean
  lastOnboardingVersion?: string | null
  helpLevel: HelpLevel
}

export type OnboardingChecklistItem = {
  key: string
  title: string
  description: string
  status: OnboardingItemStatus
  action_label: string
  target_page: string
  disabled_reason?: string | null
}

export type ModulePackageRecommendation = {
  key: string
  label: string
  modules: string[]
  description: string
}

export type OnboardingOverview = {
  workspace_state: WorkspaceOnboardingState
  user_state: UserOnboardingState
  recommended_steps: OnboardingChecklistItem[]
  readiness_summary: {
    ready: boolean
    status: string
    blocking_modules: string[]
    warning_count: number
    modules: Array<{
      module_key: string
      ready: boolean
      status: string
      blocking_reasons: string[]
      warnings: string[]
      setup_steps: string[]
    }>
  }
  company_summary: {
    total: number
    draft: number
    active: number
  }
  module_packages: ModulePackageRecommendation[]
  next_action?: OnboardingChecklistItem | null
  should_show_welcome: boolean
}

export type WorkspaceOnboardingPatch = Partial<Pick<
  WorkspaceOnboardingState,
  'status' | 'current_step' | 'completed_steps' | 'dismissed_steps' | 'recommended_steps' | 'workspace_profile' | 'selected_module_packages'
>>

export type UserOnboardingPatch = Partial<UserOnboardingState>

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const onboardingService = {
  async getWorkspace() {
    const response = await apiClient.get<ApiEnvelope<OnboardingOverview>>('/api/onboarding/workspace', {
      useCache: false,
    })
    return unwrap(response)
  },
  async patchWorkspace(patch: WorkspaceOnboardingPatch) {
    const response = await apiClient.patch<ApiEnvelope<WorkspaceOnboardingState>>('/api/onboarding/workspace', patch, {
      useCache: false,
    })
    apiClient.invalidate('/api/onboarding')
    return unwrap(response)
  },
  async completeWorkspaceStep(stepKey: string) {
    const response = await apiClient.post<ApiEnvelope<WorkspaceOnboardingState>>('/api/onboarding/workspace/complete-step', {
      step_key: stepKey,
    }, {
      useCache: false,
    })
    apiClient.invalidate('/api/onboarding')
    return unwrap(response)
  },
  async skipWorkspace() {
    const response = await apiClient.post<ApiEnvelope<WorkspaceOnboardingState>>('/api/onboarding/workspace/skip', {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/onboarding')
    return unwrap(response)
  },
  async resetWorkspace() {
    const response = await apiClient.post<ApiEnvelope<WorkspaceOnboardingState>>('/api/onboarding/workspace/reset', {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/onboarding')
    return unwrap(response)
  },
  async getUser() {
    const response = await apiClient.get<ApiEnvelope<UserOnboardingState>>('/api/onboarding/user', {
      useCache: false,
    })
    return unwrap(response)
  },
  async patchUser(patch: UserOnboardingPatch) {
    const response = await apiClient.patch<ApiEnvelope<UserOnboardingState>>('/api/onboarding/user', patch, {
      useCache: false,
    })
    apiClient.invalidate('/api/onboarding')
    return unwrap(response)
  },
  async completeTour(tourKey = 'global', version?: string | null) {
    const response = await apiClient.post<ApiEnvelope<UserOnboardingState>>('/api/onboarding/user/complete-tour', {
      tour_key: tourKey,
      version,
    }, {
      useCache: false,
    })
    apiClient.invalidate('/api/onboarding')
    return unwrap(response)
  },
  async dismissHint(hintKey: string) {
    const response = await apiClient.post<ApiEnvelope<UserOnboardingState>>('/api/onboarding/user/dismiss-hint', {
      hint_key: hintKey,
    }, {
      useCache: false,
    })
    apiClient.invalidate('/api/onboarding')
    return unwrap(response)
  },
  async resetHelp() {
    const response = await apiClient.post<ApiEnvelope<UserOnboardingState>>('/api/onboarding/user/reset-help', {}, {
      useCache: false,
    })
    apiClient.invalidate('/api/onboarding')
    return unwrap(response)
  },
}
