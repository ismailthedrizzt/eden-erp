// BACKEND_MIGRATION_STATUS: deprecated_wrapper
// TARGET_BACKEND_MODULE: capital
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/capital-increases
// NOTES: Capital increase shared helpers contain validation/document/business logic; move to Python company capital and ownership services.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, resolveTenantContext, type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingTenantColumnError } from '@/lib/modules/companies/companyErrors'
import { getModuleRuntimeStatus, loadModuleFeatureContext } from '@/lib/modules/moduleFeatureResolver'

type SupabaseClient = ReturnType<typeof createServiceClient>

export const CAPITAL_INCREASE_TYPES = [
  'Nakdi sermaye taahhüdü ile artırım',
  'İç kaynaklardan sermaye artırımı',
  'Ortak alacağının sermayeye eklenmesi',
  'Ayni sermaye konulması',
  'Mevcut ortakların farklı oranlarda katılımıyla artırım',
  'Karma artırım',
] as const

export const CAPITAL_SOURCES = ['Nakdi', 'Ayni', 'İç Kaynaklardan', 'Ortak Alacağından'] as const

export const CAPITAL_INCREASE_DOCUMENT_SLOTS = [
  'board_resolution',
  'financial_advisor_document',
  'registration_document',
  'trade_registry_gazette',
]

export const CAPITAL_INCREASE_SELECT = [
  'id',
  'tenant_id',
  'company_id',
  'operation_id',
  'transaction_no',
  'increase_type',
  'transaction_date',
  'effective_date',
  'currency',
  'increase_reason',
  'distribution_method',
  'current_capital_amount',
  'increase_amount',
  'new_capital_amount',
  'paid_capital_amount',
  'participants',
  'previous_ownership',
  'new_ownership',
  'ownership_transaction_ids',
  'new_partner_id',
  'document_files',
  'status',
  'notes',
  'warnings',
  'history',
  'completed_at',
  'cancelled_at',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'is_deleted',
  'deleted_at',
  'deleted_by',
  'version',
].join(',')

export type CapitalPartnerSnapshot = {
  id: string
  display_name: string
  owner_kind: string
  partner_type: string
  record_status: string
  status: string
  share_ratio: number
  voting_ratio: number
  profit_ratio: number
  committed_capital_amount: number
  paid_capital_amount: number
}

export type CapitalIncreasePrecheck = {
  ok: boolean
  message?: string
  reasons: string[]
  warnings: string[]
  blocking_reasons: string[]
  is_company_active: boolean
  company_status?: string
  record_status?: string
  has_full_share_distribution: boolean
  total_share_ratio: number
  current_capital_amount: number
  paid_capital_amount: number
  unpaid_capital_amount: number
  active_partners: CapitalPartnerSnapshot[]
  draft_partners: CapitalPartnerSnapshot[]
  current_ownership_distribution: CapitalPartnerSnapshot[]
  dependency_code?: string
  dependency_details?: Record<string, unknown>
}

