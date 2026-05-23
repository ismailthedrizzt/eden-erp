import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { APP_SESSION_COOKIE_NAME, appSessionCookieOptions, createAppSessionToken } from '@/lib/auth/appSession'
import { SETUP_INTENT_COOKIE_NAME, verifySetupIntentToken } from '@/lib/auth/setupIntent'
import { normalizeLoginIdentifier } from '@/lib/auth/tenantUserLookup'
import { ensureSetupDatabaseSchema } from '@/lib/db/setupSchema'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { createServiceClient } from '@/lib/supabase/server'
import {
  findGlobalOrganizationByIdentity,
  findOwnedCompanyScopeByOrganization,
  normalizeLegalCountry,
  normalizeLegalTaxNumber,
} from '@/lib/tenancy/companyScopes'
import { TENANT_ID_COOKIE, WORKSPACE_ID_COOKIE } from '@/lib/tenancy/constants'
import { ERP_MODULES, PERMISSIONS } from '@/packages/shared/src'

export const runtime = 'nodejs'

const optionalText = z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().optional()
)

const SETUP_COMPANY_COUNTRY = 'TR'
const SetupScaleSchema = z.enum(['small', 'medium', 'corporate', 'enterprise'])
const SetupPaymentChoiceSchema = z.enum(['pay_now', 'demo'])
const ADMIN_ROLE_KEY = 'yonetici'
const ADMIN_ROLE_NAME = 'Yönetici'

const SETUP_SCALE_PROFILES = {
  small: {
    label: 'Küçük',
    user_range: '1–5 Kullanıcı',
    company_range: 'Tek şirket',
    authorization_management: false,
    workflow_management: false,
    multi_company: false,
  },
  medium: {
    label: 'Orta',
    user_range: '6–25 Kullanıcı',
    company_range: '1–3 şirket',
    authorization_management: true,
    workflow_management: false,
    multi_company: false,
  },
  corporate: {
    label: 'Kurumsal',
    user_range: '26–300 Kullanıcı',
    company_range: '1–10 şirket',
    authorization_management: true,
    workflow_management: true,
    multi_company: false,
  },
  enterprise: {
    label: 'Holding / Grup',
    user_range: '301+ Kullanıcı',
    company_range: '10+ şirket',
    authorization_management: true,
    workflow_management: true,
    multi_company: true,
  },
} as const

const CompanyPayloadSchema = z.object({
  trade_name: z.string().trim().min(2, 'Ticari unvan zorunludur.'),
  short_name: optionalText,
  tax_number: z.string().trim().regex(/^\d{10}$/, 'VKN 10 haneli olmalıdır.'),
  tax_office: z.string().trim().min(2, 'Vergi dairesi zorunludur.'),
  company_type: z.string().trim().min(2, 'Şirket türü zorunludur.'),
  city: z.string().trim().min(2, 'İl zorunludur.'),
  district: z.string().trim().min(2, 'İlçe zorunludur.'),
  address: z.string().trim().min(5, 'Adres zorunludur.'),
})

const PersonPayloadSchema = z.object({
  role: z.enum(['partner', 'employee']),
  first_name: z.string().trim().min(2, 'Ad zorunludur.'),
  last_name: z.string().trim().min(2, 'Soyad zorunludur.'),
  nationality: z.string().trim().default('TR'),
  national_id: z.string().trim().regex(/^\d{11}$/, 'TC kimlik no 11 haneli olmalıdır.'),
  gender: z.enum(['male', 'female']),
  email: optionalText,
  phone: optionalText,
})

const PersonRolePayloadSchema = PersonPayloadSchema.extend({
  company_id: z.string().uuid('Şirket kaydı bulunamadı.'),
})

const RequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create_company'), company: CompanyPayloadSchema }),
  z.object({ action: z.literal('create_person_role'), person: PersonRolePayloadSchema }),
  z.object({
    action: z.literal('complete_setup'),
    company: CompanyPayloadSchema,
    scale: SetupScaleSchema,
    payment_choice: SetupPaymentChoiceSchema.default('demo'),
    person: PersonPayloadSchema,
  }),
])

