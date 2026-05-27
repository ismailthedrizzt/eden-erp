// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: process
// TARGET_FASTAPI_ENDPOINT: /api/v1/processes/{process_id}
// NOTES: Process detail should be served by Python; TS fallback remains a migration bridge.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { ProcessInstanceService } from '@/lib/process/processInstanceService'
import { ProcessTaskService } from '@/lib/process/processTaskService'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fastApiResponse = await proxyToFastApi(request, `/api/v1/processes/${id}`)
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()
  const permission = await requireAnyPermission(request, supabase, ['companies.view', 'branches.view', 'partners.view', 'representatives.view'])
  if (permission instanceof Response) return permission

  const tenantContext = resolveTenantContext(request)
  try {
    const instances = new ProcessInstanceService(supabase as any, tenantContext)
    const tasks = new ProcessTaskService(supabase as any, tenantContext)
    const process = await instances.get(id)
    if (!process) return NextResponse.json({ error: 'Surec kaydi bulunamadi.', code: 'PROCESS_NOT_FOUND' }, { status: 404 })
    return NextResponse.json({
      data: {
        process,
        tasks: await tasks.listProcessTasks(id),
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) {
      return NextResponse.json({ error: 'Surec motoru altyapisi bu calisma alaninda henuz hazir degil.', code: 'PROCESS_INFRASTRUCTURE_MISSING' }, { status: 501 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'PROCESS_FETCH_FAILED' }, { status: 500 })
  }
}
