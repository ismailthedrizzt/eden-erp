import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import {
  ensureCapitalIncreaseAccess,
  getCompanyLifecycle,
  numberValue,
  roundMoney,
} from '../capital-increases/_shared'

type SupabaseClient = ReturnType<typeof createServiceClient>

export type CapitalDecreasePrecheck = {
  ok: boolean
  operation_enabled: boolean
  message: string
  reasons: string[]
  warnings: string[]
  is_company_active: boolean
  company_status?: string
  record_status?: string
  current_capital_amount: number
  paid_capital_amount: number
  partner_count: number
  required_fields: string[]
  current_ownership_distribution: Array<Record<string, any>>
}

export async function ensureCapitalDecreaseAccess(request: NextRequest, supabase: SupabaseClient, companyId: string, permissionKey = 'companies.view') {
  return ensureCapitalIncreaseAccess(request, supabase, companyId, permissionKey)
}

export function capitalDecreaseError(message: string, code: string, status = 400, details?: Record<string, unknown>) {
  return NextResponse.json({ error: message, code, message, ...(details ? { details } : {}) }, { status })
}

export async function buildCapitalDecreasePrecheck(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
): Promise<CapitalDecreasePrecheck> {
  let companyQuery = supabase
    .from('companies')
    .select('id,committed_capital_amount,paid_capital_amount,record_status,company_status,is_deleted')
    .eq('id', companyId)
  companyQuery = applyTenantQueryScope(companyQuery, 'companies', tenantContext)
  const { data: company, error: companyError } = await companyQuery.maybeSingle()
  if (companyError) throw new Error(companyError.message)
  if (!company) {
    return {
      ok: false,
      operation_enabled: false,
      message: 'Şirket bulunamadı.',
      reasons: ['Şirket bulunamadı.'],
      warnings: [],
      is_company_active: false,
      current_capital_amount: 0,
      paid_capital_amount: 0,
      partner_count: 0,
      required_fields: requiredCapitalDecreaseFields(),
      current_ownership_distribution: [],
    }
  }

  const lifecycle = getCompanyLifecycle(company as Record<string, any>)
  const reasons: string[] = []
  const warnings: string[] = ['Bu operasyon için gerekli belge ve onay akışı henüz tamamlanmadı. Bu aşamada veri değişikliği yapılmaz.']
  if (lifecycle !== 'active') {
    reasons.push('Sermaye azaltımı yalnızca aktif şirketlerde ön kontrol seviyesinde görüntülenebilir.')
  }

  let ownershipQuery = supabase
    .from('v_current_ownership')
    .select('partner_id,display_name,current_share_ratio,current_voting_ratio,current_profit_ratio,current_capital_amount,current_share_units,warnings')
    .eq('company_id', companyId)
  ownershipQuery = applyTenantQueryScope(ownershipQuery, 'v_current_ownership', tenantContext)
  const { data: ownershipRows } = await ownershipQuery

  return {
    ok: reasons.length === 0,
    operation_enabled: false,
    message: reasons[0] || 'Sermaye azaltımı hazırlık aşamasında. Ön kontrol bilgileri görüntülenebilir; resmi kayıt ve ortaklık etkisi şu anda oluşturulmaz.',
    reasons,
    warnings,
    is_company_active: lifecycle === 'active',
    company_status: String((company as Record<string, any>).company_status || ''),
    record_status: String((company as Record<string, any>).record_status || ''),
    current_capital_amount: roundMoney(numberValue((company as Record<string, any>).committed_capital_amount)),
    paid_capital_amount: roundMoney(numberValue((company as Record<string, any>).paid_capital_amount)),
    partner_count: (ownershipRows || []).length,
    required_fields: requiredCapitalDecreaseFields(),
    current_ownership_distribution: ownershipRows || [],
  }
}

function requiredCapitalDecreaseFields() {
  return [
    'Azaltım nedeni',
    'Eski sermaye',
    'Azaltılacak tutar',
    'Yeni sermaye',
    'Ortak bazında etki',
    'Pay oranı değişiyor mu?',
    'İade / mahsup / zarar kapama tipi',
    'Belge dosyaları',
    'Karar tarihi',
    'Tescil tarihi',
    'Açıklama / not',
  ]
}
