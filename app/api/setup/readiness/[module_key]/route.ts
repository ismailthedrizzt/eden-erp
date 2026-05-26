import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { getModuleReadiness } from '@/lib/setup/tenantReadinessService'
import { getSetupActionsForModule } from '@/lib/setup/setupActionResolver'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module_key: string }> }
) {
  const { module_key: moduleKey } = await params
  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['settings.view', 'settings.modulesManage', 'settings.edit'])
  if (access instanceof NextResponse) return access

  const tenantContext = resolveTenantContext(request)
  const readiness = await getModuleReadiness(supabase as any, tenantContext, moduleKey)
  return NextResponse.json({
    data: {
      ...readiness,
      setupActions: getSetupActionsForModule(moduleKey, readiness),
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
