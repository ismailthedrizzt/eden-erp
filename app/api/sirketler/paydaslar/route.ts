import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'

const StakeholderSchema = z.object({
  company_id: z.string().uuid().optional(),
  person_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  stakeholder_type: z.enum(['gercek_kisi', 'tuzel_kisi']).default('gercek_kisi'),
  category: z.string().min(1),
  display_name: z.string().optional(),
  tax_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(['Aktif', 'Pasif', 'Askıda', 'Kara Liste', 'Çalışma Sonlandı']).default('Aktif'),
  priority_level: z.enum(['Düşük', 'Orta', 'Yüksek', 'Kritik']).optional(),
  internal_owner_employee_id: z.string().uuid().optional(),
  relationship_start_date: z.string().min(1),
  relationship_end_date: z.string().optional(),
  iban: z.string().optional(),
  bank_name: z.string().optional(),
  currency: z.string().optional(),
  contract_status: z.string().optional(),
  notes: z.string().optional(),
  photo_logo: z.array(z.record(z.any())).optional(),
  stakeholder_documents: z.array(z.record(z.any())).optional(),
  timeline: z.array(z.record(z.any())).optional(),
  entity_bank_accounts: z.array(z.record(z.any())).optional(),
}).passthrough()

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined))
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'created_at', direction: 'desc' })
  const { from, to } = listRange(listQuery)
  const sortMap: Record<string, string> = {
    display_name: 'display_name',
    tax_id: 'tax_id',
    stakeholder_type: 'stakeholder_type',
    category: 'category',
    status: 'status',
    priority_level: 'priority_level',
    created_at: 'created_at',
  }
  const sortColumn = sortMap[listQuery.sort || ''] || 'created_at'
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status')
  const includePassive = listQuery.includePassive

  let query = supabase
    .from('stakeholders')
    .select('id,company_id,person_id,organization_id,stakeholder_type,category,display_name,tax_id,phone,email,country,city,status,priority_level,internal_owner_employee_id,relationship_start_date,is_deleted,created_at')
    .order(sortColumn, { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  if (companyId) query = query.eq('company_id', companyId)
  if (status) query = query.eq('status', status)
  if (!includePassive) query = query.eq('is_deleted', false)
  if (listQuery.search) query = query.or(`display_name.ilike.%${listQuery.search}%,tax_id.ilike.%${listQuery.search}%,email.ilike.%${listQuery.search}%`)

  const { data, error } = await query
  if (error) {
    if (error.message.includes("Could not find the table")) {
      return NextResponse.json({ data: [], warning: 'stakeholders tablosu bulunamadı. Migration uygulanmalı.' })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  const rows = data || []
  return NextResponse.json({ data: rows, meta: listMetaFromRows(listQuery, rows.length) })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = omitNullishValues(await request.json())
  const parsed = StakeholderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const stakeholder = {
    ...parsed.data,
    display_name: parsed.data.display_name || buildDisplayName(parsed.data),
  }

  if (!stakeholder.display_name) {
    const field = stakeholder.stakeholder_type === 'tuzel_kisi' ? 'trade_name' : 'first_name'
    return NextResponse.json({
      error: 'Geçersiz veri',
      code: 'VALIDATION_FAILED',
      details: { fieldErrors: { [field]: ['Zorunlu alan'] } },
    }, { status: 400 })
  }

  let row: Record<string, any>
  try {
    row = await attachStakeholderIdentity(supabase, stakeholder, mapStakeholderForDb(stakeholder))
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Paydaş ana kayda bağlanamadı',
      code: 'MASTER_IDENTITY_LINK_FAILED',
    }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('stakeholders')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
  if (data?.person_id) await syncMasterContact(supabase, 'person', data.person_id, stakeholder)
  if (data?.organization_id) await syncMasterContact(supabase, 'organization', data.organization_id, stakeholder)
  if (Array.isArray(stakeholder.entity_bank_accounts)) {
    const kind = data?.person_id ? 'person' : data?.organization_id ? 'organization' : null
    const masterId = data?.person_id || data?.organization_id
    if (kind && masterId) await new EntityBankAccountsService(supabase as any).syncMany(kind, masterId, stakeholder.entity_bank_accounts, null)
  }
  const hydrated = data?.person_id
    ? await hydrateMasterContact(supabase, 'person', data)
    : data?.organization_id
      ? await hydrateMasterContact(supabase, 'organization', data)
      : data
  return NextResponse.json({ data: hydrated }, { status: 201 })
}

function mapStakeholderForDb(stakeholder: Record<string, any>) {
  return {
    company_id: stakeholder.company_id || null,
    stakeholder_type: stakeholder.stakeholder_type,
    category: stakeholder.category,
    display_name: stakeholder.display_name || buildDisplayName(stakeholder),
    tax_id: stakeholder.tax_id || null,
    phone: stakeholder.phone || stakeholder.phone_1 || null,
    email: stakeholder.email || stakeholder.email_1 || null,
    country: stakeholder.country || null,
    city: stakeholder.city || null,
    status: stakeholder.status || 'Aktif',
    priority_level: stakeholder.priority_level || null,
    internal_owner_employee_id: stakeholder.internal_owner_employee_id || null,
    relationship_start_date: stakeholder.relationship_start_date,
    relationship_end_date: stakeholder.relationship_end_date || null,
    iban: stakeholder.iban || null,
    bank_name: stakeholder.bank_name || null,
    currency: stakeholder.currency || 'TRY',
    contract_status: stakeholder.contract_status || null,
    notes: stakeholder.notes || null,
    photo_logo: stakeholder.photo_logo || [],
    stakeholder_documents: stakeholder.stakeholder_documents || [],
    stakeholder_profile: stripMasterDataForRoleProfile(stakeholder),
    history: stakeholder.timeline || [],
    is_deleted: false,
  }
}

function buildDisplayName(source: Record<string, any>) {
  return source.stakeholder_type === 'tuzel_kisi'
    ? source.trade_name || source.legal_name || source.ticari_unvan || source.short_name || source.kisa_unvan || ''
    : [source.first_name, source.last_name].filter(Boolean).join(' ').trim() || source.full_name || ''
}

async function attachStakeholderIdentity(supabase: ReturnType<typeof createServiceClient>, stakeholder: Record<string, any>, row: Record<string, any>) {
  try {
    const kind = stakeholder.stakeholder_type === 'tuzel_kisi' ? 'organization' : 'person'
    if (kind === 'person') {
      if (stakeholder.person_id) return { ...row, stakeholder_kind: 'person', person_id: stakeholder.person_id }

      const fullName = stakeholder.display_name || buildDisplayName(stakeholder)
      const nationalId = stakeholder.tax_id && String(stakeholder.tax_id).length === 11 ? String(stakeholder.tax_id) : null
      const passportNo = nationalId ? null : stakeholder.passport_no || stakeholder.tax_id || null
      const { data: existing, error: findError } = nationalId
        ? await supabase.from('persons').select('id').eq('nationality', normalizeCountryId(stakeholder.country || 'TR')).eq('national_id', nationalId).maybeSingle()
        : passportNo
          ? await supabase.from('persons').select('id').eq('nationality', normalizeCountryId(stakeholder.country || 'TR')).eq('passport_no', passportNo).maybeSingle()
          : await supabase.from('persons').select('id').eq('full_name', fullName).maybeSingle()
      if (findError) throw new Error(findError.message)
      const personId = existing?.id || (await supabase.from('persons').insert({
        first_name: stakeholder.first_name || null,
        last_name: stakeholder.last_name || null,
        full_name: fullName,
        nationality: normalizeCountryId(stakeholder.country || 'TR'),
        national_id: nationalId,
        passport_no: passportNo,
        birth_date: stakeholder.birth_date || null,
        phone: stakeholder.phone || stakeholder.phone_1 || null,
        email: stakeholder.email || stakeholder.email_1 || null,
        address: stakeholder.address || null,
        city: stakeholder.city || null,
        district: stakeholder.district || null,
        metadata_json: { source: 'stakeholders_create' },
      }).select('id').single()).data?.id
      if (!personId) throw new Error('Ana kişi kaydı oluşturulamadı.')
      return { ...row, stakeholder_kind: 'person', person_id: personId || null }
    }

    const legalName = stakeholder.trade_name || stakeholder.display_name
    if (stakeholder.organization_id) return { ...row, stakeholder_kind: 'organization', organization_id: stakeholder.organization_id }

    const country = normalizeCountryId(stakeholder.country || 'TR')
    const taxNumber = stakeholder.tax_id || stakeholder.tax_number || null
    const { data: existing, error: findError } = taxNumber
      ? await supabase.from('organizations').select('id').eq('country', country).eq('tax_number', taxNumber).maybeSingle()
      : await supabase.from('organizations').select('id').eq('country', country).eq('legal_name', legalName).maybeSingle()
    if (findError) throw new Error(findError.message)
    const organizationId = existing?.id || (await supabase.from('organizations').insert({
      legal_name: legalName,
      short_name: stakeholder.short_name || null,
      country,
      tax_number: taxNumber,
      tax_office: stakeholder.tax_office || null,
      registration_number: stakeholder.trade_registry_no || stakeholder.mersis_no || null,
      phone: stakeholder.phone || stakeholder.phone_1 || null,
      email: stakeholder.email || stakeholder.email_1 || null,
      address: stakeholder.address || null,
      city: stakeholder.city || null,
      district: stakeholder.district || null,
      metadata_json: { source: 'stakeholders_create' },
    }).select('id').single()).data?.id
    if (!organizationId) throw new Error('Ana kurum kaydı oluşturulamadı.')
    return { ...row, stakeholder_kind: 'organization', organization_id: organizationId || null }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Paydaş ana kayda bağlanamadı.')
  }
}
