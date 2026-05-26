import { NextRequest } from 'next/server'
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
  const supabase = createServiceClient()
  const definition = getProcessDefinition(id)
  if (!definition) return processErrorResponse('Surec tanimi bulunamadi.', 'PROCESS_DEFINITION_NOT_FOUND', 404)
  const access = await requireProcessStartAccess(request, supabase as any, definition)
  if (access instanceof Response) return access
  const body = await request.json().catch(() => ({}))
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
