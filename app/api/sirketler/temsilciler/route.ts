import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const RepresentativeSchema = z.object({
  company_id: z.string().uuid().optional(),
  sirket_id: z.string().uuid().optional(),
  person_or_entity_type: z.enum(['gercek_kisi', 'tuzel_kisi']).default('gercek_kisi'),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  display_name: z.string().min(1),
  identity_number: z.string().optional(),
  status: z.enum(['Aktif', 'Pasif', 'Askıda', 'Süresi Dolmuş']).default('Aktif'),
  start_date: z.string().min(1),
  end_date: z.string().optional(),
  primary_authority_type: z.string().min(1),
  authority_types: z.array(z.string()).optional(),
  signature_type: z.string().optional(),
  authority_limit: z.coerce.number().optional(),
  currency: z.string().optional(),
  requires_joint_signature: z.boolean().default(false),
  can_approve_alone: z.boolean().default(false),
  photo_logo: z.array(z.record(z.any())).optional(),
  authority_documents: z.array(z.record(z.any())).optional(),
  notes: z.string().optional(),
  timeline: z.array(z.record(z.any())).optional(),
  representative_profile: z.record(z.any()).optional(),
}).passthrough()

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  )
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('sirket_temsilciler')
    .select('*')
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('sirket_id', companyId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = omitNullishValues(await request.json())
  const parsed = RepresentativeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const row = await attachRepresentativeIdentity(supabase, parsed.data, mapRepresentativeForDb(parsed.data))
  if (!row.sirket_id) {
    return NextResponse.json({ error: 'Bağlı şirket bulunamadı', code: 'COMPANY_REQUIRED' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sirket_temsilciler')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

function mapRepresentativeForDb(representative: Record<string, any>) {
  const authorityTypes = representative.authority_types?.length
    ? representative.authority_types
    : [representative.primary_authority_type].filter(Boolean)

  return {
    sirket_id: representative.company_id || representative.sirket_id,
    ad_soyad: representative.display_name || 'Temsilci',
    gorev: representative.primary_authority_type || null,
    yetki_turu: 'diger',
    authority_types: authorityTypes,
    person_kind: representative.person_or_entity_type,
    source_type: representative.source_type || (representative.person_or_entity_type === 'tuzel_kisi' ? 'master_organization' : 'master_person'),
    source_id: representative.source_id || null,
    display_name: representative.display_name,
    start_date: representative.start_date,
    end_date: representative.end_date || null,
    status: representative.status || 'Aktif',
    notes: representative.notes || null,
    signature_type: representative.signature_type || null,
    transaction_limit: representative.authority_limit || null,
    currency: representative.currency || 'TRY',
    requires_joint_signature: !!representative.requires_joint_signature,
    can_approve_alone: !!representative.can_approve_alone,
    photo_logo: representative.photo_logo || [],
    authority_documents: representative.authority_documents || [],
    representative_profile: representative,
    history: representative.timeline || [],
    is_deleted: false,
  }
}

async function attachRepresentativeIdentity(supabase: ReturnType<typeof createServiceClient>, representative: Record<string, any>, row: Record<string, any>) {
  try {
    const kind = representative.person_or_entity_type === 'tuzel_kisi' ? 'organization' : 'person'
    if (kind === 'person') {
      const fullName = representative.display_name
      const nationalId = representative.identity_number && String(representative.identity_number).length === 11 ? String(representative.identity_number) : null
      const { data: existing, error: findError } = nationalId
        ? await supabase.from('persons').select('id').eq('nationality', 'TR').eq('national_id', nationalId).maybeSingle()
        : await supabase.from('persons').select('id').eq('full_name', fullName).maybeSingle()
      if (findError) return row
      const personId = existing?.id || (await supabase.from('persons').insert({
        full_name: fullName,
        nationality: 'TR',
        national_id: nationalId,
        metadata_json: { source: 'representatives_create' },
      }).select('id').single()).data?.id
      return { ...row, person_id: personId || null, source_id: row.source_id || personId || null }
    }

    const legalName = representative.display_name
    const taxNumber = representative.identity_number || null
    const { data: existing, error: findError } = taxNumber
      ? await supabase.from('organizations').select('id').eq('country', 'TR').eq('tax_number', taxNumber).maybeSingle()
      : await supabase.from('organizations').select('id').eq('country', 'TR').eq('legal_name', legalName).maybeSingle()
    if (findError) return row
    const organizationId = existing?.id || (await supabase.from('organizations').insert({
      legal_name: legalName,
      country: 'TR',
      tax_number: taxNumber,
      metadata_json: { source: 'representatives_create' },
    }).select('id').single()).data?.id
    return { ...row, organization_id: organizationId || null, source_id: row.source_id || organizationId || null }
  } catch {
    return row
  }
}
