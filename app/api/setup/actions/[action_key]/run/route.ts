import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantReadiness } from '@/lib/setup/tenantReadinessService'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action_key: string }> }
) {
  const { action_key: actionKey } = await params
  const supabase = createServiceClient()
  const access = await requireAnyPermission(request, supabase, ['settings.modulesManage', 'settings.edit'])
  if (access instanceof NextResponse) return access

  if (actionKey !== 'refresh_readiness') {
    return NextResponse.json({
      error: 'Bu kurulum adimi otomatik calistirilmiyor. Lutfen ilgili kurulum ekranindan devam edin.',
      code: 'SETUP_ACTION_MANUAL',
    }, { status: 409 })
  }

  const readiness = await getTenantReadiness(supabase as any, resolveTenantContext(request))
  return NextResponse.json({
    data: readiness,
    message: 'Calisma alani hazirlik durumu yenilendi.',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
