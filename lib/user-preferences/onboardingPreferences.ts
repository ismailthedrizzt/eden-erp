import 'server-only'

import { DEFAULT_UI_PREFERENCES } from '@/lib/user-state/default-ui-preferences'
import { mergeUiPreferences } from '@/lib/user-state/merge-ui-preferences'
import type { ServiceSupabase } from '@/lib/user-state/server'
import type { UserUiPreferences } from '@/lib/user-state/types'

export type OnboardingPreferences = Pick<
  UserUiPreferences,
  | 'hasSeenGlobalTour'
  | 'hasSeenFirstRunWelcome'
  | 'completedTourSteps'
  | 'completedPageTours'
  | 'dismissedHints'
  | 'dismissedPageTours'
  | 'dismissedOperationHints'
  | 'preferredHelpMode'
  | 'lastTourVersion'
  | 'lastOnboardingVersion'
  | 'helpLevel'
  | 'actionGuideIntroSeen'
  | 'actionCenterIntroSeen'
  | 'actionGuideDismissed'
  | 'dismissedFieldHelpers'
  | 'lockedFieldHintsDismissed'
>

export async function getOnboardingPreferences(
  supabase: ServiceSupabase,
  userId: string,
  tenantId: string
): Promise<OnboardingPreferences> {
  const { data, error } = await supabase
    .from('user_workspace_state')
    .select('ui_preferences')
    .eq('user_id', userId)
    .eq('workspace_id', tenantId)
    .maybeSingle()

  if (error) return toOnboardingPreferences(DEFAULT_UI_PREFERENCES)
  return toOnboardingPreferences(mergeUiPreferences(DEFAULT_UI_PREFERENCES, data?.ui_preferences))
}

export async function markGlobalTourCompleted(
  supabase: ServiceSupabase,
  userId: string,
  tenantId: string,
  version: string
) {
  return mergeOnboardingPatch(supabase, userId, tenantId, {
    hasSeenGlobalTour: true,
    lastTourVersion: version,
  })
}

export async function dismissPageTour(
  supabase: ServiceSupabase,
  userId: string,
  tenantId: string,
  pageKey: string
) {
  const current = await getOnboardingPreferences(supabase, userId, tenantId)
  return mergeOnboardingPatch(supabase, userId, tenantId, {
    dismissedPageTours: addUnique(current.dismissedPageTours, pageKey),
  })
}

export async function dismissOperationHint(
  supabase: ServiceSupabase,
  userId: string,
  tenantId: string,
  hintKey: string
) {
  const current = await getOnboardingPreferences(supabase, userId, tenantId)
  return mergeOnboardingPatch(supabase, userId, tenantId, {
    dismissedOperationHints: addUnique(current.dismissedOperationHints, hintKey),
  })
}

export async function resetTour(
  supabase: ServiceSupabase,
  userId: string,
  tenantId: string
) {
  return mergeOnboardingPatch(supabase, userId, tenantId, {
    hasSeenGlobalTour: false,
    hasSeenFirstRunWelcome: false,
    completedTourSteps: [],
    completedPageTours: [],
    dismissedHints: [],
    dismissedPageTours: [],
    dismissedOperationHints: [],
    actionGuideIntroSeen: false,
    actionCenterIntroSeen: false,
    actionGuideDismissed: false,
    dismissedFieldHelpers: [],
    lockedFieldHintsDismissed: [],
    lastTourVersion: null,
    lastOnboardingVersion: null,
    helpLevel: 'guided',
  })
}

export function toOnboardingPreferences(preferences: UserUiPreferences): OnboardingPreferences {
  return {
    hasSeenGlobalTour: preferences.hasSeenGlobalTour,
    hasSeenFirstRunWelcome: preferences.hasSeenFirstRunWelcome,
    completedTourSteps: preferences.completedTourSteps,
    completedPageTours: preferences.completedPageTours,
    dismissedHints: preferences.dismissedHints,
    dismissedPageTours: preferences.dismissedPageTours,
    dismissedOperationHints: preferences.dismissedOperationHints,
    preferredHelpMode: preferences.preferredHelpMode,
    lastTourVersion: preferences.lastTourVersion,
    lastOnboardingVersion: preferences.lastOnboardingVersion,
    helpLevel: preferences.helpLevel,
    actionGuideIntroSeen: preferences.actionGuideIntroSeen,
    actionCenterIntroSeen: preferences.actionCenterIntroSeen,
    actionGuideDismissed: preferences.actionGuideDismissed,
    dismissedFieldHelpers: preferences.dismissedFieldHelpers,
    lockedFieldHintsDismissed: preferences.lockedFieldHintsDismissed,
  }
}

async function mergeOnboardingPatch(
  supabase: ServiceSupabase,
  userId: string,
  tenantId: string,
  patch: Partial<UserUiPreferences>
) {
  const { data, error } = await supabase.rpc('merge_user_workspace_ui_preferences', {
    p_user_id: userId,
    p_workspace_id: tenantId,
    p_patch: patch,
    p_ui_defaults: DEFAULT_UI_PREFERENCES,
  })

  if (error) throw new Error(error.message)
  const state = Array.isArray(data) ? data[0] : data
  return toOnboardingPreferences(mergeUiPreferences(DEFAULT_UI_PREFERENCES, state?.ui_preferences))
}

function addUnique(values: string[], value: string) {
  const normalized = value.trim()
  if (!normalized) return values
  return Array.from(new Set([...values, normalized]))
}
