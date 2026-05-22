import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SETUP_INTENT_COOKIE_NAME, verifySetupIntentToken } from '@/lib/auth/setupIntent'
import { normalizeLoginIdentifier } from '@/lib/auth/tenantUserLookup'
import {
  BASIC_USER_ROLE_KEY,
  ensureUserRegistrationRequestSchema,
  normalizeRegistrationEmail,
  normalizeRegistrationPhone,
} from '@/lib/auth/userRegistrationRequests'
import { createServiceClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/security/rateLimit'
import { DEFAULT_TENANT_ID } from '@/lib/tenancy/constants'

export const runtime = 'nodejs'

const optionalText = z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().optional()
)

const PersonPayloadSchema = z.object({
  first_name: z.string().trim().min(2, 'Ad zorunludur.'),
  last_name: z.string().trim().min(2, 'Soyad zorunludur.'),
  nationality: z.string().trim().default('TR'),
  national_id: z.string().trim().regex(/^\d{11}$/, 'TC kimlik no 11 haneli olmalıdır.'),
  gender: z.enum(['male', 'female']),
  email: z.union([z.literal(''), z.string().trim().email('E-posta adresi geçerli değil.')]).optional(),
  phone: optionalText,
})

const RequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('lookup'),
    tax_number: z.string().trim().regex(/^\d{10}$/, 'VKN 10 haneli olmalıdır.'),
  }),
  z.object({
    action: z.literal('create_request'),
    tax_number: z.string().trim().regex(/^\d{10}$/, 'VKN 10 haneli olmalıdır.'),
    tenant_id: z.string().uuid('Çalışma alanı bulunamadı.'),
    company_id: z.string().uuid('Şirket bulunamadı.'),
    person: PersonPayloadSchema,
  }),
])

type Supabase = ReturnType<typeof createServiceClient>

