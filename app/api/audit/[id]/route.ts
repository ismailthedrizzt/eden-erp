import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAuditViewPermission } from '@/lib/audit/auditGuards'
import { AuditLogService } from '@/lib/audit/auditLogService'
import { auditError } from '@/lib/audit/auditResponse'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const access = await requireAuditViewPermission(request, supabase)
  if (access instanceof NextResponse) return access

  const { id } = await params
  const tenantContext = resolveTenantContext(request)
  const row = await new AuditLogService(supabase, tenantContext).getAuditLog(id, tenantContext.tenantId)
  if (!row) return auditError('Denetim kaydi bulunamadi.', 'AUDIT_NOT_FOUND', 404)
  return NextResponse.json({ data: row }, { headers: { 'Cache-Control': 'no-store' } })
}
