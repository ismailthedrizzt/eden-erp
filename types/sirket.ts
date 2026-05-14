/**
 * Şirket (Company) Types
 * 
 * Company entity definitions for the ERP system
 */

export interface Sirket {
  id: string
  
  // Kimlik - Identity
  ticari_unvan: string
  kisa_unvan: string
  vkn_tckn: string
  vergi_dairesi: string
  
  // Tescil - Registration
  mersis_no?: string
  ticaret_sicil_no?: string
  kurulus_tarihi?: string
  electronic_notification_address?: string
  trade_registry_office?: string
  sirket_turu?: 'anonim' | 'limited' | 'komandit' | 'kolektif' | 'adi_komandit' | 'adi_sirket'
  
  // Adres - Address
  ulke: string
  il: string
  ilce: string
  adres: string
  
  // Iletisim - Contact
  telefon?: string
  email?: string
  web_sitesi?: string
  
  // Kurumsal Kimlik - Corporate Identity
  legal_entity?: string
  parent_company_id?: string
  sirket_kodu?: string
  
  // Vergi ve SGK - Tax and SGK
  e_fatura_mukellefi: boolean
  e_arsiv_mukellefi: boolean
  e_irsaliye_mukellefi: boolean
  sgk_is_yeri_sicil_no?: string
  sgk_il?: string
  sgk_sube?: string
  nace_kodlari?: string[]
  tehlike_sinifi?: 'az_tehlikeli' | 'tehlikeli' | 'cok_tehlikeli'
  
  // ERP Ayarlari - ERP Settings
  varsayilan_para_birimi: string
  varsayilan_dil: string
  zaman_dilimi: string
  mali_yil_baslangici: number
  is_deleted?: boolean
  hero_images?: Array<Record<string, unknown>>
  hero_documents?: Array<Record<string, unknown>>
  beneficiary_full_name?: string
  beneficiary_address?: string
  beneficiary_iban?: string
  beneficiary_account_no?: string
  beneficiary_iban_or_account_no?: string
  beneficiary_bank_code?: string
  beneficiary_swift_bic?: string
  beneficiary_bank_name?: string
  beneficiary_bank_address?: string
  beneficiary_currency?: string
  
  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  field_history?: Record<string, Array<{ value: unknown; date: string; user?: string }>>
  
  // Related Entities (for form handling)
  ortaklar?: SirketOrtak[]
  temsilciler?: SirketTemsilci[]
  logolar?: SirketLogo[]
  dokumanlar?: SirketDokuman[]
  public_tax?: CompanyPublicTax | CompanyPublicTax[]
  public_sgk?: CompanyPublicSgk | CompanyPublicSgk[]
  public_incentives?: CompanyPublicIncentives | CompanyPublicIncentives[]
  public_registry?: CompanyPublicRegistry | CompanyPublicRegistry[]
  public_licenses?: CompanyPublicLicense[]
  public_channels?: CompanyPublicChannels | CompanyPublicChannels[]
}

export interface CompanyPublicHistoryItem {
  field?: string
  old_value?: unknown
  new_value?: unknown
  changed_at?: string
  changed_by?: string
}

export interface CompanyPublicTax {
  id?: string
  company_id?: string
  tax_number?: string
  tax_office?: string
  tax_type?: string
  liability_start_date?: string
  e_invoice_taxpayer?: boolean
  e_archive_taxpayer?: boolean
  e_waybill_enabled?: boolean
  gib_user_code?: string
  has_financial_seal?: boolean
  financial_seal_expiry_date?: string
  tax_debt_tracking_active?: boolean
  last_check_date?: string
  history?: CompanyPublicHistoryItem[]
}

export interface CompanyPublicSgk {
  id?: string
  company_id?: string
  workplace_registry_no?: string
  province?: string
  branch?: string
  registration_date?: string
  nace_code?: string
  risk_class?: string
  uses_incentive?: boolean
  active_incentive_type?: string
  incentive_end_date?: string
  employee_count?: number
  debt_tracking_active?: boolean
  last_check_date?: string
  history?: CompanyPublicHistoryItem[]
}

export interface CompanyPublicIncentives {
  id?: string
  company_id?: string
  has_kosgeb_registration?: boolean
  kosgeb_no?: string
  active_support_program?: string
  application_date?: string
  result_status?: string
  incentive_type?: string
  incentive_end_date?: string
  responsible_person?: string
  notes?: string
  history?: CompanyPublicHistoryItem[]
}

export interface CompanyPublicRegistry {
  id?: string
  company_id?: string
  mersis_no?: string
  trade_registry_no?: string
  registry_office?: string
  chamber_registry_no?: string
  chamber_name?: string
  establishment_registration_date?: string
  last_change_date?: string
  liquidation_status?: string
  history?: CompanyPublicHistoryItem[]
}

export interface CompanyPublicLicense {
  id?: string
  company_id?: string
  license_type?: string
  document_no?: string
  issuing_authority?: string
  start_date?: string
  end_date?: string
  status?: string
  document_file?: string
  reminder_days?: number
  history?: CompanyPublicHistoryItem[]
  is_deleted?: boolean
  deleted_at?: string
  deleted_by?: string
}

export interface CompanyPublicChannels {
  id?: string
  company_id?: string
  kep_address?: string
  kep_provider?: string
  e_notification_address?: string
  e_notification_active?: boolean
  e_government_authority_status?: string
  official_notification_email?: string
  official_notification_phone?: string
  has_web_service_integration?: boolean
  api_notes?: string
  history?: CompanyPublicHistoryItem[]
}

