// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: process
// TARGET_FASTAPI_ENDPOINT: /api/v1/processes
// NOTES: Definition-key process start is adapted to Python StartProcessRequest when FastAPI is configured.

import { NextRequest } from 'next/server'
import { isFastApiEnabled, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { getProcessDefinition } from '@/lib/process/processRegistry'
import { createProcessEngine } from '@/lib/process/processEngine'
import { requireProcessStartAccess } from '@/lib/process/processGuards'
import { processErrorResponse, processToNextResponse } from '@/lib/process/processResponse'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const definition = getProcessDefinition(id)
  if (!definition) return processErrorResponse('Surec tanimi bulunamadi.', 'PROCESS_DEFINITION_NOT_FOUND', 404)
  const body = await request.json().catch(() => ({}))
  if (isFastApiEnabled()) {
    const fastApiResponse = await proxyToFastApi(request, '/api/v1/processes', {
      method: 'POST',
      bodyText: JSON.stringify({
        module_key: definition.moduleKey,
        process_key: definition.key,
        process_version: definition.version || '1.0',
        company_id: body.company_id || body.companyId || null,
        entity_type: body.entity_type || body.entityType || definition.entityType,
        entity_id: body.entity_id || body.entityId || null,
        operation_key: body.operation_key || body.operationKey || definition.operationKey || null,
        payload_json: body.payload || body,
      }),
    })
    if (fastApiResponse) return fastApiResponse
  }

  const supabase = createServiceClient()
  const access = await requireProcessStartAccess(request, supabase as any, definition)
  if (access instanceof Response) return access
  const tenantContext = resolveTenantContext(request)
  const engine = createProcessEngine(supabase as any, { request, tenantContext, userId: access.userId || null })
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
