// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: setup
// TARGET_FASTAPI_ENDPOINT: /api/v1/setup/readiness
// NOTES: Canonical readiness is FastAPI; TS fallback remains a migration bridge.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantReadiness } from '@/lib/setup/tenantReadinessService'
import { getSetupActionsForModule } from '@/lib/setup/setupActionResolver'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['settings.view', 'settings.modulesManage', 'settings.edit'])
  if (access instanceof NextResponse) return access

  const fastApiResponse = await proxyToFastApi(request, '/api/v1/setup/readiness')
  if (fastApiResponse) return fastApiResponse

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
