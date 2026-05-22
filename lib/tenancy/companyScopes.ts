import 'server-only'

type SupabaseLike = {
  from: (table: string) => any
}

export type TenantCompanyScopeType = 'owned' | 'managed' | 'shared' | 'readonly'

export type TenantCompanyScopeRow = {
  tenant_id: string
  company_id: string
  scope_type: TenantCompanyScopeType
  is_primary: boolean
  status: string
}

const TURKISH_COUNTRY_VALUES = ['TR', 'Türkiye', 'Turkiye', 'TURKIYE', 'TÜRKİYE', 'Turkey', 'TURKEY']

export function normalizeLegalCountry(value?: string | null) {
  const text = String(value || '').trim()
  if (!text) return 'TR'

  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  if (['TR', 'TURKIYE', 'TURKEY'].includes(normalized)) return 'TR'
  return normalized
}

export function normalizeLegalTaxNumber(value?: string | null, country?: string | null) {
  const text = String(value || '').trim()
  if (!text) return null
  return normalizeLegalCountry(country) === 'TR'
    ? text.replace(/\D/g, '').slice(0, 10)
    : text.toUpperCase()
}

export function legalCountryCandidates(country?: string | null) {
  return normalizeLegalCountry(country) === 'TR' ? TURKISH_COUNTRY_VALUES : [normalizeLegalCountry(country)]
}

export async function findGlobalOrganizationByIdentity(
  supabase: SupabaseLike,
  input: {
    country?: string | null
    taxNumber?: string | null
    legalName?: string | null
    select?: string
  }
) {
  const country = normalizeLegalCountry(input.country)
  const taxNumber = normalizeLegalTaxNumber(input.taxNumber, country)
  const legalName = String(input.legalName || '').trim()

  let query = supabase
    .from('organizations')
    .select(input.select || 'id')
    .eq('is_deleted', false)
    .in('country', legalCountryCandidates(country))
    .limit(1)

  query = taxNumber ? query.eq('tax_number', taxNumber) : query.eq('legal_name', legalName)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return data || null
}

export async function findGlobalCompanyByTaxNumber(
  supabase: SupabaseLike,
  input: {
    country?: string | null
    taxNumber?: string | null
    select?: string
  }
) {
  const country = normalizeLegalCountry(input.country)
  const taxNumber = normalizeLegalTaxNumber(input.taxNumber, country)
  if (!taxNumber) return null

  const { data, error } = await supabase
    .from('companies')
    .select(input.select || 'id,organization_id,tenant_id,short_name,trade_name,tax_number,country,is_deleted')
    .eq('is_deleted', false)
    .eq('tax_number', taxNumber)
    .in('country', legalCountryCandidates(country))
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data || null
}

export async function findTenantCompanyByTaxNumber(
  supabase: SupabaseLike,
  input: {
    tenantId: string
    country?: string | null
    taxNumber?: string | null
    select?: string
  }
) {
  const country = normalizeLegalCountry(input.country)
  const taxNumber = normalizeLegalTaxNumber(input.taxNumber, country)
  if (!taxNumber) return null

  const { data, error } = await supabase
    .from('companies')
    .select(input.select || 'id,organization_id,tenant_id,short_name,trade_name,tax_number,country,is_deleted')
    .eq('tenant_id', input.tenantId)
    .eq('is_deleted', false)
    .eq('tax_number', taxNumber)
    .in('country', legalCountryCandidates(country))
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data || null
}

export async function findOwnedCompanyScopeByOrganization(
  supabase: SupabaseLike,
  organizationId: string
) {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)

  if (error) throw new Error(error.message)
  const companyIds = (companies || []).map((company: { id?: string }) => company.id).filter(Boolean)
  if (!companyIds.length) return null

  const { data, error: scopeError } = await supabase
    .from('tenant_company_scopes')
    .select('tenant_id,company_id,scope_type,is_primary,status')
    .in('company_id', companyIds)
    .eq('scope_type', 'owned')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (scopeError) throw new Error(scopeError.message)
  return (data || null) as TenantCompanyScopeRow | null
}

export async function fetchTenantCompanyScopes(supabase: SupabaseLike, tenantId: string) {
  const { data, error } = await supabase
    .from('tenant_company_scopes')
    .select('tenant_id,company_id,scope_type,is_primary,status')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (error) throw new Error(error.message)
  return (data || []) as TenantCompanyScopeRow[]
}

export async function fetchScopedCompanyIds(supabase: SupabaseLike, tenantId: string) {
  const scopes = await fetchTenantCompanyScopes(supabase, tenantId)
  return scopes.map(scope => scope.company_id).filter(Boolean)
}

export async function getTenantCompanyScope(supabase: SupabaseLike, tenantId: string, companyId: string) {
  const { data, error } = await supabase
    .from('tenant_company_scopes')
    .select('tenant_id,company_id,scope_type,is_primary,status')
    .eq('tenant_id', tenantId)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data || null) as TenantCompanyScopeRow | null
}

export async function findOwnedCompanyScope(supabase: SupabaseLike, companyId: string) {
  const { data, error } = await supabase
    .from('tenant_company_scopes')
    .select('tenant_id,company_id,scope_type,is_primary,status')
    .eq('company_id', companyId)
    .eq('scope_type', 'owned')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data || null) as TenantCompanyScopeRow | null
}

export function isWritableCompanyScope(scope: TenantCompanyScopeRow | null) {
  return Boolean(scope && scope.scope_type !== 'readonly')
}

export async function ensureTenantCompanyScope(
  supabase: SupabaseLike,
  input: {
    tenantId: string
    companyId: string
    scopeType?: TenantCompanyScopeType
    isPrimary?: boolean
    source?: string
    metadata?: Record<string, unknown>
  }
) {
  const scopeType = input.scopeType || 'managed'
  const isPrimary = input.isPrimary ?? await shouldUsePrimaryScope(supabase, input.tenantId)
  const { data, error } = await supabase
    .from('tenant_company_scopes')
    .upsert({
      tenant_id: input.tenantId,
      company_id: input.companyId,
      scope_type: scopeType,
      is_primary: isPrimary,
      status: 'active',
      metadata_json: {
        source: input.source || 'company_scope',
        ...(input.metadata || {}),
      },
    }, { onConflict: 'tenant_id,company_id' })
    .select('tenant_id,company_id,scope_type,is_primary,status')
    .single()

  if (error) throw new Error(error.message)
  return data as TenantCompanyScopeRow
}

async function shouldUsePrimaryScope(supabase: SupabaseLike, tenantId: string) {
  const { data, error } = await supabase
    .from('tenant_company_scopes')
    .select('company_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .eq('is_primary', true)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return !data?.company_id
}
