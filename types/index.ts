// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EDEN ERP â€” Merkezi Tip TanÄ±mlarÄ±
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Kullanici {
  id: string
  email?: string
  telefon?: string
  ad: string
  last_name: string
  rol: KullaniciRol
  unit_id?: string
  avatar_url?: string
  son_giris?: string
  created_at: string
}

export type KullaniciRol =
  | 'super_admin'
  | 'yonetici'
  | 'ik_muduru'
  | 'ik_personeli'
  | 'muhasebe_muduru'
  | 'muhasebe_personeli'
  | 'calisma_arkadasi'
  | 'izleyici'

// â”€â”€ TeÅŸkilat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Sirket {
  id: string
  ad: string
  vergi_no?: string
  address?: string
  active: boolean
  created_at: string
}

export interface Birim {
  id: string
  company_id: string
  parent_unit_id?: string
  name: string
  type: BirimTip
  active: boolean
  created_at: string
  // Ä°liÅŸkiler
  sirket?: Sirket
  ust_birim?: Birim
  alt_birimler?: Birim[]
  positions?: NormKadro[]
}

export type BirimTip =
  | 'company'
  | 'headquarters'
  | 'management'
  | 'department'
  | 'division'
  | 'team'

// â”€â”€ Norm Kadro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface NormKadro {
  id: string
  unit_id: string
  title: string
  aciklama?: string
  is_manager: boolean
  status: KadroDurum
  budget_amount?: number
  employee_id?: string
  created_at: string
  // Ä°liÅŸkiler
  unit?: Birim
  employees?: Personel
}

export type KadroDurum = 'filled' | 'open' | 'frozen'

// â”€â”€ Personel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Personel {
  id: string
  // KiÅŸisel
  first_name: string
  last_name: string
  nationality: string
  national_id?: string
  passport_no?: string
  gender: 'male' | 'female'
  birth_place?: string
  birth_date?: string
  blood_type?: KanGrubu
  military_status?: AskerlikDurum
  deferment_date?: string
  has_disability: boolean
  disability_percentage?: number
  has_conviction: boolean
  // Ä°letiÅŸim
  phones?: Array<Record<string, unknown>>
  emails?: Array<Record<string, unknown>>
  mobile_phone?: string
  work_phone?: string
  home_phone?: string
  email?: string
  address?: string
  city?: string
  district?: string
  // Acil
  emergency_contact_first_name?: string
  emergency_contact_last_name?: string
  emergency_contact_relationship?: string
  emergency_contact_phone?: string
  // Ä°ÅŸ
  sgk_entry_date?: string
  entry_date?: string
  exit_date?: string
  sgk_entry_method?: 'servis' | 'web'
  sgk_entry_reference_no?: string
  sgk_entry_reported_by?: string
  sgk_entry_insurance_branch?: string
  sgk_entry_duty_code?: string
  sgk_entry_occupation_code?: string
  sgk_entry_csgb_business_line?: string
  sgk_entry_has_disability?: 'E' | 'H'
  sgk_entry_has_prior_conviction?: 'E' | 'H'
  sgk_entry_education_code?: string
  sgk_entry_graduation_year?: string
  sgk_entry_graduation_department?: string
  sgk_entry_partial_day_count?: string
  sgk_exit_method?: 'servis' | 'web'
  sgk_exit_reference_no?: string
  sgk_exit_reported_by?: string
  sgk_exit_reason?: string
  sgk_exit_occupation_code?: string
  sgk_exit_csgb_business_line?: string
  sgk_exit_percentage_wage_method?: 'E' | 'H'
  sgk_exit_previous_document_type?: string
  sgk_exit_previous_earned_wage?: string
  sgk_exit_current_document_type?: string
  sgk_exit_current_earned_wage?: string
  work_status: PersonelDurum
  work_type?: string
  record_status?: 'draft' | 'active' | 'passive'
  employment_status?: string
  employment_type?: string
  duration_type?: string
  sgk_responsibility?: string
  work_arrangement?: string
  employment_contract_type?: string
  marital_status?: MedeniDurum
  company_id?: string
  unit_id?: string
  position_id?: string
  job_title?: string
  is_illiterate?: boolean
  education_schools?: Array<Record<string, unknown>>
  foreign_languages?: Array<Record<string, unknown>>
  certificates?: Array<Record<string, unknown>>
  relatives?: Array<Record<string, unknown>>
  entry_documents?: Array<Record<string, unknown>>
  exit_documents?: Array<Record<string, unknown>>
  // KÄ±yafet
  top_size?: string
  bottom_size?: string
  shoe_size?: string
  kep?: string
  // Banka
  iban?: string
  // Meta
  notes?: string
  photo_url?: string
  cv_document?: Record<string, unknown> | null
  diploma_document?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  is_deleted?: boolean
  field_history?: Record<string, Array<{ value: unknown; date: string; user?: string }>>
  // Ä°liÅŸkiler
  unit?: Birim
  position?: NormKadro
}

export type PersonelDurum = 'active' | 'on_leave' | 'terminated' | 'suspended'
export type KanGrubu = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | '0+' | '0-'
export type MedeniDurum = 'single' | 'married'
export type AskerlikDurum = 'muaf' | 'caginda_degil' | 'tecilli' | 'belirsiz' | 'bakaya' | 'yapti'

// â”€â”€ Muhasebe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface NakitIslem {
  id: string
  tarih: string
  gelir: number
  gider: number
  aciklama: string
  proje: Proje
  belge_no?: string
  islem_tarafi: IslemTarafi
  karsi_taraf?: string
  banka?: string
  hesap_tipi?: HesapTipi
  hesap_no?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type Proje =
  | 'PG'
  | 'EPIRB'
  | 'Otel'
  | 'Ä°dari'
  | 'Sermaye'
  | 'AktarÄ±m'
  | 'Finansal'
  | 'Destek'
  | 'YatÄ±rÄ±m'

export type IslemTarafi = 'Eden' | 'Ä°smail ILGAR' | 'Canberk' | 'ErgÃ¼n'
export type HesapTipi = 'Vadesiz' | 'YatÄ±rÄ±m' | 'Kredi KartÄ±' | 'Nakit' | 'Bonus'

// â”€â”€ API Response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// â”€â”€ Widget â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Widget {
  id: string
  type: WidgetTip
  baslik: string
  modul: string
  gerekli_rol: KullaniciRol[]
  konum: { x: number; y: number; w: number; h: number }
}

export type WidgetTip =
  | 'ik_ozeti'
  | 'kadro_doluluk'
  | 'nakit_akisi_kpi'
  | 'son_islemler'
  | 'borc_ozeti'
  | 'duyurular'
  | 'gorevlerim'
  | 'ticketlar'
