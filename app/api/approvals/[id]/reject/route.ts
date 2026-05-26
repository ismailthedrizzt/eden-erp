import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { ProcessApprovalService } from '@/lib/process/processApprovalService'
import { ProcessInstanceService } from '@/lib/process/processInstanceService'
import { createProcessEngine } from '@/lib/process/processEngine'
import { recordProcessEvent } from '@/lib/process/processEvents'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['companies.edit', 'branches.opening.start', 'branches.closing.start'])
  if (access instanceof Response) return access
  const body = await request.json().catch(() => ({}))
  const tenantContext = resolveTenantContext(request)

  try {
    const approval = await new ProcessApprovalService(supabase as any, tenantContext).reject(id, access.userId || null, body.note || body.decision_note || null)
    const process = await new ProcessInstanceService(supabase as any, tenantContext).get(approval.process_instance_id)
    if (process) {
      await recordProcessEvent({
        supabase: supabase as any,
        tenantContext,
        process,
        eventType: 'process.rejected',
        stepKey: process.current_step_key,
        payload: { approval_id: approval.id, note: body.note || body.decision_note || null },
        createdBy: access.userId || null,
      })
      const engine = createProcessEngine(supabase as any, { request, tenantContext, userId: access.userId || null })
      await engine.failProcess(process.id, {
        code: 'PROCESS_APPROVAL_REJECTED',
        error: 'Surec onayi reddedildi.',
        approval_id: approval.id,
        note: body.note || body.decision_note || null,
      })
    }
    return NextResponse.json({ data: approval })
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) return NextResponse.json({ error: 'Surec onaylari altyapisi henuz uygulanmamis.', code: 'PROCESS_INFRASTRUCTURE_MISSING' }, { status: 501 })
    return NextResponse.json({ error: error.message, code: error.code || 'APPROVAL_REJECT_FAILED' }, { status: 500 })
  }
}
