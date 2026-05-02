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
  is_active: boolean
  hero_images?: Array<Record<string, unknown>>
  hero_documents?: Array<Record<string, unknown>>
  
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
}

export interface SirketTemsilci {
  id: string
  sirket_id: string
  ad_soyad: string
  gorev: string
  telefon?: string
  email?: string
  yetki_turu: 'ceo' | 'mali_musavir' | 'finans_muduru' | 'ik_muduru' | 'imza_sahibi' | 'diger'
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
