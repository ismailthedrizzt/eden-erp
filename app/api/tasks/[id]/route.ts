// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: process
// TARGET_FASTAPI_ENDPOINT: /api/v1/tasks/{task_id}
// NOTES: Task detail should be served by Python; TS fallback remains a migration bridge.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { ProcessTaskService } from '@/lib/process/processTaskService'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fastApiResponse = await proxyToFastApi(request, `/api/v1/tasks/${id}`)
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['companies.view', 'branches.view', 'partners.view', 'representatives.view'])
  if (access instanceof Response) return access
  const tenantContext = resolveTenantContext(request)

  try {
    const task = await new ProcessTaskService(supabase as any, tenantContext).get(id)
    if (!task) return NextResponse.json({ error: 'Gorev bulunamadi.', code: 'TASK_NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ data: task }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) return NextResponse.json({ error: 'Surec gorevleri altyapisi henuz hazir degil.', code: 'PROCESS_INFRASTRUCTURE_MISSING' }, { status: 501 })
    return NextResponse.json({ error: error.message, code: error.code || 'TASK_FETCH_FAILED' }, { status: 500 })
  }
}
