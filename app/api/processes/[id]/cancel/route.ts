import { NextRequest } from 'next/server'
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
  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['companies.edit', 'branches.opening.start', 'branches.closing.start'])
  if (access instanceof Response) return access
  const body = await request.json().catch(() => ({}))
  const tenantContext = resolveTenantContext(request)
  const engine = createProcessEngine(supabase as any, { request, tenantContext, userId: access.userId || null })
  return processToNextResponse(await engine.cancelProcess(id, body.reason || 'Kullanici tarafindan iptal edildi.'))
}
