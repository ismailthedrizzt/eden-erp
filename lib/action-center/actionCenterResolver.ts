import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { fetchScopedCompanyIds } from '@/lib/tenancy/companyScopes'
import { listUserEffectivePermissions } from '@/lib/security/serverPermissions'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'
import { canSeeSystemActionItems } from './actionCenterGuards'
import type { ActionCenterContext } from './actionCenter.types'

export async function buildActionCenterContext(request: NextRequest): Promise<ActionCenterContext | NextResponse> {
  const workspace = await getAuthenticatedWorkspaceContext(request)
  if (workspace instanceof NextResponse) return workspace

  const permissionContext = await listUserEffectivePermissions(request, workspace.supabase as any)
  if (permissionContext instanceof NextResponse) return permissionContext

  const scopedCompanyIds = await fetchScopedCompanyIds(workspace.supabase as any, workspace.workspaceId).catch(() => [])
  const permissions = permissionContext.permissions || []
  return {
    supabase: workspace.supabase as any,
    tenantId: workspace.workspaceId,
    userId: workspace.userId,
    permissions,
    scopedCompanyIds,
    isSystemUser: canSeeSystemActionItems({ permissions, isSystemUser: false }),
  }
}

export function parseActionCenterQuery(searchParams: URLSearchParams) {
  const page = toPositiveInteger(searchParams.get('page'), 1)
  const pageSize = Math.min(toPositiveInteger(searchParams.get('pageSize'), 20), 100)
  return {
    module_key: emptyToNull(searchParams.get('module_key')),
    source_type: emptyToNull(searchParams.get('source_type')) as any,
    status: emptyToNull(searchParams.get('status')) as any,
    severity: emptyToNull(searchParams.get('severity')) as any,
    priority: emptyToNull(searchParams.get('priority')) as any,
    company_id: emptyToNull(searchParams.get('company_id')),
    branch_id: emptyToNull(searchParams.get('branch_id')),
    entity_type: emptyToNull(searchParams.get('entity_type')),
    entity_id: emptyToNull(searchParams.get('entity_id')),
    assigned_to_me: searchParams.get('assigned_to_me') === 'true' ? true : undefined,
    page,
    pageSize,
  }
}

function emptyToNull(value: string | null) {
  return value && value.trim() ? value.trim() : null
}

function toPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
