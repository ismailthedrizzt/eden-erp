import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PERMISSIONS } from '@/packages/shared/src'
import { requirePermission } from './serverPermissions'

export const permissionRegistry = {
  companies: {
    view: PERMISSIONS.companies.view,
    edit: PERMISSIONS.companies.edit,
    openingStart: PERMISSIONS.companies.openingStart,
    liquidationStart: PERMISSIONS.companies.liquidationStart,
    deregistrationStart: PERMISSIONS.companies.deregistrationStart,
  },
  branches: {
    view: PERMISSIONS.branches.view,
    edit: PERMISSIONS.branches.edit,
    openingStart: PERMISSIONS.branches.openingStart,
    closingStart: PERMISSIONS.branches.closingStart,
    documentsUpdate: PERMISSIONS.branches.documentsUpdate,
  },
  partners: {
    view: 'partners.view',
    edit: 'partners.edit',
    ownershipStart: 'partners.ownership.start',
    ownershipUpdate: 'partners.ownership.update',
  },
  representatives: {
    view: 'representatives.view',
    edit: 'representatives.edit',
    authorityStart: 'representatives.authority.start',
    authorityTerminate: 'representatives.authority.terminate',
    authorityUpdate: 'representatives.authority.update',
  },
} as const

export const permissionFallbacks: Record<string, string[]> = {
  [permissionRegistry.branches.view]: [permissionRegistry.companies.view],
  [permissionRegistry.branches.edit]: [permissionRegistry.companies.edit],
  [permissionRegistry.branches.openingStart]: [permissionRegistry.companies.edit],
  [permissionRegistry.branches.closingStart]: [permissionRegistry.companies.edit],
  [permissionRegistry.branches.documentsUpdate]: [permissionRegistry.companies.edit],
}

export function expandPermissionFallbacks(permissionKeys: string[]) {
  return Array.from(new Set(permissionKeys.flatMap(key => [key, ...(permissionFallbacks[key] || [])])))
}

export function hasAnyPermission(userPermissions: string[] | undefined, permissionKeys: string[]) {
  const permissions = new Set(userPermissions || [])
  if (permissions.has('__eden_demo_allow_all__')) return true
  return expandPermissionFallbacks(permissionKeys).some(key => permissions.has(key))
}

export async function requireAnyPermission(
  request: NextRequest,
  supabase: SupabaseClient,
  permissionKeys: string[]
) {
  const keys = expandPermissionFallbacks(permissionKeys)
  let lastForbidden: NextResponse | null = null

  for (const key of keys) {
    const result = await requirePermission(request, supabase, key)
    if (!(result instanceof NextResponse)) return result
    if (result.status !== 403) return result
    lastForbidden = result
  }

  return lastForbidden || NextResponse.json({ error: 'Permission denied', code: 'PERMISSION_DENIED' }, { status: 403 })
}
