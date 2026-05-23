import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { COMPANY_NACE_SELECT, requireCompanyNaceAccess, scopeCompanyNaceQuery } from '../_shared'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ company_id: string; id: string }> }) {
  const { company_id, id } = await params
  const supabase = createServiceClient()
  const access = await requireCompanyNaceAccess(request, supabase, company_id, 'edit')
  if (access instanceof NextResponse) return access
  const body = await request.json()

  let query = supabase
    .from('company_nace_codes')
    .update({ notes: body.notes || null, updated_by: access.userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company_id)

  query = scopeCompanyNaceQuery(query, access.tenantContext)

  const { data, error } = await query
    .select(COMPANY_NACE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
