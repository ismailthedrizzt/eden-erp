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
  const entityType = params.get('entity_type')
  const entityId = params.get('entity_id')
  if (!entityType || !entityId) return auditError('Kayit tipi ve kayit id zorunludur.', 'AUDIT_RECORD_REQUIRED', 400)

  const tenantContext = resolveTenantContext(request)
  const result = await new AuditLogService(supabase, tenantContext).listAuditByRecord(
    entityType,
    entityId,
    tenantContext.tenantId,
    Number(params.get('page') || 1),
    Number(params.get('pageSize') || params.get('page_size') || 50)
  )
  return auditListResponse(result.data, result.meta)
}