type Supabase = ReturnType<typeof createServiceClient>

export async function GET() {
  return NextResponse.json({
    data: {
      has_company: false,
      company: null,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.parse(await request.json())
    const setupAccessFailure = validateSetupAccess(request, parsed)
    if (setupAccessFailure) return setupAccessFailure

    await ensureSetupDatabaseSchema()
    const supabase = createServiceClient()

    if (parsed.action === 'create_company') {
      await ensureCompanyCanOpenTenant(supabase, parsed.company)
      return NextResponse.json({ data: { can_create: true, company: null } })
    }

    if (parsed.action === 'complete_setup') {
      const recoveredSetup = await findRecoverableSetup(supabase, parsed.company)
      if (!recoveredSetup) await ensureCompanyCanOpenTenant(supabase, parsed.company)
      const tenant = recoveredSetup?.tenant || await initializeTenant(supabase, parsed.company, parsed.scale, parsed.payment_choice)

      if (recoveredSetup?.tenant) {
        await ensureTenantDatabaseBinding(supabase, tenant.id)
        await ensureTenantModules(supabase, tenant.id)
      }

      const companyResult = recoveredSetup?.company
        ? { company: recoveredSetup.company, reused: true }
        : await createFirstCompany(supabase, parsed.company, { tenantId: tenant.id, reuseExisting: false })
      await saveCompanySetupProfile(supabase, companyResult.company, parsed.scale)
      await ensureTenantCompanyScope(supabase, tenant.id, companyResult.company.id)
      const roleResult = await createPersonRole(supabase, {
        ...parsed.person,
        company_id: companyResult.company.id,
      }, tenant.id)
      await ensureSetupAdminUser(supabase, tenant.id, roleResult.person, parsed.person)

      const response = NextResponse.json(
        {
          data: {
            tenant,
            company: companyResult.company,
            scale: parsed.scale,
            payment_choice: parsed.payment_choice,
            company_reused: companyResult.reused,
            role: parsed.person.role,
            role_reused: roleResult.reused,
          },
        },
        { status: companyResult.reused && roleResult.reused ? 200 : 201 }
      )

      await attachSetupSession(response, tenant.id, roleResult.person, parsed.person)
      clearSetupIntent(response)
      return response
    }

    const result = await createPersonRole(supabase, parsed.person)
    const response = NextResponse.json({ data: result }, { status: result.reused ? 200 : 201 })
    clearSetupIntent(response)
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Form verileri geçersiz.', details: error.flatten() },
        { status: 400 }
      )
    }

    const status = error instanceof SetupWizardError ? error.status : 500
    const code = error instanceof SetupWizardError ? error.code : undefined
    const message = error instanceof Error ? error.message : 'Kurulum adımı tamamlanamadı.'
    return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status })
  }
}

