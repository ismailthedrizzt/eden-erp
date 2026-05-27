// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: ownership
// TARGET_FASTAPI_ENDPOINT: /api/v1/ownership/current
// NOTES: Proxies to FastAPI when configured; legacy TS fallback is temporary migration bridge.

import { NextRequest, NextResponse } from 'next/server'
import { isFastApiEnabled, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { isMissingTableError } from '@/lib/modules/companies/companyErrors'

const CURRENT_OWNERSHIP_COLUMNS = [
  'company_id',
  'partner_id',
  'display_name',
  'current_share_ratio',
  'current_voting_ratio',
  'current_profit_ratio',
  'current_capital_amount',
  'current_share_units',
  'has_control_right',
  'control_type',
  'has_veto_right',
  'has_board_nomination_right',
  'has_privileged_share',
  'is_beneficial_owner',
  'beneficial_ratio',
  'warnings',
  'tenant_id',
].join(',')

export async function GET(request: NextRequest) {
  if (isFastApiEnabled()) {
    const companyIds = request.nextUrl.searchParams.get('company_ids')?.split(',').map(value => value.trim()).filter(Boolean) || []
    if (companyIds.length === 1) {
      const proxied = await proxyToFastApi(request, `/api/v1/ownership/current?company_id=${encodeURIComponent(companyIds[0])}`)
      if (proxied) return proxied
    }
  }
  console.warn('FastAPI backend not configured or batch current ownership requested; using legacy TS fallback.')

  const supabase = createServiceClient()
  const tenantContext = resolveTenantContext(request)
  const { searchParams } = new URL(request.url)
  const companyIds = searchParams.get('company_ids')?.split(',').map(value => value.trim()).filter(Boolean) || []

  let query = supabase
    .from('v_current_ownership')
    .select(CURRENT_OWNERSHIP_COLUMNS)
    .order('company_id', { ascending: true })
    .order('current_share_ratio', { ascending: false })

  if (companyIds.length > 0) query = query.in('company_id', companyIds)
  query = applyTenantQueryScope(query, 'v_current_ownership', tenantContext)

  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({
        data: [],
        warning: 'Güncel ortaklık görünümü hazır değil; ortaklık bilgileri işlem geçmişi uygulanınca gösterilecek.',
      })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }
  return NextResponse.json({ data: data || [] })
}
