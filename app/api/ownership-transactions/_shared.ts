import { createServiceClient } from '@/lib/supabase/server'

export const OWNERSHIP_TRANSACTION_SELECT = 'id,company_id,transaction_no,transaction_type,transaction_date,effective_date,from_partner_id,to_partner_id,affected_partner_id,share_ratio,voting_ratio,profit_ratio,share_units,nominal_value,capital_amount,transfer_price,currency,has_control_right,control_type,has_veto_right,has_board_nomination_right,has_privileged_share,privilege_type,is_beneficial_owner,beneficial_ratio,committed_capital_amount,new_capital_amount,commitment_date,old_voting_ratio,new_voting_ratio,old_profit_ratio,new_profit_ratio,privilege_description,privilege_start_date,privilege_end_date,removed_privilege_type,removal_date,capital_distribution,correction_transaction_id,correction_reason,new_values,reversal_transaction_id,reversal_reason,document_status,document_reference_id,decision_reference_id,document_files,status,approval_status,workflow_status,description,transaction_reason,exit_reason,justification,notes,warnings,history,approval_notes,rejection_reason,approved_by,approved_at,created_at,created_by,updated_at,updated_by,is_deleted,deleted_at,deleted_by,version'

const ALLOWED_TRANSACTION_TYPES = new Set([
  'initial_partnership_entry',
  'Pay Devri',
  'Kısmi Pay Devri',
  'Ortaklıktan Çıkış',
  'Oy Hakkı Değişikliği',
  'Kar Payı Oranı Değişikliği',
  'İmtiyazlı Pay Tanımı',
  'İmtiyazlı Pay Kaldırma',
  'Düzeltme Kaydı',
  'Ters Kayıt',
])

function isInitialPartnershipEntryType(value: unknown) {
  return value === 'initial_partnership_entry'
}

const REPRESENTATIVE_ONLY_FIELDS = [
  'signature_authority',
  'bank_authority',
  'gib_authority',
  'sgk_authority',
  'contract_authority',
  'responsible_manager',
  'legal_representative',
]

export async function nextTransactionNo(supabase: ReturnType<typeof createServiceClient>) {
  const prefix = `OI-${new Date().getFullYear()}`
  const { count } = await supabase
    .from('ownership_transactions')
    .select('id', { count: 'exact', head: true })
  return `${prefix}-${String((count || 0) + 1).padStart(5, '0')}`
}