function validateSetupAccess(request: NextRequest, parsed: z.infer<typeof RequestSchema>) {
  const setupIntent = verifySetupIntentToken(request.cookies.get(SETUP_INTENT_COOKIE_NAME)?.value)
  if (!setupIntent) {
    return NextResponse.json(
      { error: 'Kurulum icin once OTP dogrulamasi yapilmalidir.', code: 'SETUP_VERIFICATION_REQUIRED' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (parsed.action === 'create_company') return null

  const person = parsed.person
  const candidates = [person.email, person.phone]
    .map(value => normalizeLoginIdentifier(String(value || '')))
    .filter((value): value is NonNullable<ReturnType<typeof normalizeLoginIdentifier>> => Boolean(value))

  const matchesVerifiedIdentifier = candidates.some(candidate =>
    candidate.type === setupIntent.identifierType && candidate.identifier === setupIntent.identifier
  )

  if (matchesVerifiedIdentifier) return null

  return NextResponse.json(
    { error: 'Kurulumdaki kullanici bilgisi OTP ile dogrulanan e-posta veya telefonla eslesmiyor.', code: 'SETUP_IDENTITY_MISMATCH' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } }
  )
}

function clearSetupIntent(response: NextResponse) {
  response.cookies.set(SETUP_INTENT_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

class SetupWizardError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'SetupWizardError'
    this.status = status
    this.code = code
  }
}

async function ensureCompanyCanOpenTenant(
  supabase: Supabase,
  company: z.infer<typeof CompanyPayloadSchema>
) {
  const existingOrganization = await findGlobalOrganizationByIdentity(supabase, {
    country: SETUP_COMPANY_COUNTRY,
    taxNumber: company.tax_number,
    legalName: company.trade_name,
    select: 'id,short_name,legal_name,tax_number',
  })
  if (!existingOrganization?.id) return

  const ownerScope = await findOwnedCompanyScopeByOrganization(supabase, existingOrganization.id)
  if (!ownerScope) return

  throw new SetupWizardError(
    'Bu VKN ile şirket zaten sistemde kayıtlı. Yeni tenant açmak yerine Kayıtlı şirketime katılmak istiyorum seçeneğiyle kullanıcı talebi oluşturun.',
    409,
    'COMPANY_ALREADY_REGISTERED'
  )
}

async function findRecoverableSetup(
  supabase: Supabase,
  company: z.infer<typeof CompanyPayloadSchema>
) {
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, organization_id, trade_name, short_name, tax_number, tax_office, company_type, country, city, district, address, tenant_id, created_at')
    .eq('tax_number', company.tax_number)
    .eq('is_deleted', false)
    .not('tenant_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (companyError && !isMissingTableError(companyError)) throw new Error(companyError.message)
  if (!companies?.length) return null

  const tenantIds = Array.from(new Set(companies.map(item => item.tenant_id).filter(Boolean)))
  if (!tenantIds.length) return null

  const { data: tenants, error: tenantError } = await supabase
    .from('erp_instances')
    .select('id, name, tenant_key, status, metadata_json, created_at')
    .in('id', tenantIds)
    .eq('status', 'active')

  if (tenantError && !isMissingTableError(tenantError)) throw new Error(tenantError.message)

  const tenantById = new Map((tenants || []).map(tenant => [tenant.id, tenant]))
  const match = companies.find(row => {
    const tenant = tenantById.get(row.tenant_id)
    const metadata = tenant?.metadata_json && typeof tenant.metadata_json === 'object' && !Array.isArray(tenant.metadata_json)
      ? tenant.metadata_json as Record<string, any>
      : {}

    return metadata.source === 'setup_wizard' && metadata.company_tax_number === company.tax_number
  })

  if (!match) return null

  const tenant = tenantById.get(match.tenant_id)
  if (!tenant?.id) return null

  const { data: membership, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (membershipError && !isMissingTableError(membershipError)) throw new Error(membershipError.message)
  if (membership?.id) return null

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      tenant_key: tenant.tenant_key,
    },
    company: {
      id: match.id,
      organization_id: match.organization_id,
      trade_name: match.trade_name,
      short_name: match.short_name,
      tax_number: match.tax_number,
      tax_office: match.tax_office,
      company_type: match.company_type,
      country: match.country,
      city: match.city,
      district: match.district,
      address: match.address,
      tenant_id: match.tenant_id,
    },
  }
}

async function initializeTenant(
  supabase: Supabase,
  company: z.infer<typeof CompanyPayloadSchema>,
  scale: z.infer<typeof SetupScaleSchema>,
  paymentChoice: z.infer<typeof SetupPaymentChoiceSchema>
) {
  const tenantKey = await createUniqueTenantKey(supabase, company.short_name || company.trade_name || company.tax_number)
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('erp_instances')
    .insert({
      name: company.trade_name,
      code: tenantKey,
      tenant_key: tenantKey,
      tenant_type: 'customer',
      status: 'active',
      isolation_mode: 'shared_schema',
      schema_name: 'public',
      activation_phase: 'active',
      activated_at: now,
      metadata_json: {
        source: 'setup_wizard',
        payment_choice: paymentChoice,
        company_tax_number: company.tax_number,
        company_scale: {
          key: scale,
          ...SETUP_SCALE_PROFILES[scale],
        },
        initialized_at: now,
      },
    })
    .select('id, name, tenant_key')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Tenant kaydı oluşturulamadı.')

  await ensureTenantDatabaseBinding(supabase, data.id)
  await ensureTenantModules(supabase, data.id)

  return data
}

async function ensureTenantDatabaseBinding(supabase: Supabase, tenantId: string) {
  const { error } = await supabase
    .from('tenant_database_bindings')
    .upsert({
      tenant_id: tenantId,
      isolation_mode: 'shared_schema',
      schema_name: 'public',
      connection_name: 'default',
      protected_data: false,
      migration_status: 'not_required',
      status: 'active',
      activated_at: new Date().toISOString(),
      metadata_json: { source: 'setup_wizard' },
    }, { onConflict: 'tenant_id' })

  if (error) throw new Error(error.message)
}

async function ensureTenantModules(supabase: Supabase, tenantId: string) {
  const now = new Date().toISOString()
  const rows = ERP_MODULES.map(module => ({
    instance_id: tenantId,
    module_code: module.code,
    status: 'enabled',
    enabled_at: now,
    settings_json: { source: 'setup_wizard' },
  }))

  const { error } = await supabase
    .from('instance_modules')
    .upsert(rows, { onConflict: 'instance_id,module_code' })

  if (error) throw new Error(error.message)
}

async function ensureTenantCompanyScope(supabase: Supabase, tenantId: string, companyId: string) {
  const { error } = await supabase
    .from('tenant_company_scopes')
    .upsert({
      tenant_id: tenantId,
      company_id: companyId,
      scope_type: 'owned',
      is_primary: true,
      status: 'active',
      metadata_json: { source: 'setup_wizard' },
    }, { onConflict: 'tenant_id,company_id' })

  if (error) throw new Error(error.message)
}

async function ensureSetupAdminUser(
  supabase: Supabase,
  tenantId: string,
  person: Record<string, any>,
  payload: z.infer<typeof PersonPayloadSchema>
) {
  const role = await ensureAdminRole(supabase)
  await grantAllKnownPermissionsToRole(supabase, role.id)

  const userRolePayload = {
    instance_id: tenantId,
    user_id: person.id,
    role_id: role.id,
    status: 'active',
  }
  const { error: userRoleError } = await supabase
    .from('user_roles')
    .upsert(userRolePayload, { onConflict: 'instance_id,user_id,role_id' })

  if (userRoleError) throw new Error(userRoleError.message)

  const isDefaultMembership = await shouldUseDefaultTenantMembership(supabase, tenantId, person, payload)
  const { error: membershipError } = await supabase
    .from('tenant_memberships')
    .upsert({
      tenant_id: tenantId,
      user_id: person.id,
      role_key: ADMIN_ROLE_KEY,
      status: 'active',
      is_default: isDefaultMembership,
      metadata_json: {
        source: 'setup_wizard',
        person_id: person.id,
        email: normalizeSetupEmail(payload.email || person.email) || null,
        phone: normalizeSetupPhone(payload.phone || person.phone) || null,
      },
    }, { onConflict: 'tenant_id,user_id,role_key' })

  if (membershipError) throw new Error(membershipError.message)
}

async function shouldUseDefaultTenantMembership(
  supabase: Supabase,
  tenantId: string,
  person: Record<string, any>,
  payload: z.infer<typeof PersonPayloadSchema>
) {
  const userIds = await findRelatedPersonIds(supabase, person, payload)
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, user_id')
    .in('user_id', userIds)
    .eq('status', 'active')
    .eq('is_default', true)

  if (error && !isMissingTableError(error)) throw new Error(error.message)
  return !(data || []).some(membership => membership.tenant_id !== tenantId)
}

async function findRelatedPersonIds(
  supabase: Supabase,
  person: Record<string, any>,
  payload: z.infer<typeof PersonPayloadSchema>
) {
  const ids = new Set<string>([person.id].filter(Boolean))
  const email = normalizeSetupEmail(payload.email || person.email)
  const phone = normalizeSetupPhone(payload.phone || person.phone)

  if (!email && !phone) return Array.from(ids)

  const lookups = []
  if (email) {
    lookups.push(
      supabase
        .from('persons')
        .select('id')
        .eq('is_deleted', false)
        .eq('email', email)
    )
  }
  if (phone) {
    lookups.push(
      supabase
        .from('persons')
        .select('id')
        .eq('is_deleted', false)
        .in('phone', phone.length === 10 ? [phone, `0${phone}`] : [phone])
    )
  }

  const results = await Promise.all(lookups)
  results.forEach(({ data, error }) => {
    if (error && !isMissingTableError(error)) throw new Error(error.message)
    ;(data || []).forEach(row => {
      if (row.id) ids.add(row.id)
    })
  })

  return Array.from(ids)
}

async function ensureAdminRole(supabase: Supabase) {
  const { data, error } = await supabase
    .from('roles')
    .upsert({
      role_key: ADMIN_ROLE_KEY,
      name: ADMIN_ROLE_NAME,
      status: 'active',
    }, { onConflict: 'role_key' })
    .select('id, role_key, name')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Yönetici rolü oluşturulamadı.')
  return data
}

async function grantAllKnownPermissionsToRole(supabase: Supabase, roleId: string) {
  const knownPermissionKeys = Array.from(new Set([
    ...flattenPermissionKeys(PERMISSIONS),
    ...Object.values(ACCOUNTING_PERMISSIONS),
    'partners.view',
    'partners.insert',
    'partners.edit',
    'partners.delete',
    'stakeholders.view',
    'stakeholders.insert',
    'stakeholders.edit',
    'stakeholders.delete',
    'representatives.view',
    'representatives.insert',
    'representatives.edit',
    'representatives.delete',
    'ownership_transactions.view',
    'ownership_transactions.insert',
    'ownership_transactions.edit',
    'ownership_transactions.delete',
    'ownership_transactions.view_sensitive',
  ]))

  if (knownPermissionKeys.length) {
    const { error: permissionUpsertError } = await supabase
      .from('permissions')
      .upsert(
        knownPermissionKeys.map(permissionKey => ({ permission_key: permissionKey, name: permissionKey })),
        { onConflict: 'permission_key' }
      )

    if (permissionUpsertError) throw new Error(permissionUpsertError.message)
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from('permissions')
    .select('id')

  if (permissionsError) throw new Error(permissionsError.message)

  const rows = (permissions || [])
    .filter(permission => permission.id)
    .map(permission => ({ role_id: roleId, permission_id: permission.id }))

  if (!rows.length) return

  const { error } = await supabase
    .from('role_permissions')
    .upsert(rows, { onConflict: 'role_id,permission_id' })

  if (error) throw new Error(error.message)
}

async function attachSetupSession(
  response: NextResponse,
  tenantId: string,
  person: Record<string, any>,
  payload: z.infer<typeof PersonPayloadSchema>
) {
  const sessionToken = await createAppSessionToken({
    sub: person.id,
    userId: person.id,
    tenantId,
    email: normalizeSetupEmail(payload.email || person.email) || undefined,
    phone: normalizeSetupPhone(payload.phone || person.phone) || undefined,
  })

  response.cookies.set(APP_SESSION_COOKIE_NAME, sessionToken, appSessionCookieOptions())
  response.cookies.set(TENANT_ID_COOKIE, tenantId, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  })
  response.cookies.set(WORKSPACE_ID_COOKIE, tenantId, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  })
}

async function createUniqueTenantKey(supabase: Supabase, source: string) {
  const base = slugifyTenantKey(source) || `tenant-${Date.now().toString(36)}`

  for (let index = 0; index < 20; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`
    const { data, error } = await supabase
      .from('erp_instances')
      .select('id')
      .eq('tenant_key', candidate)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data?.id) return candidate
  }

  return `${base}-${Date.now().toString(36)}`
}

function slugifyTenantKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function flattenPermissionKeys(source: unknown): string[] {
  if (!source) return []
  if (typeof source === 'string') return [source]
  if (Array.isArray(source)) return source.flatMap(item => flattenPermissionKeys(item))
  if (typeof source === 'object') return Object.values(source as Record<string, unknown>).flatMap(item => flattenPermissionKeys(item))
  return []
}

function normalizeSetupEmail(value?: string | null) {
  const email = String(value || '').trim().toLowerCase()
  return email || null
}

function normalizeSetupPhone(value?: string | null) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('90')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits || null
}

async function createFirstCompany(
  supabase: Supabase,
  payload: z.infer<typeof CompanyPayloadSchema>,
  options: { tenantId?: string; reuseExisting?: boolean } = {}
) {
  if (options.reuseExisting !== false) {
    const existing = await fetchFirstCompany(supabase, options.tenantId)
    if (existing) return { company: existing, reused: true }
  }

  const organization = await findOrCreateOrganization(supabase, payload, options.tenantId, options.reuseExisting !== false)
  const companyPayload = {
    organization_id: organization.id,
    trade_name: payload.trade_name,
    short_name: payload.short_name || null,
    tax_number: payload.tax_number,
    tax_office: payload.tax_office,
    company_type: payload.company_type,
    country: SETUP_COMPANY_COUNTRY,
    city: payload.city,
    district: payload.district,
    address: payload.address,
    default_currency: 'TRY',
    default_language: 'tr',
    time_zone: 'Europe/Istanbul',
    fiscal_year_start: 101,
    is_deleted: false,
    hero_images: [],
    hero_documents: [],
    field_history: {},
    ...(options.tenantId ? { tenant_id: options.tenantId } : {}),
  }

  const { data, error } = await supabase
    .from('companies')
    .insert(companyPayload)
    .select('id, organization_id, trade_name, short_name, tax_number, tax_office, company_type, country, city, district, address, tenant_id')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('İlk şirket kaydı oluşturulamadı.')

  const rootUnitError = await ensureCompanyRootUnit(supabase, data.id, data, options.tenantId)
  if (rootUnitError && !isMissingTableError(rootUnitError)) throw new Error(rootUnitError.message)

  return { company: data, reused: false }
}

async function saveCompanySetupProfile(
  supabase: Supabase,
  company: { organization_id?: string | null },
  scale: z.infer<typeof SetupScaleSchema>
) {
  void supabase
  void company
  void scale
}

async function createPersonRole(supabase: Supabase, payload: z.infer<typeof PersonRolePayloadSchema>, tenantId?: string) {
  const company = await fetchCompanyById(supabase, payload.company_id)
  if (!company) throw new Error('Rol bağlanacak şirket kaydı bulunamadı.')

  const resolvedTenantId = tenantId || company.tenant_id || undefined
  const person = await findOrCreatePerson(supabase, payload, resolvedTenantId)

  if (payload.role === 'partner') {
    const partner = await findOrCreatePartner(supabase, company.id, person, payload, resolvedTenantId)
    return { person, role: 'partner', role_record: partner.record, reused: partner.reused }
  }

  const employee = await findOrCreateEmployee(supabase, company.id, person, payload, resolvedTenantId)
  return { person, role: 'employee', role_record: employee.record, reused: employee.reused }
}

async function fetchFirstCompany(supabase: Supabase, tenantId?: string) {
  let query = supabase
    .from('companies')
    .select('id, organization_id, trade_name, short_name, tax_number, tax_office, company_type, country, city, district, address, tenant_id')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1)

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query.maybeSingle()

  if (error && !isMissingTableError(error)) throw new Error(error.message)
  return data || null
}

async function fetchCompanyById(supabase: Supabase, companyId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, trade_name, tenant_id')
    .eq('id', companyId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data || null
}

async function findOrCreateOrganization(
  supabase: Supabase,
  payload: z.infer<typeof CompanyPayloadSchema>,
  tenantId?: string,
  reuseExisting = true
) {
  void tenantId
  void reuseExisting

  const existing = await findGlobalOrganizationByIdentity(supabase, {
    country: SETUP_COMPANY_COUNTRY,
    taxNumber: payload.tax_number,
    legalName: payload.trade_name,
    select: 'id',
  })
  if (existing?.id) return existing

  const country = normalizeLegalCountry(SETUP_COMPANY_COUNTRY)
  const taxNumber = normalizeLegalTaxNumber(payload.tax_number, country)
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      legal_name: payload.trade_name,
      trade_name: payload.trade_name,
      short_name: payload.short_name || null,
      country,
      tax_number: taxNumber,
      tax_office: payload.tax_office,
      organization_type: payload.company_type,
      status: 'active',
      is_deleted: false,
      metadata_json: { source: 'setup_wizard' },
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Ana kurum kaydı oluşturulamadı.')
  return data
}

async function ensureCompanyRootUnit(supabase: Supabase, companyId: string, companyData: Record<string, any>, tenantId?: string) {
  const { data: unitType, error: typeError } = await supabase
    .from('organization_unit_types')
    .upsert(
      { name: 'Şirket', slug: 'company', color: '#0f766e', icon: 'Building2', sort_order: 0, is_active: true },
      { onConflict: 'slug' }
    )
    .select('id')
    .single()

  if (typeError) return typeError

  const { data: existing, error: findError } = await supabase
    .from('organization_units')
    .select('id')
    .eq('company_id', companyId)
    .is('parent_unit_id', null)
    .eq('type', 'company')
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()

  if (findError) return findError

  const rootPayload = {
    company_id: companyId,
    parent_unit_id: null,
    name: companyData.trade_name || companyData.short_name || 'Şirket',
    short_name: companyData.short_name || null,
    type: 'company',
    unit_type_id: unitType?.id || null,
    status: 'Aktif',
    active: true,
    is_deleted: false,
    ...(tenantId ? { tenant_id: tenantId } : {}),
  }

  const result = existing?.id
    ? await supabase.from('organization_units').update(rootPayload).eq('id', existing.id)
    : await supabase.from('organization_units').insert(rootPayload)

  return result.error
}

async function findOrCreatePerson(supabase: Supabase, payload: z.infer<typeof PersonRolePayloadSchema>, tenantId?: string) {
  const nationality = payload.nationality || 'TR'
  const email = normalizeSetupEmail(payload.email)
  const phone = normalizeSetupPhone(payload.phone)
  let query = supabase
    .from('persons')
    .select('id, first_name, last_name, full_name, national_id, nationality, gender, phone, email')
    .eq('nationality', nationality)
    .eq('national_id', payload.national_id)
    .eq('is_deleted', false)

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data: existing, error: findError } = await query.maybeSingle()

  if (findError) throw new Error(findError.message)
  if (existing?.id) return existing

  const fullName = [payload.first_name, payload.last_name].join(' ').trim()
  const { data, error } = await supabase
    .from('persons')
    .insert({
      first_name: payload.first_name,
      last_name: payload.last_name,
      full_name: fullName,
      nationality,
      national_id: payload.national_id,
      gender: payload.gender,
      phone: phone || null,
      email: email || null,
      status: 'active',
      is_deleted: false,
      metadata_json: { source: 'setup_wizard' },
      ...(tenantId ? { tenant_id: tenantId } : {}),
    })
    .select('id, first_name, last_name, full_name, national_id, nationality, gender, phone, email')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Gerçek kişi kaydı oluşturulamadı.')
  return data
}

async function findOrCreatePartner(
  supabase: Supabase,
  companyId: string,
  person: Record<string, any>,
  payload: z.infer<typeof PersonRolePayloadSchema>,
  tenantId?: string
) {
  const { data: existing, error: findError } = await supabase
    .from('company_partners')
    .select('id, company_id, person_id, display_name, status, record_status')
    .eq('company_id', companyId)
    .eq('person_id', person.id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (findError) throw new Error(findError.message)
  if (existing?.id) return { record: existing, reused: true }

  const displayName = person.full_name || [payload.first_name, payload.last_name].join(' ').trim()
  const { data, error } = await supabase
    .from('company_partners')
    .insert({
      company_id: companyId,
      person_id: person.id,
      first_name: payload.first_name,
      last_name: payload.last_name,
      owner_kind: 'person',
      partner_type: 'person',
      source_type: 'setup_wizard',
      source_id: person.id,
      display_name: displayName,
      partner_name: displayName,
      identity_number: payload.national_id,
      status: 'Taslak',
      record_status: 'draft',
      start_date: new Date().toISOString().slice(0, 10),
      history: [{ type: 'setup_wizard_created', at: new Date().toISOString() }],
      ...(tenantId ? { tenant_id: tenantId } : {}),
    })
    .select('id, company_id, person_id, display_name, status, record_status')
    .single()

  if (error) throw new Error(error.message)
  await insertPartnerLifecycleEvent(supabase, data?.id, companyId, payload, tenantId)
  return { record: data, reused: false }
}

async function findOrCreateEmployee(
  supabase: Supabase,
  companyId: string,
  person: Record<string, any>,
  payload: z.infer<typeof PersonRolePayloadSchema>,
  tenantId?: string
) {
  const email = normalizeSetupEmail(payload.email)
  const phone = normalizeSetupPhone(payload.phone)
  const { data: existing, error: findError } = await supabase
    .from('employees')
    .select('id, company_id, person_id, first_name, last_name, record_status, work_status')
    .eq('company_id', companyId)
    .eq('person_id', person.id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (findError) throw new Error(findError.message)
  if (existing?.id) return { record: existing, reused: true }

  const today = new Date().toISOString().slice(0, 10)
  const employeeNo = await nextEmployeeNo(supabase)
  const { data, error } = await supabase
    .from('employees')
    .insert({
      person_id: person.id,
      company_id: companyId,
      employee_no: employeeNo,
      first_name: payload.first_name,
      last_name: payload.last_name,
      nationality: payload.nationality || 'TR',
      national_id: payload.national_id,
      gender: payload.gender,
      mobile_phone: phone || null,
      email: email || null,
      work_status: 'active',
      employment_status: 'active',
      record_status: 'active',
      start_date: today,
      sgk_entry_date: today,
      field_history: {},
      is_deleted: false,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    })
    .select('id, company_id, person_id, first_name, last_name, record_status, work_status')
    .single()

  if (error) throw new Error(error.message)
  await insertEmployeeWorkRelation(supabase, data?.id, companyId, today, tenantId)
  return { record: data, reused: false }
}

async function nextEmployeeNo(supabase: Supabase) {
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })

  return `EMP-${String((count || 0) + 1).padStart(4, '0')}`
}

async function insertPartnerLifecycleEvent(
  supabase: Supabase,
  partnerId: string | undefined,
  companyId: string,
  payload: z.infer<typeof PersonRolePayloadSchema>,
  tenantId?: string
) {
  if (!partnerId) return

  const { error } = await supabase
    .from('partner_ownership_lifecycle_events')
    .insert({
      partner_id: partnerId,
      company_id: companyId,
      event_type: 'setup_wizard_partner_created',
      event_date: new Date().toISOString().slice(0, 10),
      old_status: null,
      new_status: 'draft',
      payload: {
        first_name: payload.first_name,
        last_name: payload.last_name,
        national_id: payload.national_id,
      },
      ...(tenantId ? { tenant_id: tenantId } : {}),
    })

  if (error && !isMissingTableError(error)) throw new Error(error.message)
}

async function insertEmployeeWorkRelation(
  supabase: Supabase,
  employeeId: string | undefined,
  companyId: string,
  startDate: string,
  tenantId?: string
) {
  if (!employeeId) return

  const { error } = await supabase
    .from('employee_work_relations')
    .insert({
      employee_id: employeeId,
      company_id: companyId,
      relation_type: 'primary',
      start_date: startDate,
      status: 'active',
      history: [{ type: 'setup_wizard_created', at: new Date().toISOString() }],
      ...(tenantId ? { tenant_id: tenantId } : {}),
    })

  if (error && !isMissingTableError(error)) throw new Error(error.message)
}

function isMissingTableError(error: { message?: string; code?: string } | null) {
  const message = error?.message || ''
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('schema cache')
}
