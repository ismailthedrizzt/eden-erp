// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: audit
// TARGET_FASTAPI_ENDPOINT: /api/v1/audit/by-process
// NOTES: Audit by-process query belongs in Python; TS remains fallback only.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAuditViewPermission } from '@/lib/audit/auditGuards'
import { AuditLogService } from '@/lib/audit/auditLogService'
import { auditError, auditListResponse } from '@/lib/audit/auditResponse'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const fastApiResponse = await proxyToFastApi(request, '/api/v1/audit/by-process')
  if (fastApiResponse) return fastApiResponse

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
