import { NextRequest, NextResponse } from 'next/server'
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
].join(',')

export async function GET(request: NextRequest, { params }: { params: Promise<{ company_id: string }> }) {
  const { company_id } = await params
  const supabase = createServiceClient()
  const tenantContext = resolveTenantContext(request)
  let query = supabase
    .from('v_current_ownership')
    .select(CURRENT_OWNERSHIP_COLUMNS)
    .eq('company_id', company_id)
    .order('current_share_ratio', { ascending: false })

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