export async function validateDraft(supabase: ReturnType<typeof createServiceClient>, data: Record<string, any>) {
  const warnings: string[] = []
  if (!ALLOWED_TRANSACTION_TYPES.has(data.transaction_type)) {
    return { ok: false, code: 'TRANSACTION_TYPE_OUT_OF_SCOPE', error: 'Bu işlem tipi Ortaklık İşlemleri kapsamında değildir', warnings }
  }
  if (REPRESENTATIVE_ONLY_FIELDS.some(field => field in data)) {
    return { ok: false, code: 'REPRESENTATIVE_FIELD_NOT_ALLOWED', error: 'Temsil yetkisi alanları Ortaklık İşlemleri içinde kullanılamaz. Temsilciler modülünü kullanın.', warnings }
  }

  const { data: company } = await supabase.from('companies').select('id').eq('id', data.company_id).maybeSingle()
  if (!company) return { ok: false, code: 'COMPANY_NOT_FOUND', error: 'Şirket bulunamadı', warnings }

  const initialPartnershipEntry = isInitialPartnershipEntryType(data.transaction_type)
  const requiredPartnerIds = Array.from(new Set([data.from_partner_id, data.to_partner_id, data.affected_partner_id].filter(Boolean)))
  if (requiredPartnerIds.length) {
    let partnersQuery = supabase
      .from('company_partners')
      .select('id,company_id,record_status,status')
      .in('id', requiredPartnerIds)
    if (!initialPartnershipEntry) {
      partnersQuery = partnersQuery.eq('company_id', data.company_id)
    }
    const { data: partners } = await partnersQuery
    if ((partners || []).length !== requiredPartnerIds.length) {
      return { ok: false, code: 'PARTNER_NOT_FOUND', error: 'Seçilen ortak şirket ortakları arasında bulunamadı', warnings }
    }
  }

  if (['Pay Devri', 'Kısmi Pay Devri'].includes(data.transaction_type) && (!data.from_partner_id || !data.to_partner_id)) {
    return { ok: false, code: 'PARTIES_REQUIRED', error: 'Pay devri için devreden ve devralan ortak zorunludur', warnings }
  }
  if (initialPartnershipEntry && !data.to_partner_id) {
    return { ok: false, code: 'NEW_PARTNER_REQUIRED', error: 'İlk ortaklık girişi için taslak ortak seçilmelidir', warnings }
  }
  if (data.transaction_type === 'Ortaklıktan Çıkış' && !data.from_partner_id) {
    return { ok: false, code: 'EXIT_PARTNER_REQUIRED', error: 'Ortaklıktan çıkış için çıkan ortak seçilmelidir', warnings }
  }
  if (['Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'].includes(data.transaction_type) && data.from_partner_id && Number(data.share_ratio || 0) > 0) {
    const { data: ownership } = await supabase
      .from('v_current_ownership')
      .select('current_share_ratio')
      .eq('company_id', data.company_id)
      .eq('partner_id', data.from_partner_id)
      .maybeSingle()
    const currentShare = Number(ownership?.current_share_ratio || 0)
    if (currentShare > 0 && currentShare < Number(data.share_ratio || 0)) {
      return { ok: false, code: 'INSUFFICIENT_SHARE', error: 'Devreden ortağın mevcut payı devredilen paydan küçük olamaz', warnings }
    }
    if (currentShare === 0) warnings.push('Devreden ortağın onaylı işlem kaynaklı payı bulunamadı')
  }

  const { data: currentRows } = await supabase
    .from('v_current_ownership')
    .select('partner_id,current_share_ratio,current_voting_ratio')
    .eq('company_id', data.company_id)
  const totalShare = (currentRows || []).reduce((sum, row) => sum + Number(row.current_share_ratio || 0), 0)
  const totalVoting = (currentRows || []).reduce((sum, row) => sum + Number(row.current_voting_ratio || 0), 0)

  if (initialPartnershipEntry) {
    const newPartnerId = data.to_partner_id || data.affected_partner_id
    const currentPartnerShare = Number((currentRows || []).find(row => row.partner_id === newPartnerId)?.current_share_ratio || 0)
    const requestedShare = Number(data.share_ratio || 0)

    if (currentPartnerShare > 0) {
      return { ok: false, code: 'PARTNER_ALREADY_HAS_ACTIVE_SHARE', error: 'Seçilen ortağın aktif hisse hakkı bulunduğu için İlk Ortaklık Girişi yapılamaz', warnings }
    }
    if (totalShare >= 99.99) {
      return { ok: false, code: 'OWNERSHIP_FULLY_DISTRIBUTED', error: 'Şirketin yürürlükteki onaylı hisse dağılımı %100 olduğu için İlk Ortaklık Girişi yapılamaz', warnings }
    }
    if (requestedShare > 0 && totalShare + requestedShare > 100.01) {
      return { ok: false, code: 'SHARE_RATIO_EXCEEDS_REMAINING', error: `Girilen hisse oranı kalan dağıtılabilir payı aşıyor. Kalan pay: %${Math.max(0, 100 - totalShare).toLocaleString('tr-TR', { maximumFractionDigits: 4 })}`, warnings }
    }
  }

  if (totalShare > 0 && Math.abs(totalShare - 100) > 0.01) warnings.push('Toplam hisse 100% değil')
  if (totalVoting > 0 && Math.abs(totalVoting - 100) > 0.01) warnings.push('Toplam oy hakkı 100% değil')

  return { ok: true, warnings }
}
