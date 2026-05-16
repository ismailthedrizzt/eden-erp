import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizeIdentityCountry } from '@/lib/identity-gate'

const ResolveSchema = z.object({
  entityKind: z.enum(['person', 'organization']),
  identity: z.object({
    nationality: z.string().optional(),
    national_id: z.string().optional(),
    passport_no: z.string().optional(),
    country: z.string().optional(),
    tax_number: z.string().optional(),
    registration_number: z.string().optional(),
  }),
})

const PERSON_RESOLVE_SELECT = 'id,first_name,last_name,full_name,nationality,national_id,passport_no,birth_date,birth_place,gender,phone,email,status,is_deleted'
const ORGANIZATION_RESOLVE_SELECT = 'id,legal_name,trade_name,country,tax_number,registration_number,phone,email,status,is_deleted'
const ACCOUNT_CARD_VIEW_SELECT = 'company_id,entity_kind,person_id,organization_id,display_name,identity_no,tax_no,roles,account_code,official_balance,pending_balance,projected_balance,currency,last_movement_date,risk_status,status'

export async function POST(request: NextRequest) {
  const parsed = ResolveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Geçersiz kimlik arama isteði' }, { status: 400 })

  const supabase = createServiceClient()
  const { entityKind, identity } = parsed.data
  const master = entityKind === 'person'
    ? await findPerson(supabase, identity)
    : await findOrganization(supabase, identity)

  if ('error' in master) return NextResponse.json({ error: master.error }, { status: 400 })
  if (!master.record) {
    return NextResponse.json({
      found: false,
      entityKind,
      message: 'Bu kiþi/kurum master kayýtlarda bulunamadý. Cari hareketlerde kullanabilmek için önce ilgili formdan oluþturulmalýdýr.',
      roles: [],
      card: null,
    })
  }

  const record = master.record as Record<string, any>
  const roles = await loadRoles(supabase, entityKind, record.id)
  const card = await loadCard(supabase, entityKind, record.id)

  return NextResponse.json({
    found: true,
    entityKind,
    record,
    displayName: entityKind === 'person' ? record.full_name : record.legal_name,
    identityNo: entityKind === 'person' ? record.national_id || record.passport_no : record.tax_number || record.registration_number,
    roles,
    card,
    message: 'Bu kayýt sistemde mevcut.',
  })
}

async function findPerson(supabase: ReturnType<typeof createServiceClient>, identity: any) {
  const nationality = normalizeIdentityCountry(identity.nationality)
  const nationalId = String(identity.national_id || '').replace(/\D/g, '')
  const passportNo = String(identity.passport_no || '').trim()
  if (!nationalId && !passportNo) return { error: 'TC Kimlik No veya Pasaport No girin.' }
  let query = supabase.from('persons').select(PERSON_RESOLVE_SELECT).eq('nationality', nationality).eq('is_deleted', false)
  query = nationalId ? query.eq('national_id', nationalId) : query.eq('passport_no', passportNo)
  const { data, error } = await query.maybeSingle()
  if (error) return { error: error.message }
  return { record: data || null }
}

async function findOrganization(supabase: ReturnType<typeof createServiceClient>, identity: any) {
  const country = normalizeIdentityCountry(identity.country)
  const taxNumber = String(identity.tax_number || '').replace(/\D/g, '')
  const registrationNumber = String(identity.registration_number || '').trim()
  if (!taxNumber && !registrationNumber) return { error: 'VKN veya Ticaret Sicil No girin.' }
  let query = supabase.from('organizations').select(ORGANIZATION_RESOLVE_SELECT).eq('country', country).eq('is_deleted', false)
  query = taxNumber ? query.eq('tax_number', taxNumber) : query.eq('registration_number', registrationNumber)
  const { data, error } = await query.maybeSingle()
  if (error) return { error: error.message }
  return { record: data || null }
}

async function loadRoles(supabase: ReturnType<typeof createServiceClient>, kind: 'person' | 'organization', id: string) {
  const roleQueries = kind === 'person'
    ? [
        { label: 'Çalýþan', query: supabase.from('employees').select('id').eq('person_id', id).limit(1) },
        { label: 'Ortak', query: supabase.from('company_partners').select('id').eq('person_id', id).limit(1) },
        { label: 'Temsilci', query: supabase.from('company_representatives').select('id').eq('person_id', id).limit(1) },
        { label: 'Paydaþ', query: supabase.from('stakeholders').select('id').eq('person_id', id).limit(1) },
      ]
    : [
        { label: 'Þirket', query: supabase.from('companies').select('id').eq('organization_id', id).limit(1) },
        { label: 'Ortak', query: supabase.from('company_partners').select('id').eq('organization_id', id).limit(1) },
        { label: 'Temsilci', query: supabase.from('company_representatives').select('id').eq('organization_id', id).limit(1) },
        { label: 'Paydaþ', query: supabase.from('stakeholders').select('id').eq('organization_id', id).limit(1) },
      ]

  const results = await Promise.all(
    roleQueries.map(async ({ query }) => {
      const response = await query
      return response.data?.length ? true : false
    })
  )

  return roleQueries.map(role => role.label).filter((_, index) => results[index])
}
async function loadCard(supabase: ReturnType<typeof createServiceClient>, kind: 'person' | 'organization', id: string) {
  const column = kind === 'person' ? 'person_id' : 'organization_id'
  const { data } = await supabase.from('v_account_cards').select(ACCOUNT_CARD_VIEW_SELECT).eq(column, id).limit(1).maybeSingle()
  return data || null
}

