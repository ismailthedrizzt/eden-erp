import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_UI_PREFERENCES } from '@/lib/user-state/default-ui-preferences'
import { mergeUiPreferences, normalizeUiPreferencesPatch } from '@/lib/user-state/merge-ui-preferences'
import {
  getAuthenticatedWorkspaceContext,
  getClientIp,
  getUserAgent,
  safeInsertSystemEvent,
} from '@/lib/user-state/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedWorkspaceContext(request)
  if (context instanceof NextResponse) return context

  const { supabase, userId, workspaceId } = context
  const { data, error } = await supabase
    .from('user_workspace_state')
    .select('ui_preferences')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message, code: 'USER_PREFERENCES_READ_FAILED' }, { status: 500 })
  }

  return NextResponse.json({
    uiPreferences: mergeUiPreferences(DEFAULT_UI_PREFERENCES, data?.ui_preferences),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: NextRequest) {
  const context = await getAuthenticatedWorkspaceContext(request)
  if (context instanceof NextResponse) return context

  const body = await request.json().catch(() => ({}))
  const patch = normalizeUiPreferencesPatch(body.uiPreferences ?? body)

  const { supabase, userId, workspaceId } = context
  const { data, error } = await supabase.rpc('merge_user_workspace_ui_preferences', {
    p_user_id: userId,
    p_workspace_id: workspaceId,
    p_patch: patch,
    p_ui_defaults: DEFAULT_UI_PREFERENCES,
  })

  if (error) {
    return NextResponse.json({ error: error.message, code: 'USER_PREFERENCES_UPDATE_FAILED' }, { status: 500 })
  }

  const state = Array.isArray(data) ? data[0] : data
  const uiPreferences = mergeUiPreferences(DEFAULT_UI_PREFERENCES, state?.ui_preferences)

  await safeInsertSystemEvent(supabase, {
    workspaceId,
    actorUserId: userId,
    eventType: 'USER_UI_PREFERENCES_UPDATED',
    metadata: { keys: Object.keys(patch) },
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  })

  return NextResponse.json({ uiPreferences }, { headers: { 'Cache-Control': 'no-store' } })
}
