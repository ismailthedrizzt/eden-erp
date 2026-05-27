// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: setup
// TARGET_ENDPOINT: /api/v1/setup/readiness
// NOTES: Readiness core should move to Python; Next route remains setup UI proxy.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantReadiness } from '@/lib/setup/tenantReadinessService'
import { getSetupActionsForModule } from '@/lib/setup/setupActionResolver'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['settings.view', 'settings.modulesManage', 'settings.edit'])
  if (access instanceof NextResponse) return access

  const tenantContext = resolveTenantContext(request)
  const readiness = await getTenantReadiness(supabase as any, tenantContext)
  return NextResponse.json({
    data: {
      ...readiness,
      modules: readiness.modules.map(module => ({
        ...module,
        setupActions: getSetupActionsForModule(module.moduleKey, module),
      })),
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