export function numberValue(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const text = String(value ?? '').trim()
  if (!text) return 0
  const direct = Number(text)
  if (Number.isFinite(direct)) return direct
  const localized = Number(text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(localized) ? localized : 0
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function roundRatio(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000
}

export function getCompanyCapitalAmount(company: Record<string, any> | null, openingDetails?: Record<string, any> | null) {
  const explicit = numberValue(company?.committed_capital_amount)
  if (explicit > 0) return explicit
  const payload = openingDetails?.payload_json && typeof openingDetails.payload_json === 'object' ? openingDetails.payload_json : {}
  return numberValue(
    payload.foundation_capital_amount
    ?? payload.capital_amount
    ?? openingDetails?.foundation_capital_amount
    ?? company?.foundation_capital_amount
  )
}

export function capitalIncreaseError(
  message: string,
  code: string,
  status = 400,
  details?: Record<string, unknown>,
  operation?: { id?: string | null; operation_status?: string | null } | null
) {
  return NextResponse.json({
    error: message,
    code,
    message,
    ...(details ? { details } : {}),
    ...(operation?.id ? {
      operation_id: operation.id,
      operation_status: operation.operation_status || 'failed',
    } : {}),
  }, { status })
}

export async function ensureCapitalIncreaseAccess(request: NextRequest, supabase: SupabaseClient, companyId: string, permissionKey = 'companies.edit') {
  const permission = await requirePermission(request, supabase, permissionKey)
  if (permission instanceof NextResponse) return { response: permission }

  const tenantContext = resolveTenantContext(request)
  const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
  if (!companyScope) {
    return { response: capitalIncreaseError('Şirket bulunamadı.', 'COMPANY_NOT_FOUND', 404) }
  }
  if (permissionKey !== 'companies.view' && !isWritableCompanyScope(companyScope)) {
    return { response: capitalIncreaseError('Bu şirket için yalnızca görüntüleme yetkiniz var.', 'COMPANY_SCOPE_READONLY', 403) }
  }

  return { tenantContext, userId: permission.userId }
}

export async function buildCapitalIncreasePrecheck(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
): Promise<CapitalIncreasePrecheck> {
  let companyQuery = supabase
    .from('companies')
    .select('id,committed_capital_amount,paid_capital_amount,foundation_date,record_status,company_status,is_deleted')
    .eq('id', companyId)
  companyQuery = applyTenantQueryScope(companyQuery, 'companies', tenantContext)
  const { data: company, error: companyError } = await companyQuery.maybeSingle()
  if (companyError) throw new Error(companyError.message)
  if (!company) return emptyPrecheck('Şirket bulunamadı.', ['Şirket bulunamadı.'])

  let openingQuery = supabase
    .from('company_opening_details')
    .select('payload_json,foundation_date')
    .eq('company_id', companyId)
  openingQuery = applyTenantQueryScope(openingQuery, 'company_opening_details', tenantContext)
  let { data: openingDetails, error: openingError } = await openingQuery.maybeSingle()
  if (openingError && isMissingTenantColumnError(openingError)) {
    const fallbackOpening = await supabase
      .from('company_opening_details')
      .select('payload_json,foundation_date')
      .eq('company_id', companyId)
      .maybeSingle()
    openingDetails = fallbackOpening.data
    openingError = fallbackOpening.error
  }

  const currentCapital = getCompanyCapitalAmount(company as Record<string, any>, openingDetails as Record<string, any> | null)
  const paidCapital = numberValue((company as Record<string, any>).paid_capital_amount)
  const lifecycle = getCompanyLifecycle(company as Record<string, any>)
  const blockingReasons: string[] = []
  const warnings: string[] = []
  let dependencyCode: string | undefined
  let dependencyDetails: Record<string, unknown> | undefined

  if (lifecycle !== 'active') {
    blockingReasons.push('Sermaye artırımı yalnızca aktif şirketlerde başlatılabilir. Taslak, tasfiye halinde veya terkin edilmiş şirketlerde bu işlem kullanılamaz.')
  }

  const moduleContext = await loadModuleFeatureContext(supabase as any, { tenantId: tenantContext.tenantId }).catch(() => ({ moduleLicenses: [] }))
  const partnersModuleStatus = getModuleRuntimeStatus('partners', moduleContext)
  if (partnersModuleStatus.status !== 'available') {
    dependencyCode = 'MODULE_DEPENDENCY_MISSING'
    dependencyDetails = {
      required_modules: ['partners'],
      missing_modules: ['partners'],
      module_status: partnersModuleStatus.status,
      blocking_reasons: partnersModuleStatus.blocking_reasons,
    }
    blockingReasons.push('Sermaye Artirimi icin Ortaklarimiz modulu ve guncel ortaklik dagilimi gereklidir.')
  }

  const partnerSnapshots = partnersModuleStatus.status === 'available'
    ? await loadPartnerSnapshots(supabase, companyId, tenantContext, currentCapital).catch(error => {
      dependencyCode = 'MODULE_DEPENDENCY_MISSING'
      dependencyDetails = {
        required_modules: ['partners'],
        missing_modules: ['partners'],
        reason: error?.message || 'Ortak kayitlari okunamadi.',
      }
      blockingReasons.push('Sermaye Artirimi icin aktif ortak kayitlari okunabilmelidir.')
      return [] as CapitalPartnerSnapshot[]
    })
    : []
  const activePartners = partnerSnapshots.filter(isActivePartner)
  const draftPartners = partnerSnapshots.filter(isDraftPartner)
  const ownershipDistribution = partnersModuleStatus.status === 'available'
    ? await loadCurrentOwnershipDistribution(supabase, companyId, tenantContext, activePartners)
    : { rows: [] as CapitalPartnerSnapshot[], error: null as string | null }
  if (ownershipDistribution.error) {
    dependencyCode = 'MODULE_DEPENDENCY_MISSING'
    dependencyDetails = {
      required_modules: ['partners'],
      missing_modules: [],
      required_projection: 'currentOwnership',
      source: 'v_current_ownership',
      reason: ownershipDistribution.error,
    }
    blockingReasons.push('Sermaye Artirimi icin guncel ortaklik dagilimi okunabilmelidir.')
  }
  const sourceRows = ownershipDistribution.rows

  const totalShare = roundRatio(sourceRows.reduce((sum, partner) => sum + partner.share_ratio, 0))
  const hasFullShareDistribution = Math.abs(totalShare - 100) <= 0.01
  const partnerCommittedTotal = roundMoney(sourceRows.reduce((sum, partner) => sum + partner.committed_capital_amount, 0))
  const committedForDebtCheck = partnerCommittedTotal > 0 ? partnerCommittedTotal : currentCapital
  const partnerPaidTotal = roundMoney(sourceRows.reduce((sum, partner) => sum + partner.paid_capital_amount, 0))
  const paidForDebtCheck = partnerPaidTotal > 0 ? partnerPaidTotal : paidCapital
  const unpaidCapital = roundMoney(Math.max(0, committedForDebtCheck - paidForDebtCheck))

  if (!sourceRows.length) {
    dependencyCode = dependencyCode || 'MODULE_DEPENDENCY_MISSING'
    dependencyDetails = dependencyDetails || {
      required_modules: ['partners'],
      missing_modules: partnersModuleStatus.status === 'available' ? [] : ['partners'],
      required_projection: 'currentOwnership',
      source: 'v_current_ownership',
      reason: 'NO_ACTIVE_CURRENT_OWNERSHIP',
    }
    blockingReasons.push('Sermaye dağıtımı yapılacak aktif ortak bulunamadı. Önce ortaklık kayıtları oluşturulmalıdır.')
  }
  if (!hasFullShareDistribution) {
    dependencyCode = dependencyCode || 'MODULE_DEPENDENCY_MISSING'
    dependencyDetails = dependencyDetails || {
      required_modules: ['partners'],
      missing_modules: [],
      required_projection: 'currentOwnership',
      source: 'v_current_ownership',
      reason: 'CURRENT_OWNERSHIP_DISTRIBUTION_INVALID',
      total_share_ratio: totalShare,
    }
    blockingReasons.push(`Mevcut pay dağılımı %100 değil. Güncel toplam: %${totalShare.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}.`)
  }
  if (unpaidCapital > 0.01) {
    warnings.push(`Mevcut sermaye taahhütlerinde ${unpaidCapital.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} ödenmemiş tutar bulunuyor.`)
  }

  return {
    ok: blockingReasons.length === 0,
    message: blockingReasons[0] || undefined,
    reasons: warnings,
    warnings,
    blocking_reasons: blockingReasons,
    is_company_active: lifecycle === 'active',
    company_status: String((company as Record<string, any>).company_status || ''),
    record_status: String((company as Record<string, any>).record_status || ''),
    has_full_share_distribution: hasFullShareDistribution,
    total_share_ratio: totalShare,
    current_capital_amount: roundMoney(currentCapital),
    paid_capital_amount: roundMoney(paidForDebtCheck),
    unpaid_capital_amount: unpaidCapital,
    active_partners: sourceRows,
    draft_partners: draftPartners,
    current_ownership_distribution: sourceRows,
    dependency_code: dependencyCode,
    dependency_details: dependencyDetails,
  }
}

async function loadPartnerSnapshots(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext,
  currentCapital: number
) {
  let partnersQuery = supabase
    .from('company_partners')
    .select('id,display_name,partner_name,owner_kind,partner_type,record_status,status,share_ratio,voting_ratio,profit_ratio,capital_amount,paid_capital_amount,is_deleted,end_date,history')
    .eq('company_id', companyId)
    .eq('is_deleted', false)
  partnersQuery = applyTenantQueryScope(partnersQuery, 'company_partners', tenantContext)
  const { data: partners, error: partnerError } = await partnersQuery
  if (partnerError) throw new Error(partnerError.message)
  return (partners || []).map((partner: Record<string, any>) => normalizePartnerSnapshot(partner, currentCapital))
}

async function loadCurrentOwnershipDistribution(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext,
  fallbackPartners: CapitalPartnerSnapshot[]
): Promise<{ rows: CapitalPartnerSnapshot[]; error: string | null }> {
  let ownershipQuery = supabase
    .from('v_current_ownership')
    .select('partner_id,display_name,current_share_ratio,current_voting_ratio,current_profit_ratio,current_capital_amount,current_share_units,committed_capital_amount,paid_capital_amount,warnings')
    .eq('company_id', companyId)
  ownershipQuery = applyTenantQueryScope(ownershipQuery, 'v_current_ownership', tenantContext)
  const { data: ownershipRows, error } = await ownershipQuery
  if (error) return { rows: [], error: error.message || 'Guncel ortaklik dagilimi okunamadi.' }
  const partnerMap = new Map(fallbackPartners.map(partner => [partner.id, partner]))

  const rows = (ownershipRows || [])
    .filter((row: Record<string, any>) => numberValue(row.current_share_ratio) > 0 || numberValue(row.current_capital_amount) > 0)
    .map((row: Record<string, any>) => {
      const partner = partnerMap.get(String(row.partner_id))
      return {
        id: String(row.partner_id),
        display_name: String(row.display_name || partner?.display_name || 'Ortak'),
        owner_kind: partner?.owner_kind || 'person',
        partner_type: partner?.partner_type || 'person',
        record_status: partner?.record_status || 'active',
        status: partner?.status || 'active',
        share_ratio: numberValue(row.current_share_ratio),
        voting_ratio: numberValue(row.current_voting_ratio || row.current_share_ratio),
        profit_ratio: numberValue(row.current_profit_ratio || row.current_share_ratio),
        committed_capital_amount: numberValue(row.current_capital_amount || row.committed_capital_amount),
        paid_capital_amount: numberValue(row.paid_capital_amount),
      } satisfies CapitalPartnerSnapshot
    })
  return { rows, error: null }
}

export function normalizePartnerSnapshot(partner: Record<string, any>, companyCapital: number): CapitalPartnerSnapshot {
  const shareRatio = numberValue(partner.share_ratio)
  const committed = numberValue(partner.capital_amount)
  const inferredCommitted = companyCapital > 0 && shareRatio > 0 ? roundMoney(companyCapital * shareRatio / 100) : 0

  return {
    id: String(partner.id),
    display_name: String(partner.display_name || partner.partner_name || 'Ortak'),
    owner_kind: String(partner.owner_kind || partner.partner_type || 'person'),
    partner_type: String(partner.partner_type || partner.owner_kind || 'person'),
    record_status: String(partner.record_status || ''),
    status: String(partner.status || ''),
    share_ratio: shareRatio,
    voting_ratio: numberValue(partner.voting_ratio || shareRatio),
    profit_ratio: numberValue(partner.profit_ratio || shareRatio),
    committed_capital_amount: committed > 0 ? committed : inferredCommitted,
    paid_capital_amount: numberValue(partner.paid_capital_amount),
  }
}

export function getCompanyLifecycle(company: Record<string, any>) {
  if (company.is_deleted === true) return 'deregistered'
  const values = [company.record_status, company.company_status]
    .map(value => String(value || '').trim().toLocaleLowerCase('tr-TR'))
    .filter(Boolean)

  for (const value of values) {
    if (['draft', 'taslak'].includes(value)) return 'draft'
    if (['active', 'opened', 'aktif'].includes(value)) return 'active'
    if (['liquidation', 'tasfiye', 'tasfiye halinde'].includes(value)) return 'liquidation'
    if (['deregistered', 'passive', 'closed', 'deleted', 'pasif', 'kapalı', 'kapanmış'].includes(value)) return 'deregistered'
  }

  return values.length ? 'unknown' : 'active'
}

function emptyPrecheck(message: string, blockingReasons: string[]): CapitalIncreasePrecheck {
  return {
    ok: false,
    message,
    reasons: [],
    warnings: [],
    blocking_reasons: blockingReasons,
    is_company_active: false,
    has_full_share_distribution: false,
    total_share_ratio: 0,
    current_capital_amount: 0,
    paid_capital_amount: 0,
    unpaid_capital_amount: 0,
    active_partners: [],
    draft_partners: [],
    current_ownership_distribution: [],
  }
}

function isActivePartner(partner: CapitalPartnerSnapshot) {
  const status = `${partner.status} ${partner.record_status}`.toLocaleLowerCase('tr-TR')
  return !status.includes('draft') && !status.includes('taslak') && !status.includes('passive') && !status.includes('pasif')
}

function isDraftPartner(partner: CapitalPartnerSnapshot) {
  const status = `${partner.status} ${partner.record_status}`.toLocaleLowerCase('tr-TR')
  return status.includes('draft') || status.includes('taslak')
}

export async function nextCapitalIncreaseNo(supabase: SupabaseClient) {
  const prefix = `SA-${new Date().getFullYear()}`
  const { count } = await supabase
    .from('company_capital_increase_transactions')
    .select('id', { count: 'exact', head: true })
  return `${prefix}-${String((count || 0) + 1).padStart(5, '0')}`
}

export function withCapitalTenant<T extends Record<string, unknown>>(row: T, tenantContext: TenantContext) {
  return withTenantInsertScopeForTable(row, 'company_capital_increase_transactions', tenantContext)
}
