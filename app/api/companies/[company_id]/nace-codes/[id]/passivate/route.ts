import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { COMPANY_NACE_SELECT, requireCompanyNaceAccess, scopeCompanyNaceQuery } from '../../_shared'

export async function POST(request: NextRequest, { params }: { params: Promise<{ company_id: string; id: string }> }) {
  const { company_id, id } = await params
  const supabase = createServiceClient()
  const access = await requireCompanyNaceAccess(request, supabase, company_id, 'edit')
  if (access instanceof NextResponse) return access

  let rowQuery = supabase
    .from('company_nace_codes')
    .select('id,is_primary')
    .eq('id', id)
    .eq('company_id', company_id)
  rowQuery = scopeCompanyNaceQuery(rowQuery, access.tenantContext)
  const { data: row } = await rowQuery.single()

  if (row?.is_primary) {
    let activeCountQuery = supabase
      .from('company_nace_codes')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('status', 'active')
      .eq('is_deleted', false)
    activeCountQuery = scopeCompanyNaceQuery(activeCountQuery, access.tenantContext)
    const { count } = await activeCountQuery
    if ((count || 0) > 1) {
      return NextResponse.json({ error: 'Birincil NACE pasiflestirilmeden once baska bir aktif NACE kodu birincil yapilmalidir.', code: 'PRIMARY_NACE_REQUIRED' }, { status: 400 })
    }
  }

  let query = supabase
    .from('company_nace_codes')
    .update({
      status: 'passive',
      is_deleted: true,
      is_primary: false,
      deleted_at: new Date().toISOString(),
      deleted_by: access.userId,
      updated_by: access.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('company_id', company_id)

  query = scopeCompanyNaceQuery(query, access.tenantContext)

  const { data, error } = await query
    .select(COMPANY_NACE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