export interface SirketOrtak {
  id: string
  sirket_id: string
  ad?: string
  soyad?: string
  ortak_adi: string
  ortak_tipi: 'kisi' | 'sirket'
  tckn_vkn: string
  hisse_orani: number
  imza_yetkisi: boolean
  owner_kind?: 'gercek_kisi' | 'tuzel_kisi'
  source_type?: string
  source_id?: string
  display_name?: string
  identity_number?: string
  share_class?: string
  share_units?: number
  nominal_value?: number
  capital_amount?: number
  share_ratio?: number
  voting_ratio?: number
  profit_ratio?: number
  beneficial_owner?: boolean
  is_beneficial_owner?: boolean
  beneficial_ratio?: number
  beneficial_note?: string
  is_ultimate_controller?: boolean
  has_representation_right?: boolean
  has_control_right?: boolean
  control_type?: 'Hisse Çoğunluğu' | 'Oy Çoğunluğu' | 'Sözleşmesel Kontrol' | 'Yönetim Kontrolü' | 'Altın Hisse' | 'Diğer'
  has_board_nomination_right?: boolean
  has_veto_right?: boolean
  has_privileged_share?: boolean
  start_date?: string
  end_date?: string
  status?: 'Aktif' | 'Pasif' | 'Devredildi' | 'Askıda' | 'Tasfiye Sürecinde'
  document_reference_id?: string
  notes?: string
  history?: Array<{ field: string; old_value: unknown; new_value: unknown; changed_at: string; changed_by?: string }>
  is_deleted?: boolean
  deleted_at?: string
  deleted_by?: string
}

export interface SirketTemsilci {
  id: string
  sirket_id: string
  ad_soyad?: string
  gorev?: string
  telefon?: string
  email?: string
  yetki_turu?: 'ceo' | 'mali_musavir' | 'finans_muduru' | 'ik_muduru' | 'imza_sahibi' | 'diger'
  authority_types?: string[]
  person_kind?: 'gercek_kisi' | 'tuzel_kisi'
  source_type?: string
  source_id?: string
  display_name?: string
  start_date?: string
  end_date?: string
  status?: 'Aktif' | 'Pasif' | 'Askıda' | 'Süresi Dolmuş'
  document_reference_id?: string
  notes?: string
  bank_authority_level?: string
  transaction_limit?: number
  payment_approval_limit?: number
  purchase_approval_limit?: number
  currency?: 'TRY' | 'USD' | 'EUR' | 'GBP'
  signature_type?: string
  signature_degree?: string
  requires_joint_signature?: boolean
  can_approve_alone?: boolean
  department_scope?: string
  gib_permissions?: string
  can_submit_declaration?: boolean
  can_process_e_invoice?: boolean
  sgk_permissions?: string
  can_submit_hiring_notice?: boolean
  can_submit_termination_notice?: boolean
  history?: Array<{ field: string; old_value: unknown; new_value: unknown; changed_at: string; changed_by?: string }>
  is_deleted?: boolean
  deleted_at?: string
  deleted_by?: string
}

export interface SirketDokuman {
  id: string
  sirket_id: string
  dokuman_turu: 'vergi_levhasi' | 'ticaret_sicil' | 'imza_sirkuleri' | 'faaliyet_belgesi' | 'diger'
  dosya_adi: string
  dosya_url: string
  yuklenme_tarihi: string
  yukleyen_kullanici_id: string
}

export interface SirketLogo {
  id: string
  sirket_id: string
  dosya_adi: string
  dosya_url: string
  is_primary: boolean
  yuklenme_tarihi: string
}

// Form için gerekli yapılandırılmış doküman tipleri
export const SIRKET_DOKUMAN_TIPLERI = [
  { value: 'vergi_levhasi', label: 'Vergi Levhası', required: true },
  { value: 'ticaret_sicil', label: 'Ticaret Sicil Gazetesi', required: true },
  { value: 'imza_sirkuleri', label: 'İmza Sirküleri', required: true },
  { value: 'faaliyet_belgesi', label: 'Faaliyet Belgesi', required: false },
  { value: 'diger', label: 'Diğer Belgeler', required: false }
] as const

export const SIRKET_TURLERI = [
  { value: 'anonim', label: 'Sermaye Şirketi - Anonim' },
  { value: 'limited', label: 'Sermaye Şirketi - Limited' },
  { value: 'komandit', label: 'Sermaye Şirketi - Komandit' },
  { value: 'kolektif', label: 'Şahıs Şirketi - Kolektif' },
  { value: 'adi_komandit', label: 'Şahıs Şirketi - Adi Komandit' },
  { value: 'adi_sirket', label: 'Şahıs Şirketi - Adi Şirket' }
] as const

export const TEHLIKE_SINIFLARI = [
  { value: 'az_tehlikeli', label: 'Az Tehlikeli' },
  { value: 'tehlikeli', label: 'Tehlikeli' },
  { value: 'cok_tehlikeli', label: 'Çok Tehlikeli' }
] as const

export const TEMSILCI_ROLLERI = [
  { value: 'ceo', label: 'CEO' },
  { value: 'mali_musavir', label: 'Mali Müşavir' },
  { value: 'finans_muduru', label: 'Finans Müdürü' },
  { value: 'ik_muduru', label: 'İK Müdürü' },
  { value: 'imza_sahibi', label: 'Yetkili İmza Sahibi' },
  { value: 'diger', label: 'Diğer' }
] as const

export const PARA_BIRIMLERI = [
  { value: 'TRY', label: 'TRY - Türk Lirası' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' }
] as const

export const DILLER = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' }
] as const
