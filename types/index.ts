// ══════════════════════════════════════════════════════════════
// EDEN ERP — Merkezi Tip Tanımları
// ══════════════════════════════════════════════════════════════

// ── Auth ──────────────────────────────────────────────────────
export interface Kullanici {
  id: string
  email?: string
  telefon?: string
  ad: string
  soyad: string
  rol: KullaniciRol
  birim_id?: string
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

// ── Teşkilat ──────────────────────────────────────────────────
export interface Sirket {
  id: string
  ad: string
  vergi_no?: string
  adres?: string
  aktif: boolean
  created_at: string
}

export interface Birim {
  id: string
  sirket_id: string
  ust_birim_id?: string
  ad: string
  tip: BirimTip
  aktif: boolean
  created_at: string
  // İlişkiler
  sirket?: Sirket
  ust_birim?: Birim
  alt_birimler?: Birim[]
  kadrolar?: NormKadro[]
}

export type BirimTip =
  | 'sirket'
  | 'genel_mudurluk'
  | 'mudurluk'
  | 'departman'
  | 'bolum'
  | 'takim'

// ── Norm Kadro ────────────────────────────────────────────────
export interface NormKadro {
  id: string
  birim_id: string
  unvan: string
  aciklama?: string
  amir: boolean
  durum: KadroDurum
  butce?: number
  personel_id?: string
  created_at: string
  // İlişkiler
  birim?: Birim
  personel?: Personel
}

export type KadroDurum = 'dolu' | 'acik' | 'dondurulmus'

// ── Personel ──────────────────────────────────────────────────
export interface Personel {
  id: string
  // Kişisel
  ad: string
  soyad: string
  uyruk: 'tc' | 'yabanci'
  tc_kimlik?: string
  pasaport_no?: string
  cinsiyet: 'erkek' | 'kadin'
  dogum_yeri?: string
  dogum_tarihi?: string
  kan_grubu?: KanGrubu
  askerlik_durumu?: AskerlikDurum
  engellilik: boolean
  hukumluluk: boolean
  // İletişim
  cep_telefonu?: string
  is_telefonu?: string
  ev_telefonu?: string
  email?: string
  adres?: string
  il?: string
  ilce?: string
  // Acil
  acil_kisi_ad?: string
  acil_kisi_soyad?: string
  acil_kisi_yakinlik?: string
  acil_kisi_telefon?: string
  // İş
  sgk_giris?: string
  calisma_durumu: PersonelDurum
  birim_id?: string
  kadro_id?: string
  // Kıyafet
  ust_beden?: string
  alt_beden?: string
  ayakkabi?: string
  kep?: string
  // Banka
  iban?: string
  // Meta
  notlar?: string
  fotograf_url?: string
  created_at: string
  updated_at: string
  // İlişkiler
  birim?: Birim
  kadro?: NormKadro
}

export type PersonelDurum = 'gorevde' | 'izinde' | 'ayrilmis' | 'askida'
export type KanGrubu = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | '0+' | '0-'
export type AskerlikDurum = 'muaf' | 'caginda_degil' | 'tecilli' | 'belirsiz' | 'bakaya' | 'yapti'

// ── Muhasebe ──────────────────────────────────────────────────
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
  | 'İdari'
  | 'Sermaye'
  | 'Aktarım'
  | 'Finansal'
  | 'Destek'
  | 'Yatırım'

export type IslemTarafi = 'Eden' | 'İsmail ILGAR' | 'Canberk' | 'Ergün'
export type HesapTipi = 'Vadesiz' | 'Yatırım' | 'Kredi Kartı' | 'Nakit' | 'Bonus'

// ── API Response ──────────────────────────────────────────────
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

// ── Widget ────────────────────────────────────────────────────
export interface Widget {
  id: string
  tip: WidgetTip
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
