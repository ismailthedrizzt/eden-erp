import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireModuleAvailable } from '@/lib/modules/moduleGuards'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import type { ProcessDefinition, ProcessInstance } from './process.types'

export async function requireProcessStartAccess(
  request: NextRequest,
  supabase: SupabaseClient,
  definition: ProcessDefinition
) {
  const moduleGuard = await requireModuleAvailable(request, definition.moduleKey)
  if (moduleGuard) return moduleGuard

  const permissions = [definition.startPermission, definition.fallbackPermission].filter(Boolean) as string[]
  if (!permissions.length) {
    return NextResponse.json({
      error: 'Bu sureci baslatmak icin yetki tanimi bulunamadi.',
      code: 'PROCESS_PERMISSION_REQUIRED',
    }, { status: 403 })
  }

  return requireAnyPermission(request, supabase, permissions)
}

export async function requireProcessMutationAccess(
  request: NextRequest,
  supabase: SupabaseClient,
  definition: ProcessDefinition
) {
  const permissions = [
    definition.startPermission,
    definition.fallbackPermission,
    definition.cancelPolicy?.permission,
    definition.cancelPolicy?.fallbackPermission,
    'companies.edit',
  ].filter(Boolean) as string[]
  return requireAnyPermission(request, supabase, permissions)
}

export function assertProcessBelongsToDefinition(instance: ProcessInstance, definition: ProcessDefinition) {
  return instance.process_key === definition.key && instance.process_version === definition.version
}
