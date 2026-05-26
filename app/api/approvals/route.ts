import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { ProcessApprovalService } from '@/lib/process/processApprovalService'
import { ProcessInstanceService } from '@/lib/process/processInstanceService'
import { getProcessDefinition } from '@/lib/process/processRegistry'
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
    const result = await new ProcessApprovalService(supabase as any, tenantContext).listPendingApprovals({
      limit: listQuery.pageSize,
      offset: range.from,
    })
    return NextResponse.json({ data: result.rows, meta: listMeta(listQuery, result.count) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) {
      return NextResponse.json({ data: [], meta: listMeta(listQuery, 0), warning: 'Surec onaylari altyapisi henuz uygulanmamis.' })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'APPROVALS_FETCH_FAILED' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['companies.edit', 'branches.opening.start', 'branches.closing.start'])
  if (access instanceof Response) return access
  const body = await request.json().catch(() => ({}))
  const tenantContext = resolveTenantContext(request)

  try {
    const process = await new ProcessInstanceService(supabase as any, tenantContext).get(String(body.process_instance_id || body.processInstanceId || ''))
    if (!process) return NextResponse.json({ error: 'Surec kaydi bulunamadi.', code: 'PROCESS_NOT_FOUND' }, { status: 404 })
    const definition = getProcessDefinition(process.process_key, process.process_version)
    const step = definition?.steps.find(item => item.key === (body.step_key || body.stepKey || process.current_step_key))
    if (!step) return NextResponse.json({ error: 'Onay adimi bulunamadi.', code: 'PROCESS_STEP_NOT_FOUND' }, { status: 404 })
    const approval = await new ProcessApprovalService(supabase as any, tenantContext).createApproval({
      process,
      step,
      requestedBy: access.userId || null,
      payload: body.payload || body,
    })
    return NextResponse.json({ data: approval }, { status: 201 })
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) return NextResponse.json({ error: 'Surec onaylari altyapisi henuz uygulanmamis.', code: 'PROCESS_INFRASTRUCTURE_MISSING' }, { status: 501 })
    return NextResponse.json({ error: error.message, code: error.code || 'APPROVAL_CREATE_FAILED' }, { status: 500 })
  }
}
