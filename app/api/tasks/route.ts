// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: process
// TARGET_FASTAPI_ENDPOINT: /api/v1/tasks
// NOTES: Process task core should move to Python; Next route becomes BFF/proxy.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { ProcessTaskService } from '@/lib/process/processTaskService'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['companies.view', 'branches.view', 'partners.view', 'representatives.view'])
  if (access instanceof Response) return access
  const tenantContext = resolveTenantContext(request)
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50 })
  const range = listRange(listQuery)

  try {
    const service = new ProcessTaskService(supabase as any, tenantContext)
    const result = await service.listMyTasks(access.userId || null, {
      status: searchParams.get('status'),
      limit: listQuery.pageSize,
      offset: range.from,
    })
    return NextResponse.json({
      data: result.rows,
      meta: listMeta(listQuery, result.count),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) {
      return NextResponse.json({
        data: [],
        meta: listMeta(listQuery, 0),
        warning: 'Surec gorevleri altyapisi henuz hazir degil.',
      }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'TASKS_FETCH_FAILED' }, { status: 500 })
  }
}
