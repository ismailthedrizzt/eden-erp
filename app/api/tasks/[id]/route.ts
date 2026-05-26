import { NextRequest, NextResponse } from 'next/server'
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
  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['companies.view', 'branches.view', 'partners.view', 'representatives.view'])
  if (access instanceof Response) return access
  const tenantContext = resolveTenantContext(request)

  try {
    const task = await new ProcessTaskService(supabase as any, tenantContext).get(id)
    if (!task) return NextResponse.json({ error: 'Gorev bulunamadi.', code: 'TASK_NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ data: task }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) return NextResponse.json({ error: 'Surec gorevleri altyapisi henuz uygulanmamis.', code: 'PROCESS_INFRASTRUCTURE_MISSING' }, { status: 501 })
    return NextResponse.json({ error: error.message, code: error.code || 'TASK_FETCH_FAILED' }, { status: 500 })
  }
}
