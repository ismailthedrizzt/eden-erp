import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAuditViewPermission } from '@/lib/audit/auditGuards'
import { AuditLogService } from '@/lib/audit/auditLogService'
import { auditError, auditListResponse } from '@/lib/audit/auditResponse'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const access = await requireAuditViewPermission(request, supabase)
  if (access instanceof NextResponse) return access

  const params = request.nextUrl.searchParams
  const processInstanceId = params.get('process_instance_id')
  if (!processInstanceId) return auditError('Surec id zorunludur.', 'AUDIT_PROCESS_REQUIRED', 400)

  const tenantContext = resolveTenantContext(request)
  const result = await new AuditLogService(supabase, tenantContext).listAuditByProcess(
    processInstanceId,
    tenantContext.tenantId,
    Number(params.get('page') || 1),
    Number(params.get('pageSize') || params.get('page_size') || 50)
  )
  return auditListResponse(result.data, result.meta)
}
