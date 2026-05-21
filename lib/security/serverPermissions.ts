import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const LOGIN_BYPASS_ENABLED = process.env.EDEN_LOGIN_DISABLED === 'true'

export async function requirePermission(
  request: NextRequest,
  supabase: SupabaseClient,
  permissionKey: string
): Promise<{ userId: string | null } | NextResponse> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const isDemo = request.cookies.get('demo_auth')?.value === 'true'

  if (isDemo || LOGIN_BYPASS_ENABLED) return { userId: null }

  if (!token) {
    if (process.env.EDEN_ALLOW_LEGACY_API_ACCESS === 'true') return { userId: null }
    return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 })
  }

  const userId = userData.user.id
  const { data, error } = await supabase
    .from('user_roles')
    .select('role:roles(role_permissions(permission:permissions(permission_key)))')
    .eq('user_id', userId)

  if (error) {
    if (process.env.EDEN_ALLOW_LEGACY_API_ACCESS === 'true') return { userId }
    return NextResponse.json({ error: error.message, code: 'PERMISSION_CHECK_FAILED' }, { status: 500 })
  }

  const hasPermission = (data || []).some((entry: any) =>
    entry.role?.role_permissions?.some((rolePermission: any) => rolePermission.permission?.permission_key === permissionKey)
  )

  if (!hasPermission && process.env.EDEN_ALLOW_LEGACY_API_ACCESS !== 'true') {
    return NextResponse.json({ error: 'Permission denied', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  return { userId }
}
