// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: process
// TARGET_FASTAPI_ENDPOINT: /api/v1/tasks/{task_id}/comments
// NOTES: Task comments remain TS fallback until the Python process comment endpoint is added.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { ProcessTaskService } from '@/lib/process/processTaskService'
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
    const service = new ProcessTaskService(supabase as any, tenantContext)
    const task = await service.get(id)
    if (!task) return NextResponse.json({ error: 'Gorev bulunamadi.', code: 'TASK_NOT_FOUND' }, { status: 404 })
    const updated = await service.addComment(task, String(body.note || body.comment || ''), access.userId || null)
    return NextResponse.json({ data: updated })
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) return NextResponse.json({ error: 'Surec gorevleri altyapisi henuz hazir degil.', code: 'PROCESS_INFRASTRUCTURE_MISSING' }, { status: 501 })
    return NextResponse.json({ error: error.message, code: error.code || 'TASK_COMMENT_FAILED' }, { status: 500 })
  }
}