export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.parse(await request.json())
    const limitKey = parsed.action === 'lookup'
      ? parsed.tax_number
      : `${parsed.tax_number}:${parsed.person.national_id}`
    const limited = enforceRateLimit(request, `company-join:${parsed.action}`, limitKey, {
      limit: parsed.action === 'lookup' ? 20 : 5,
      windowMs: 10 * 60 * 1000,
    })
    if (limited) return limited

    const supabase = createServiceClient()

    if (parsed.action === 'lookup') {
      const matches = await lookupCompaniesByTaxNumber(supabase, parsed.tax_number)
      return NextResponse.json({ data: { matches } }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const accessFailure = validateVerifiedSignupContact(request, parsed.person)
    if (accessFailure) return accessFailure

    await ensureUserRegistrationRequestSchema()
    const result = await createJoinRequest(supabase, parsed)
    const response = NextResponse.json({ data: result }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set(SETUP_INTENT_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Form verileri geçersiz.', details: error.flatten() },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const status = error instanceof JoinRequestError ? error.status : 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kullanıcı kayıt talebi oluşturulamadı.' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

async function lookupCompaniesByTaxNumber(supabase: Supabase, taxNumber: string) {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, tenant_id, trade_name, short_name, tax_number, is_deleted')
    .eq('tax_number', taxNumber)
    .eq('is_deleted', false)
    .limit(20)

  if (error) throw new Error(error.message)

  const rows = (companies || [])
    .map(company => ({
      ...company,
      tenant_id: company.tenant_id || DEFAULT_TENANT_ID,
    }))
    .filter(company => company.id && company.tenant_id)

  if (!rows.length) return []

  const tenantIds = Array.from(new Set(rows.map(company => company.tenant_id)))
  const { data: tenants, error: tenantError } = await supabase
    .from('erp_instances')
    .select('id, name, status')
    .in('id', tenantIds)
    .eq('status', 'active')

  if (tenantError) throw new Error(tenantError.message)

  const tenantById = new Map((tenants || []).map(tenant => [tenant.id, tenant]))

  return rows
    .filter(company => tenantById.has(company.tenant_id))
    .map(company => {
      const tenant = tenantById.get(company.tenant_id)
      return {
        tenant_id: company.tenant_id,
        tenant_name: tenant?.name || 'Eden ERP',
        company_id: company.id,
        company_name: company.short_name || company.trade_name || 'Şirket kaydı',
        trade_name: company.trade_name || null,
        tax_number: company.tax_number,
      }
    })
}

function validateVerifiedSignupContact(request: NextRequest, person: z.infer<typeof PersonPayloadSchema>) {
  const setupIntent = verifySetupIntentToken(request.cookies.get(SETUP_INTENT_COOKIE_NAME)?.value)
  if (!setupIntent) {
    return NextResponse.json(
      { error: 'Talep oluşturmadan önce e-posta veya telefon doğrulaması yapılmalıdır.', code: 'SETUP_VERIFICATION_REQUIRED' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const candidates = [person.email, person.phone]
    .map(value => normalizeLoginIdentifier(String(value || '')))
    .filter((value): value is NonNullable<ReturnType<typeof normalizeLoginIdentifier>> => Boolean(value))

  const matchesVerifiedIdentifier = candidates.some(candidate =>
    candidate.type === setupIntent.identifierType && candidate.identifier === setupIntent.identifier
  )

  if (matchesVerifiedIdentifier) return null

  return NextResponse.json(
    { error: 'Kullanıcı bilgisi OTP ile doğrulanan e-posta veya telefonla eşleşmiyor.', code: 'SETUP_IDENTITY_MISMATCH' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } }
  )
}

async function createJoinRequest(
  supabase: Supabase,
  parsed: Extract<z.infer<typeof RequestSchema>, { action: 'create_request' }>
) {
  const matches = await lookupCompaniesByTaxNumber(supabase, parsed.tax_number)
  const match = matches.find(item => item.tenant_id === parsed.tenant_id && item.company_id === parsed.company_id)
  if (!match) throw new JoinRequestError('Bu VKN ile kayıtlı aktif şirket bulunamadı.', 404)

  const email = normalizeRegistrationEmail(parsed.person.email)
  const phone = normalizeRegistrationPhone(parsed.person.phone)
  if (!email && !phone) throw new JoinRequestError('E-posta veya telefon bilgilerinden en az biri zorunludur.', 400)

  const existingPerson = await findExistingPerson(supabase, parsed.tenant_id, parsed.person.national_id, email, phone)
  if (existingPerson?.id) {
    const { data: membership, error: membershipError } = await supabase
      .from('tenant_memberships')
      .select('id,status')
      .eq('tenant_id', parsed.tenant_id)
      .eq('user_id', existingPerson.id)
      .eq('status', 'active')
      .maybeSingle()

    if (membershipError) throw new Error(membershipError.message)
    if (membership?.id) throw new JoinRequestError('Bu kullanıcı ilgili şirkette zaten aktif görünüyor.', 409)
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from('user_registration_requests')
    .select('id,status,created_at')
    .eq('tenant_id', parsed.tenant_id)
    .eq('status', 'pending')
    .eq('national_id', parsed.person.national_id)
    .maybeSingle()

  if (duplicateError) throw new Error(duplicateError.message)
  if (duplicate?.id) throw new JoinRequestError('Bu kişi için bekleyen bir kullanıcı kayıt talebi zaten var.', 409)

  const fullName = [parsed.person.first_name, parsed.person.last_name].filter(Boolean).join(' ').trim()
  const { data, error } = await supabase
    .from('user_registration_requests')
    .insert({
      tenant_id: parsed.tenant_id,
      company_id: parsed.company_id,
      company_tax_number: parsed.tax_number,
      first_name: parsed.person.first_name,
      last_name: parsed.person.last_name,
      full_name: fullName,
      nationality: parsed.person.nationality || 'TR',
      national_id: parsed.person.national_id,
      gender: parsed.person.gender,
      email,
      phone,
      requested_role_key: BASIC_USER_ROLE_KEY,
      status: 'pending',
      metadata_json: {
        source: 'signup_company_join',
        company_name: match.company_name,
        tenant_name: match.tenant_name,
      },
    })
    .select('id, tenant_id, company_id, company_tax_number, first_name, last_name, full_name, email, phone, status, created_at')
    .single()

  if (error) throw new Error(error.message)
  return {
    request: data,
    company: match,
    message: 'Kullanıcı kayıt talebiniz oluşturuldu. Şirket yöneticileri onayladığında bilgilendirileceksiniz.',
  }
}

async function findExistingPerson(
  supabase: Supabase,
  tenantId: string,
  nationalId: string,
  email: string | null,
  phone: string | null
) {
  let query = supabase
    .from('persons')
    .select('id,national_id,email,phone')
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .eq('national_id', nationalId)
    .limit(1)

  const nationalResult = await query.maybeSingle()
  if (nationalResult.error) throw new Error(nationalResult.error.message)
  if (nationalResult.data?.id) return nationalResult.data

  if (email) {
    const { data, error } = await supabase
      .from('persons')
      .select('id,national_id,email,phone')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data?.id) return data
  }

  if (phone) {
    const phoneCandidates = phone.length === 10 ? [phone, `0${phone}`] : [phone]
    const { data, error } = await supabase
      .from('persons')
      .select('id,national_id,email,phone')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .in('phone', phoneCandidates)
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data?.id) return data
  }

  return null
}

class JoinRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'JoinRequestError'
    this.status = status
  }
}
