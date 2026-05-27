// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: audit
// TARGET_ENDPOINT: /api/v1/audit
// NOTES: Audit core read/write logic should move to Python Audit Domain.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAuditViewPermission } from '@/lib/audit/auditGuards'
import { AuditLogService } from '@/lib/audit/auditLogService'
import { auditListResponse } from '@/lib/audit/auditResponse'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const access = await requireAuditViewPermission(request, supabase)
  if (access instanceof NextResponse) return access

  const tenantContext = resolveTenantContext(request)
  const params = request.nextUrl.searchParams
  const service = new AuditLogService(supabase, tenantContext)
  const result = await service.listAuditLogs({
    tenantId: tenantContext.tenantId,
    entityType: params.get('entity_type'),
    entityId: params.get('entity_id'),
    companyId: params.get('company_id'),
    branchId: params.get('branch_id'),
    moduleKey: params.get('module_key'),
    actionType: params.get('action_type'),
    userId: params.get('user_id'),
    operationId: params.get('operation_id'),
    processInstanceId: params.get('process_instance_id'),
    dateFrom: params.get('date_from'),
    dateTo: params.get('date_to'),
    page: Number(params.get('page') || 1),
    pageSize: Number(params.get('pageSize') || params.get('page_size') || 50),
  })

  return auditListResponse(result.data, result.meta)
}
