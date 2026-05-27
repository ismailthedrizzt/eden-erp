// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: process
// TARGET_FASTAPI_ENDPOINT: /api/v1/processes
// NOTES: Process Engine core belongs in Python; TS route remains a temporary fallback.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { getProcessDefinition, listProcessDefinitions } from '@/lib/process/processRegistry'
import { ProcessInstanceService } from '@/lib/process/processInstanceService'
import { createProcessEngine } from '@/lib/process/processEngine'
import { requireProcessStartAccess } from '@/lib/process/processGuards'
import { processToNextResponse, processErrorResponse } from '@/lib/process/processResponse'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export async function GET(request: NextRequest) {
  const fastApiResponse = await proxyToFastApi(request, '/api/v1/processes')
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()
  const permission = await requireAnyPermission(request, supabase, [
    'companies.view',
    'branches.view',
    'partners.view',
    'representatives.view',
  ])
  if (permission instanceof Response) return permission

  const tenantContext = resolveTenantContext(request)
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50 })
  const range = listRange(listQuery)

  try {
    const service = new ProcessInstanceService(supabase as any, tenantContext)
    const result = await service.list({
      status: searchParams.get('status'),
      moduleKey: searchParams.get('module_key'),
      companyId: searchParams.get('company_id'),
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
        warning: 'Surec motoru altyapisi henuz hazir degil.',
      }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'PROCESSES_FETCH_FAILED' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const fastApiResponse = await proxyToFastApi(request, '/api/v1/processes')
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()
  const body = await request.json().catch(() => ({}))
  const processKey = String(body.process_key || body.processKey || '')
  const definition = getProcessDefinition(processKey)
  if (!definition) {
    return processErrorResponse('Surec tanimi bulunamadi.', 'PROCESS_DEFINITION_NOT_FOUND', 404, {
      available_processes: listProcessDefinitions().map(item => item.key),
    })
  }

  const access = await requireProcessStartAccess(request, supabase as any, definition)
  if (access instanceof Response) return access

  const tenantContext = resolveTenantContext(request)
  const engine = createProcessEngine(supabase as any, {
    request,
    tenantContext,
    userId: access.userId || null,
  })
  return processToNextResponse(await engine.startProcess({
    processKey: definition.key,
    moduleKey: definition.moduleKey,
    companyId: body.company_id || body.companyId || null,
    entityType: body.entity_type || body.entityType || definition.entityType,
    entityId: body.entity_id || body.entityId || null,
    operationKey: body.operation_key || body.operationKey || definition.operationKey || null,
    payload: body.payload || body,
    startedBy: access.userId || null,
    tenantContext,
    request,
    autoRun: body.auto_run === true || body.autoRun === true,
  }))
}
