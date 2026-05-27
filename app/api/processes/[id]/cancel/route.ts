// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: process
// TARGET_FASTAPI_ENDPOINT: /api/v1/processes/{process_id}/cancel
// NOTES: Process mutation should be handled by Python; TS fallback remains a migration bridge.

import { NextRequest } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { createProcessEngine } from '@/lib/process/processEngine'
import { processToNextResponse } from '@/lib/process/processResponse'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fastApiResponse = await proxyToFastApi(request, `/api/v1/processes/${id}/cancel`)
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['companies.edit', 'branches.opening.start', 'branches.closing.start'])
  if (access instanceof Response) return access
  const body = await request.json().catch(() => ({}))
  const tenantContext = resolveTenantContext(request)
  const engine = createProcessEngine(supabase as any, { request, tenantContext, userId: access.userId || null })
  return processToNextResponse(await engine.cancelProcess(id, body.reason || 'Kullanici tarafindan iptal edildi.'))
}
