// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: audit
// TARGET_FASTAPI_ENDPOINT: /api/v1/audit/{audit_id}
// NOTES: Audit detail belongs in Python; TS remains fallback only.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAuditViewPermission } from '@/lib/audit/auditGuards'
import { AuditLogService } from '@/lib/audit/auditLogService'
import { auditError } from '@/lib/audit/auditResponse'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const fastApiResponse = await proxyToFastApi(request, `/api/v1/audit/${id}`)
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()
  const access = await requireAuditViewPermission(request, supabase)
  if (access instanceof NextResponse) return access

  const tenantContext = resolveTenantContext(request)
  const row = await new AuditLogService(supabase, tenantContext).getAuditLog(id, tenantContext.tenantId)
  if (!row) return auditError('Denetim kaydi bulunamadi.', 'AUDIT_NOT_FOUND', 404)
  return NextResponse.json({ data: row }, { headers: { 'Cache-Control': 'no-store' } })
}
