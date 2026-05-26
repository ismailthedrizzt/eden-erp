import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_SESSION_COOKIE_NAME, verifyAppSessionToken } from '@/lib/auth/appSession'
import { DEFAULT_TENANT_ID } from '@/lib/tenancy/constants'
import { resolveTenantContext } from '@/lib/tenancy/server'
import {
  expandPermissionFallbacks,
  hasAnyPermission as registryHasAnyPermission,
  resolvePermissionWithFallback as registryResolvePermissionWithFallback,
} from './permissionRegistry'

const LOGIN_BYPASS_ENABLED = process.env.EDEN_LOGIN_DISABLED === 'true'

export type PermissionContext = {
  userId: string | null
  tenantId?: string
  requiredPermissions?: string[]
  checkedPermissions?: string[]
  matchedPermission?: string
}

export async function requirePermission(
  request: NextRequest,
  supabase: SupabaseClient,
  permissionKey: string
): Promise<PermissionContext | NextResponse> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const appSession = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)
  const tenantContext = resolveTenantContext(request)
  const tenantId = tenantContext.source === 'default' && appSession?.tenantId
    ? appSession.tenantId
    : tenantContext.tenantId

  if (LOGIN_BYPASS_ENABLED) return { userId: null, tenantId }

  if (appSession) {
    if (!appSession.userId) {
      return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 })
    }

    const tenantAccess = await validateTenantMembership(supabase, appSession.userId, tenantId)
    if (tenantAccess instanceof NextResponse) return tenantAccess

    const hasPermission = await userHasPermissionSafe(supabase, appSession.userId, tenantId, permissionKey, tenantAccess.roleKey)
    if (hasPermission instanceof NextResponse) return hasPermission
    if (!hasPermission && process.env.EDEN_ALLOW_LEGACY_API_ACCESS !== 'true') {
      return NextResponse.json({ error: 'Permission denied', code: 'PERMISSION_DENIED' }, { status: 403 })
    }

    return { userId: appSession.userId, tenantId }
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
  const hasPermission = await userHasPermissionSafe(supabase, userId, tenantId, permissionKey)
  if (hasPermission instanceof NextResponse) return hasPermission

  if (!hasPermission && process.env.EDEN_ALLOW_LEGACY_API_ACCESS !== 'true') {
    return NextResponse.json({ error: 'Permission denied', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  return { userId, tenantId }
}

export async function requireAnyPermission(
  request: NextRequest,
  supabase: SupabaseClient,
  permissionKeys: string[]
): Promise<PermissionContext | NextResponse> {
  const requiredPermissions = permissionKeys
  const checkedPermissions = expandPermissionFallbacks(permissionKeys)
  let lastForbidden: NextResponse | null = null

  for (const key of checkedPermissions) {
    const result = await requirePermission(request, supabase, key)
    if (!(result instanceof NextResponse)) {
      return {
        ...result,
        requiredPermissions,
        checkedPermissions,
        matchedPermission: key,
      }
    }
    if (result.status !== 403) return result
    lastForbidden = result
  }

  if (lastForbidden || checkedPermissions.length) {
    return NextResponse.json({
      error: 'Bu islemi yapmak icin gerekli yetkiniz bulunmuyor.',
      code: 'PERMISSION_DENIED',
      details: {
        required_permissions: requiredPermissions,
        checked_permissions: checkedPermissions,
      },
    }, { status: 403 })
  }

  return NextResponse.json({
    error: 'Bu islem icin yetki tanimi bulunamadi.',
    code: 'PERMISSION_REQUIRED',
    details: { required_permissions: [], checked_permissions: [] },
  }, { status: 403 })
}

export function hasAnyPermission(userPermissions: string[] | undefined, permissionKeys: string[]) {
  return registryHasAnyPermission(userPermissions, permissionKeys)
}

export function resolvePermissionWithFallback(permissionKey: string) {
  return registryResolvePermissionWithFallback(permissionKey)
}

export async function listUserEffectivePermissions(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<PermissionContext & { permissions: string[]; roleKey?: string | null } | NextResponse> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const appSession = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)
  const tenantContext = resolveTenantContext(request)
  const tenantId = tenantContext.source === 'default' && appSession?.tenantId
    ? appSession.tenantId
    : tenantContext.tenantId

  if (LOGIN_BYPASS_ENABLED) {
    return { userId: null, tenantId, permissions: ['__eden_demo_allow_all__'], roleKey: null }
  }

  if (appSession) {
    if (!appSession.userId) {
      return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 })
    }

    const tenantAccess = await validateTenantMembership(supabase, appSession.userId, tenantId)
    if (tenantAccess instanceof NextResponse) return tenantAccess

    const permissions = await fetchUserPermissionKeysSafe(supabase, appSession.userId, tenantId, tenantAccess.roleKey)
    if (permissions instanceof NextResponse) return permissions
    return { userId: appSession.userId, tenantId, permissions, roleKey: tenantAccess.roleKey }
  }

  if (!token) {
    if (process.env.EDEN_ALLOW_LEGACY_API_ACCESS === 'true') {
      return { userId: null, tenantId, permissions: ['__eden_demo_allow_all__'], roleKey: null }
    }
    return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Invalid session', code: 'INVALID_SESSION' }, { status: 401 })
  }

  const userId = userData.user.id
  const permissions = await fetchUserPermissionKeysSafe(supabase, userId, tenantId)
  if (permissions instanceof NextResponse) return permissions
  return { userId, tenantId, permissions, roleKey: null }
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

async function fetchUserPermissionKeysSafe(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  membershipRoleKey?: string | null
) {
  try {
    return await fetchUserPermissionKeys(supabase, userId, tenantId, membershipRoleKey)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Permission list failed', code: 'PERMISSION_LIST_FAILED' },
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

async function fetchUserPermissionKeys(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
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
      return fetchLegacyUserPermissionKeys(supabase, userId)
    }
    throw new Error(error.message)
  }

  const permissions = new Set<string>()
  collectPermissionKeys(data || [], permissions)

  if (membershipRoleKey) {
    const rolePermissionResult = await supabase
      .from('roles')
      .select('role_permissions(permission:permissions(permission_key))')
      .eq('role_key', membershipRoleKey)
      .eq('status', 'active')
      .maybeSingle()

    if (rolePermissionResult.error) {
      if (!isMissingTenantFoundationError(rolePermissionResult.error)) {
        throw new Error(rolePermissionResult.error.message)
      }
    } else {
      collectPermissionKeys([rolePermissionResult.data], permissions)
    }
  }

  return Array.from(permissions)
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

async function fetchLegacyUserPermissionKeys(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role:roles(role_permissions(permission:permissions(permission_key)))')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    if (isMissingTenantFoundationError(error)) return []
    throw new Error(error.message)
  }

  const permissions = new Set<string>()
  collectPermissionKeys(data || [], permissions)
  return Array.from(permissions)
}

function collectPermissionKeys(rows: any[], target: Set<string>) {
  for (const entry of rows || []) {
    const rolePermissions = entry?.role?.role_permissions || entry?.role_permissions || []
    for (const rolePermission of rolePermissions) {
      const key = rolePermission?.permission?.permission_key
      if (key) target.add(String(key))
    }
  }
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
