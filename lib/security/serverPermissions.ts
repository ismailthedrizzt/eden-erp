import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_SESSION_COOKIE_NAME, verifyAppSessionToken } from '@/lib/auth/appSession'
import { DEFAULT_TENANT_ID } from '@/lib/tenancy/constants'
import { resolveTenantContext } from '@/lib/tenancy/server'

const LOGIN_BYPASS_ENABLED = process.env.EDEN_LOGIN_DISABLED === 'true'

type PermissionContext = {
  userId: string | null
  tenantId?: string
}

export async function requirePermission(
  request: NextRequest,
  supabase: SupabaseClient,
  permissionKey: string
): Promise<PermissionContext | NextResponse> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const appSession = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)
  const tenantContext = resolveTenantContext(request)

  if (LOGIN_BYPASS_ENABLED) return { userId: null, tenantId: tenantContext.tenantId }

  if (appSession) {
    if (!appSession.userId) {
      return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 })
    }

    const tenantAccess = await validateTenantMembership(supabase, appSession.userId, tenantContext.tenantId)
    if (tenantAccess instanceof NextResponse) return tenantAccess

    const hasPermission = await userHasPermissionSafe(supabase, appSession.userId, tenantContext.tenantId, permissionKey, tenantAccess.roleKey)
    if (hasPermission instanceof NextResponse) return hasPermission
    if (!hasPermission && process.env.EDEN_ALLOW_LEGACY_API_ACCESS !== 'true') {
      return NextResponse.json({ error: 'Permission denied', code: 'PERMISSION_DENIED' }, { status: 403 })
    }

    return { userId: appSession.userId, tenantId: tenantContext.tenantId }
  }

  if (!token) {
    if (process.env.EDEN_ALLOW_LEGACY_API_ACCESS === 'true') return { userId: null }
    return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 })
  }

  const userId = userData.user.id
  const hasPermission = await userHasPermissionSafe(supabase, userId, tenantContext.tenantId, permissionKey)
  if (hasPermission instanceof NextResponse) return hasPermission

  if (!hasPermission && process.env.EDEN_ALLOW_LEGACY_API_ACCESS !== 'true') {
    return NextResponse.json({ error: 'Permission denied', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  return { userId, tenantId: tenantContext.tenantId }
}

async function userHasPermissionSafe(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  permissionKey: string,
  membershipRoleKey?: string | null
) {
  try {
    return await userHasPermission(supabase, userId, tenantId, permissionKey, membershipRoleKey)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' },
      { status: 500 }
    )
  }
}

async function validateTenantMembership(supabase: SupabaseClient, userId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('id,role_key,status')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    if (isMissingTenantFoundationError(error) && tenantId === DEFAULT_TENANT_ID) return { roleKey: null }
    return NextResponse.json({ error: error.message, code: 'TENANT_ACCESS_CHECK_FAILED' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Tenant access denied', code: 'TENANT_ACCESS_DENIED' }, { status: 403 })
  }

  return { roleKey: data.role_key as string | null }
}

async function userHasPermission(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  permissionKey: string,
  membershipRoleKey?: string | null
) {
  const tenantIds = Array.from(new Set([tenantId, tenantId === DEFAULT_TENANT_ID ? null : DEFAULT_TENANT_ID].filter(Boolean))) as string[]
  const { data, error } = await supabase
    .from('user_roles')
    .select('role:roles(role_permissions(permission:permissions(permission_key)))')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('instance_id', tenantIds)

  if (error) {
    if (isMissingTenantFoundationError(error)) {
      return userHasLegacyPermission(supabase, userId, permissionKey)
    }
    throw new Error(error.message)
  }

  const hasPermission = (data || []).some((entry: any) =>
    entry.role?.role_permissions?.some((rolePermission: any) => rolePermission.permission?.permission_key === permissionKey)
  )
  if (hasPermission) return true

  if (!membershipRoleKey) return false

  const rolePermissionResult = await supabase
    .from('roles')
    .select('role_permissions(permission:permissions(permission_key))')
    .eq('role_key', membershipRoleKey)
    .eq('status', 'active')
    .maybeSingle()

  if (rolePermissionResult.error) {
    if (isMissingTenantFoundationError(rolePermissionResult.error)) return false
    throw new Error(rolePermissionResult.error.message)
  }

  return !!rolePermissionResult.data?.role_permissions?.some((rolePermission: any) =>
    rolePermission.permission?.permission_key === permissionKey
  )
}

async function userHasLegacyPermission(supabase: SupabaseClient, userId: string, permissionKey: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role:roles(role_permissions(permission:permissions(permission_key)))')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    if (isMissingTenantFoundationError(error)) return false
    throw new Error(error.message)
  }

  return (data || []).some((entry: any) =>
    entry.role?.role_permissions?.some((rolePermission: any) => rolePermission.permission?.permission_key === permissionKey)
  )
}

function isMissingTenantFoundationError(error: { code?: string; message?: string } | null) {
  const message = error?.message || ''
  return error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('Could not find')
}
