import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

const COMPANY_NACE_SELECT = 'id,company_id,nace_code_id,is_primary,status,start_date,end_date,notes,is_deleted,created_at,updated_at,version,nace_code:nace_codes(id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at)'

export async function GET(request: NextRequest, { params }: { params: Promise<{ company_id: string }> }) {
  const { company_id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'company_nace.view')
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase
    .from('company_nace_codes')
    .select(COMPANY_NACE_SELECT)
    .eq('company_id', company_id)
    .eq('is_deleted', false)
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
  const permission = await requirePermission(request, supabase, 'company_nace.insert')
  if (permission instanceof NextResponse) return permission
  const body = await request.json()

  const { count } = await supabase
    .from('company_nace_codes')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company_id)
    .eq('status', 'active')
    .eq('is_deleted', false)
  if ((count || 0) >= 5) {
    return NextResponse.json({ error: 'Bir şirket için en fazla 5 aktif NACE kodu tanımlanabilir.', code: 'NACE_LIMIT_EXCEEDED' }, { status: 400 })
  }

  const { count: primaryCount } = await supabase
    .from('company_nace_codes')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company_id)
    .eq('status', 'active')
    .eq('is_deleted', false)
    .eq('is_primary', true)

  const shouldBePrimary = body.is_primary === true || (primaryCount || 0) === 0
  if (shouldBePrimary && (primaryCount || 0) > 0) {
    await supabase
      .from('company_nace_codes')
      .update({ is_primary: false, updated_by: permission.userId, updated_at: new Date().toISOString() })
      .eq('company_id', company_id)
      .eq('is_deleted', false)
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
      created_by: permission.userId,
      updated_by: permission.userId,
    })
    .select(COMPANY_NACE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data.is_primary) await syncPrimaryRiskClass(supabase, company_id, data.nace_code)
  return NextResponse.json({ data }, { status: 201 })
}

async function syncPrimaryRiskClass(supabase: ReturnType<typeof createServiceClient>, companyId: string, naceCode: any) {
  await supabase.from('company_public_sgk').upsert({
    company_id: companyId,
    nace_code: naceCode?.nace_code || null,
    risk_class: naceCode?.hazard_class || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' })
}

function isMissingTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('Could not find the table')
}
