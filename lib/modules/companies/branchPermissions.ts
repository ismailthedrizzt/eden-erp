import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAnyPermission } from '@/lib/security/permissionRegistry'
import { PERMISSIONS } from '@/packages/shared/src'

type PermissionContext = {
  userId: string | null
  tenantId?: string
}

export const BRANCH_PERMISSIONS = {
  view: PERMISSIONS.branches.view,
  edit: PERMISSIONS.branches.edit,
  openingStart: PERMISSIONS.branches.openingStart,
  closingStart: PERMISSIONS.branches.closingStart,
  documentsUpdate: PERMISSIONS.branches.documentsUpdate,
} as const

export async function requireBranchPermission(
  request: NextRequest,
  supabase: SupabaseClient,
  permissionKey: string,
  fallbackPermissionKey: string
): Promise<PermissionContext | NextResponse> {
  return requireAnyPermission(request, supabase, [permissionKey, fallbackPermissionKey])
}
