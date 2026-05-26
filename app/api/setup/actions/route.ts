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
  const actions = readiness.modules.flatMap(module =>
    module.ready ? [] : getSetupActionsForModule(module.moduleKey, module).map(action => ({
      ...action,
      moduleKey: module.moduleKey,
      status: module.status,
    }))
  )
  return NextResponse.json({ data: actions }, { headers: { 'Cache-Control': 'no-store' } })
}
