import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsView)
  if (permission instanceof NextResponse) return permission

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company_id')

  let query = supabase
    .from('accounting_bank_connections')
    .select('id,company_id,provider_code,provider_display_name,connection_name,connection_type,status,last_sync_at,last_sync_status')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
