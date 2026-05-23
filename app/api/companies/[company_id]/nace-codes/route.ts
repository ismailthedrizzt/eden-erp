import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  COMPANY_NACE_SELECT,
  isMissingTableError,
  requireCompanyNaceAccess,
  scopeCompanyNaceQuery,
  syncPrimaryRiskClass,
} from './_shared'

export async function GET(request: NextRequest, { params }: { params: Promise<{ company_id: string }> }) {
  const { company_id } = await params
  const supabase = createServiceClient()
  const access = await requireCompanyNaceAccess(request, supabase, company_id, 'view')
  if (access instanceof NextResponse) return access

  let query = supabase
    .from('company_nace_codes')
    .select(COMPANY_NACE_SELECT)
    .eq('company_id', company_id)
    .eq('is_deleted', false)

  query = scopeCompanyNaceQuery(query, access.tenantContext)

  const { data, error } = await query
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTableError(error)) return NextResponse.json({ data: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ company_id: string }> }) {
  const { company_id } = await params
  const supabase = createServiceClient()
  const access = await requireCompanyNaceAccess(request, supabase, company_id, 'edit')
  if (access instanceof NextResponse) return access
  const body = await request.json()

  let activeCountQuery = supabase
    .from('company_nace_codes')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company_id)
    .eq('status', 'active')
    .eq('is_deleted', false)

  activeCountQuery = scopeCompanyNaceQuery(activeCountQuery, access.tenantContext)
  const { count } = await activeCountQuery
  if ((count || 0) >= 5) {
    return NextResponse.json({ error: 'Bir sirket icin en fazla 5 aktif NACE kodu tanimlanabilir.', code: 'NACE_LIMIT_EXCEEDED' }, { status: 400 })
  }

  let primaryCountQuery = supabase
    .from('company_nace_codes')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company_id)
    .eq('status', 'active')
    .eq('is_deleted', false)
    .eq('is_primary', true)

  primaryCountQuery = scopeCompanyNaceQuery(primaryCountQuery, access.tenantContext)
  const { count: primaryCount } = await primaryCountQuery

  const shouldBePrimary = body.is_primary === true || (primaryCount || 0) === 0
  if (shouldBePrimary && (primaryCount || 0) > 0) {
    let clearPrimaryQuery = supabase
      .from('company_nace_codes')
      .update({ is_primary: false, updated_by: access.userId, updated_at: new Date().toISOString() })
      .eq('company_id', company_id)
      .eq('is_deleted', false)
    clearPrimaryQuery = scopeCompanyNaceQuery(clearPrimaryQuery, access.tenantContext)
    await clearPrimaryQuery
  }

  const { data, error } = await supabase
    .from('company_nace_codes')
    .insert({
      company_id,
      nace_code_id: body.nace_code_id,
      is_primary: shouldBePrimary,
      status: 'active',
      start_date: body.start_date || new Date().toISOString().slice(0, 10),
      notes: body.notes || null,
      tenant_id: access.tenantContext.tenantId,
      created_by: access.userId,
      updated_by: access.userId,
    })
    .select(COMPANY_NACE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data.is_primary) {
    const syncError = await syncPrimaryRiskClass(supabase, company_id, data.nace_code, access.tenantContext)
    if (syncError) return NextResponse.json({ error: syncError.message, code: syncError.code || 'PUBLIC_SGK_SYNC_FAILED' }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
