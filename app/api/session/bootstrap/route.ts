import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_UI_PREFERENCES } from '@/lib/user-state/default-ui-preferences'
import {
  fetchWorkspaceSummary,
  getAuthenticatedWorkspaceContext,
  getClientIp,
  getUserAgent,
  mapUserStateForResponse,
  SYSTEM_TOUR_VERSION,
} from '@/lib/user-state/server'
import {
  buildSessionModules,
  listAvailableActions,
  loadModuleFeatureContext,
} from '@/lib/modules/moduleFeatureResolver'
import { permissionFallbacks } from '@/lib/security/permissionRegistry'
import { listUserEffectivePermissions } from '@/lib/security/serverPermissions'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedWorkspaceContext(request)
  if (context instanceof NextResponse) return context

  const { supabase, userId, workspaceId } = context

  try {
    const [bootstrapResult, workspace, moduleContext, permissionContext] = await Promise.all([
      supabase.rpc('bootstrap_user_workspace_state', {
        p_user_id: userId,
        p_workspace_id: workspaceId,
        p_intro_version: SYSTEM_TOUR_VERSION,
        p_ui_defaults: DEFAULT_UI_PREFERENCES,
        p_ip_address: getClientIp(request),
        p_user_agent: getUserAgent(request),
      }),
      fetchWorkspaceSummary(supabase, workspaceId),
      loadModuleFeatureContext(supabase, { tenantId: workspaceId }).catch(() => ({ moduleLicenses: [] })),
      listUserEffectivePermissions(request, supabase).catch(() => ({ permissions: [] })),
    ])

    if (bootstrapResult.error) {
      return NextResponse.json(
        { error: bootstrapResult.error.message, code: 'SESSION_BOOTSTRAP_FAILED' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const row = Array.isArray(bootstrapResult.data) ? bootstrapResult.data[0] : bootstrapResult.data
    const state = row?.state

    if (!state) {
      return NextResponse.json(
        { error: 'Kullanici durumu hazirlanamadi.', code: 'USER_STATE_NOT_FOUND' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    const effectivePermissions = permissionContext instanceof NextResponse ? [] : permissionContext.permissions || []
    const policyModuleContext = {
      ...moduleContext,
      userPermissions: effectivePermissions,
    }
    const sessionModules = buildSessionModules(policyModuleContext)
    const availableActions = listAvailableActions(policyModuleContext)

    return NextResponse.json(
      {
        workspace,
        userState: mapUserStateForResponse(state, Boolean(row?.is_first_login)),
        modules: sessionModules,
        permissions: {
          effectivePermissions,
          permissionFallbacks,
        },
        policy: {
          availableModules: sessionModules.filter(module => module.status === 'available').map(module => module.key),
          availableActions: availableActions.map(item => ({
            moduleKey: item.moduleKey,
            actionKey: item.action.key,
            canStart: item.can_start_now,
            warnings: item.warnings,
          })),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Oturum hazirligi tamamlanamadi.',
        code: 'SESSION_BOOTSTRAP_FAILED',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
