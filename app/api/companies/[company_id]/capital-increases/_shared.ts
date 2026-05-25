import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, resolveTenantContext, type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingTenantColumnError } from '@/lib/modules/companies/companyErrors'

type SupabaseClient = ReturnType<typeof createServiceClient>

export const CAPITAL_INCREASE_TYPES = [
  'Nakdi sermaye taahhüdü ile artırım',
  'İç kaynaklardan sermaye artırımı',
  'Ortak alacağının sermayeye eklenmesi',
  'Ayni sermaye konulması',
  'Yeni ortak girişiyle sermaye artırımı',
  'Mevcut ortakların farklı oranlarda katılımıyla artırım',
  'Karma artırım',
  'Sermaye azaltımı ile eş zamanlı sermaye artırımı',
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
  'transaction_no',
  'increase_type',
  'transaction_date',
  'current_capital_amount',
  'increase_amount',
  'new_capital_amount',
  'paid_capital_amount',
  'participants',
  'previous_ownership',
  'new_ownership',
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
  total_share_ratio: number
  current_capital_amount: number
  paid_capital_amount: number
  unpaid_capital_amount: number
  active_partners: CapitalPartnerSnapshot[]
  draft_partners: CapitalPartnerSnapshot[]
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

export function capitalIncreaseError(message: string, code: string, status = 400, details?: Record<string, unknown>) {
  return NextResponse.json({ error: message, code, ...(details ? { details } : {}) }, { status })
}

export async function ensureCapitalIncreaseAccess(request: NextRequest, supabase: SupabaseClient, companyId: string, permissionKey = 'companies.edit') {
  const permission = await requirePermission(request, supabase, permissionKey)
  if (permission instanceof NextResponse) return { response: permission }

  const tenantContext = resolveTenantContext(request)
  const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
  if (!companyScope) {
    return { response: capitalIncreaseError('Şirket bulunamadı', 'COMPANY_NOT_FOUND', 404) }
  }
  if (permissionKey !== 'companies.view' && !isWritableCompanyScope(companyScope)) {
    return { response: capitalIncreaseError('Bu şirket için yalnızca görüntüleme yetkiniz var.', 'COMPANY_SCOPE_READONLY', 403) }
  }

  return { tenantContext }
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
  if (!company) {
    return {
      ok: false,
      message: 'Şirket bulunamadı',
      reasons: ['Şirket bulunamadı.'],
      total_share_ratio: 0,
      current_capital_amount: 0,
      paid_capital_amount: 0,
      unpaid_capital_amount: 0,
      active_partners: [],
      draft_partners: [],
    }
  }

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

  let partnersQuery = supabase
    .from('company_partners')
    .select('id,display_name,partner_name,owner_kind,partner_type,record_status,status,share_ratio,voting_ratio,profit_ratio,capital_amount,paid_capital_amount,is_deleted,end_date,history')
    .eq('company_id', companyId)
    .eq('is_deleted', false)
  partnersQuery = applyTenantQueryScope(partnersQuery, 'company_partners', tenantContext)
  const { data: partners, error: partnerError } = await partnersQuery
  if (partnerError) throw new Error(partnerError.message)

  const currentCapital = getCompanyCapitalAmount(company as Record<string, any>, openingDetails as Record<string, any> | null)
  const paidCapital = numberValue((company as Record<string, any>).paid_capital_amount)
  const normalizedPartners = (partners || []).map((partner: Record<string, any>) => normalizePartnerSnapshot(partner, currentCapital))
  const activePartners = normalizedPartners.filter(isActivePartner)
  const draftPartners = normalizedPartners.filter(isDraftPartner)
  const totalShare = roundRatio(activePartners.reduce((sum, partner) => sum + partner.share_ratio, 0))
  const partnerCommittedTotal = roundMoney(activePartners.reduce((sum, partner) => sum + partner.committed_capital_amount, 0))
  const committedForDebtCheck = partnerCommittedTotal > 0 ? partnerCommittedTotal : currentCapital
  const partnerPaidTotal = roundMoney(activePartners.reduce((sum, partner) => sum + partner.paid_capital_amount, 0))
  const paidForDebtCheck = partnerPaidTotal > 0 ? partnerPaidTotal : paidCapital
  const unpaidCapital = roundMoney(Math.max(0, committedForDebtCheck - paidForDebtCheck))
  const reasons: string[] = []

  if (Math.abs(totalShare - 100) > 0.01) {
    reasons.push(`Mevcut pay dağılımı %100 değil. Güncel toplam: %${totalShare.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}.`)
  }
  if (unpaidCapital > 0.01) {
    reasons.push(`Mevcut sermaye taahhütlerinde ${unpaidCapital.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} ödenmemiş tutar bulunuyor.`)
  }

  return {
    ok: reasons.length === 0,
    message: reasons.length
      ? 'Bu şirket için sermaye artırımı işlemi başlatılamaz. Sermaye artırımı yapılabilmesi için mevcut payların %100’ünün ortaklara dağıtılmış olması ve mevcut sermaye taahhütlerinin tamamen ödenmiş olması gerekir.'
      : undefined,
    reasons,
    total_share_ratio: totalShare,
    current_capital_amount: roundMoney(currentCapital),
    paid_capital_amount: roundMoney(paidForDebtCheck),
    unpaid_capital_amount: unpaidCapital,
    active_partners: activePartners,
    draft_partners: draftPartners,
  }
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
    voting_ratio: numberValue(partner.voting_ratio),
    profit_ratio: numberValue(partner.profit_ratio),
    committed_capital_amount: committed > 0 ? committed : inferredCommitted,
    paid_capital_amount: numberValue(partner.paid_capital_amount),
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
