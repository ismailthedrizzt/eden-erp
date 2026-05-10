import { createServiceClient } from '@/lib/supabase/server'

const ALLOWED_TRANSACTION_TYPES = new Set([
  'Yeni Ortak Girişi',
  'Pay Devri',
  'Kısmi Pay Devri',
  'Ortaklıktan Çıkış',
  'Sermaye Taahhüdü',
  'Sermaye Artırımı',
  'Sermaye Azaltımı',
  'Oy Hakkı Değişikliği',
  'Kar Payı Oranı Değişikliği',
  'İmtiyazlı Pay Tanımı',
  'İmtiyazlı Pay Kaldırma',
  'Düzeltme Kaydı',
  'Ters Kayıt',
])

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

  const { data: company } = await supabase.from('sirketler').select('id').eq('id', data.company_id).maybeSingle()
  if (!company) return { ok: false, code: 'COMPANY_NOT_FOUND', error: 'Şirket bulunamadı', warnings }

  const requiredPartnerIds = [data.from_partner_id, data.to_partner_id, data.affected_partner_id].filter(Boolean)
  if (requiredPartnerIds.length) {
    const { data: partners } = await supabase
      .from('sirket_ortaklar')
      .select('id')
      .eq('sirket_id', data.company_id)
      .in('id', requiredPartnerIds)
    if ((partners || []).length !== requiredPartnerIds.length) {
      return { ok: false, code: 'PARTNER_NOT_FOUND', error: 'Seçilen ortak şirket ortakları arasında bulunamadı', warnings }
    }
  }

  if (['Pay Devri', 'Kısmi Pay Devri'].includes(data.transaction_type) && (!data.from_partner_id || !data.to_partner_id)) {
    return { ok: false, code: 'PARTIES_REQUIRED', error: 'Pay devri için devreden ve devralan ortak zorunludur', warnings }
  }
  if (data.transaction_type === 'Yeni Ortak Girişi' && !data.to_partner_id) {
    return { ok: false, code: 'NEW_PARTNER_REQUIRED', error: 'Yeni ortak girişi için devralan/yeni ortak seçilmelidir', warnings }
  }
  if (data.transaction_type === 'Ortaklıktan Çıkış' && !data.from_partner_id) {
    return { ok: false, code: 'EXIT_PARTNER_REQUIRED', error: 'Ortaklıktan çıkış için çıkan ortak seçilmelidir', warnings }
  }
  if (data.transaction_type === 'Sermaye Taahhüdü' && (!data.affected_partner_id || Number(data.committed_capital_amount || 0) <= 0)) {
    return { ok: false, code: 'CAPITAL_COMMITMENT_REQUIRED', error: 'Sermaye taahhüdü için ortak ve taahhüt edilen sermaye zorunludur', warnings }
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
    .select('current_share_ratio,current_voting_ratio')
    .eq('company_id', data.company_id)
  const totalShare = (currentRows || []).reduce((sum, row) => sum + Number(row.current_share_ratio || 0), 0)
  const totalVoting = (currentRows || []).reduce((sum, row) => sum + Number(row.current_voting_ratio || 0), 0)
  if (totalShare > 0 && Math.abs(totalShare - 100) > 0.01) warnings.push('Toplam hisse 100% değil')
  if (totalVoting > 0 && Math.abs(totalVoting - 100) > 0.01) warnings.push('Toplam oy hakkı 100% değil')

  return { ok: true, warnings }
}
