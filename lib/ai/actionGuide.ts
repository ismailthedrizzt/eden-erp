import { PERMISSIONS } from '@/packages/shared/src'

export type ActionGuideIntent =
  | 'create_company_draft'
  | 'company_opening'
  | 'company_liquidation'
  | 'company_deregistration'
  | 'capital_increase'
  | 'capital_decrease'
  | 'title_change'
  | 'address_change'
  | 'public_registration_update'
  | 'nace_change'
  | 'activity_subject_change'
  | 'create_partner_draft'
  | 'initial_partnership_entry'
  | 'share_transfer'
  | 'ownership_exit'
  | 'partner_rights_change'
  | 'ownership_correction'
  | 'create_representative_draft'
  | 'representative_start'
  | 'representative_authority_renewal'
  | 'representative_authority_scope_change'
  | 'representative_limit_change'
  | 'representative_suspend'
  | 'representative_terminate'
  | 'branch_opening'
  | 'branch_closing'
  | 'branch_document_update'
  | 'branch_view'
  | 'branch_location_link'
  | 'branch_organization_link'
  | 'create_organization_unit'
  | 'assign_staff_to_unit'
  | 'manage_positions'
  | 'branch_staff_management'
  | 'create_facility'
  | 'link_facility_to_branch'
  | 'deactivate_facility'

export type ActionGuideAction = {
  label: string
  action_type: 'navigate' | 'open_wizard' | 'start_create' | 'focus_record'
  target_page?: string
  wizard_key?: string
  record_id?: string | null
  record_type?: string | null
  disabled?: boolean
  reason?: string
}

export type ActionGuideContext = {
  currentPage?: string | null
  selectedRecordId?: string | null
  selectedRecordType?: string | null
  selectedRecordStatus?: string | null
  userPermissions?: string[]
  tenantId?: string | null
  activeCompanyId?: string | null
  activeBranchId?: string | null
  route?: string | null
  queryParams?: Record<string, string>
  availableModules?: string[]
}

export type ActionGuideResult = {
  intent: ActionGuideIntent
  confidence: number
  title: string
  explanation: string
  steps: string[]
  target_page: string
  required_record_type?: string | null
  required_record_status?: string | null
  can_start_now: boolean
  blocking_reasons: string[]
  suggested_actions: ActionGuideAction[]
}

type IntentDefinition = {
  intent: ActionGuideIntent
  title: string
  explanation: string
  targetPage: string
  keywords: string[]
  steps: string[]
  requiredRecordType?: string
  requiredRecordStatus?: string
  requiredPermission?: string
  wizardKey?: string
  createAction?: boolean
}

const INTENTS: IntentDefinition[] = [
  {
    intent: 'branch_opening',
    title: 'Şube Açılışı',
    explanation: 'Şube açılışı aktif şirket kartından başlatılır.',
    targetPage: '/app/sirket/companies',
    keywords: ['sube ac', 'sube acilisi', 'yeni sube', 'ofis ac', 'operasyon noktasi ac'],
    steps: ['Şirketlerimiz sayfasına gidin.', 'Aktif şirketi açın.', 'Resmi Değişiklikler > Şube Açılışı işlemini başlatın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'active',
    requiredPermission: PERMISSIONS.branches.openingStart,
    wizardKey: 'branch_opening',
  },
  {
    intent: 'branch_closing',
    title: 'Şube Kapanışı',
    explanation: 'Şube kapanışı aktif şirket veya açık şube kaydı üzerinden resmi işlem olarak yapılır.',
    targetPage: '/app/sirket/companies/branches',
    keywords: ['sube kapat', 'sube kapanisi', 'ofis kapat'],
    steps: ['Şubelerimiz sayfasına gidin veya şirket detayını açın.', 'Kapatılacak aktif şubeyi seçin.', 'Şube Kapanışı işlemini başlatın.'],
    requiredRecordType: 'branch',
    requiredRecordStatus: 'active',
    requiredPermission: PERMISSIONS.branches.closingStart,
    wizardKey: 'branch_closing',
  },
  {
    intent: 'branch_document_update',
    title: 'Şube Belgelerini Güncelleme',
    explanation: 'Şube belgeleri kart editinden değil ayrı belge güncelleme işlemiyle eklenir.',
    targetPage: '/app/sirket/companies/branches',
    keywords: ['sube belge', 'sube belgeleri', 'sube evrak', 'sube dokuman'],
    steps: ['Şubelerimiz sayfasına gidin.', 'İlgili şubeyi açın.', 'Şube Belgelerini Güncelle işlemini başlatın.'],
    requiredRecordType: 'branch',
    requiredPermission: PERMISSIONS.branches.documentsUpdate,
    wizardKey: 'branch_document_update',
  },
  {
    intent: 'create_company_draft',
    title: 'Şirket Taslağı Oluşturma',
    explanation: '+ Ekle şirket kartı taslağı oluşturur. Resmi açılış ayrıca Şirket Açılışı sihirbazıyla tamamlanır.',
    targetPage: '/app/sirket/companies',
    keywords: ['yeni sirket', 'sirket ekle', 'sirket taslagi', 'firma ekle'],
    steps: ['Şirketlerimiz sayfasına gidin.', '+ Ekle ile şirket kartı taslağı oluşturun.', 'Resmi açılış için Şirket Açılışı sihirbazını başlatın.'],
    requiredPermission: PERMISSIONS.companies.insert,
    createAction: true,
  },
  {
    intent: 'company_opening',
    title: 'Şirket Açılışı',
    explanation: 'Taslak şirket, Şirket Açılışı sihirbazıyla aktif hale gelir.',
    targetPage: '/app/sirket/companies',
    keywords: ['sirket acilisi', 'sirket aktif', 'taslak sirket aktif', 'kurulus'],
    steps: ['Şirketlerimiz sayfasında taslak şirketi açın.', 'Yaşam Dönemi > Şirket Açılışı işlemini başlatın.', 'Sihirbazdaki bilgileri onaylayın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'draft',
    requiredPermission: PERMISSIONS.companies.openingStart,
    wizardKey: 'company_opening',
  },
  {
    intent: 'company_liquidation',
    title: 'Şirket Tasfiyesi',
    explanation: 'Aktif şirketin tasfiye süreci Yaşam Dönemi işlemlerinden başlatılır.',
    targetPage: '/app/sirket/companies',
    keywords: ['tasfiye', 'sirket tasfiyesi', 'tasfiyeye al'],
    steps: ['Şirketlerimiz sayfasında aktif şirketi açın.', 'Yaşam Dönemi > Tasfiye işlemini başlatın.', 'Karar ve süreç bilgilerini sihirbazda onaylayın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'active',
    requiredPermission: PERMISSIONS.companies.liquidationStart,
    wizardKey: 'company_liquidation',
  },
  {
    intent: 'company_deregistration',
    title: 'Şirket Terkini',
    explanation: 'Terkin işlemi şirket kartından doğrudan silme değil, resmi kapanış sihirbazıdır.',
    targetPage: '/app/sirket/companies',
    keywords: ['terkin', 'sirket kapatma', 'sirket kapanisi', 'sicilden sil'],
    steps: ['Şirketlerimiz sayfasında ilgili şirketi açın.', 'Yaşam Dönemi > Terkin işlemini başlatın.', 'Sihirbazdaki resmi kapanış bilgilerini onaylayın.'],
    requiredRecordType: 'company',
    requiredPermission: PERMISSIONS.companies.deregistrationStart,
    wizardKey: 'company_deregistration',
  },
  {
    intent: 'capital_increase',
    title: 'Sermaye Artırımı',
    explanation: 'Sermaye artışı aktif şirket kartından resmi işlem sihirbazıyla yapılır.',
    targetPage: '/app/sirket/companies',
    keywords: ['sermaye artir', 'sermaye artirimi', 'kapital artir'],
    steps: ['Şirketlerimiz sayfasına gidin.', 'Aktif şirketi açın.', 'Resmi Değişiklikler > Sermaye Artırımı işlemini başlatın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'active',
    requiredPermission: 'companies.edit',
    wizardKey: 'capital_increase',
  },
  {
    intent: 'capital_decrease',
    title: 'Sermaye Azaltımı',
    explanation: 'Sermaye azaltımı aktif şirket kartından resmi işlem sihirbazıyla yapılır.',
    targetPage: '/app/sirket/companies',
    keywords: ['sermaye azalt', 'sermaye azaltimi'],
    steps: ['Şirketlerimiz sayfasına gidin.', 'Aktif şirketi açın.', 'Resmi Değişiklikler > Sermaye Azaltımı işlemini başlatın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'active',
    requiredPermission: 'companies.edit',
    wizardKey: 'capital_decrease',
  },
  {
    intent: 'address_change',
    title: 'Adres Değişikliği',
    explanation: 'Aktif şirket adresi formdan değil Adres Değişikliği sihirbazıyla değiştirilir.',
    targetPage: '/app/sirket/companies',
    keywords: ['adres degistir', 'sirket adresi', 'adres guncelle'],
    steps: ['Şirketlerimiz sayfasına gidin.', 'Aktif şirketi açın.', 'Resmi Değişiklikler > Adres Değişikliği işlemini başlatın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'active',
    requiredPermission: 'companies.edit',
    wizardKey: 'address_change',
  },
  {
    intent: 'title_change',
    title: 'Unvan Değişikliği',
    explanation: 'Aktif şirket unvanı formdan değil Unvan Değişikliği sihirbazıyla değiştirilir.',
    targetPage: '/app/sirket/companies',
    keywords: ['unvan degistir', 'ticari unvan', 'sirket adi degistir'],
    steps: ['Şirketlerimiz sayfasına gidin.', 'Aktif şirketi açın.', 'Resmi Değişiklikler > Unvan Değişikliği işlemini başlatın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'active',
    requiredPermission: 'companies.edit',
    wizardKey: 'title_change',
  },
  {
    intent: 'public_registration_update',
    title: 'Kamu / Tescil Bilgisi Güncelleme',
    explanation: 'Vergi dairesi, sicil ve kamu referans bilgileri resmi güncelleme sihirbazıyla değiştirilir.',
    targetPage: '/app/sirket/companies',
    keywords: ['tescil', 'kamu bilgi', 'vergi dairesi', 'mersis', 'sgk sicil'],
    steps: ['Şirketlerimiz sayfasına gidin.', 'Aktif şirketi açın.', 'Resmi Değişiklikler > Kamu / Tescil Bilgisi Güncelleme işlemini başlatın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'active',
    requiredPermission: 'companies.edit',
    wizardKey: 'public_registration_update',
  },
  {
    intent: 'nace_change',
    title: 'NACE / Faaliyet Kodu Güncelleme',
    explanation: 'Sadece faaliyet kodu veya kamu kaydı güncellenecekse NACE sihirbazı kullanılır.',
    targetPage: '/app/sirket/companies',
    keywords: ['nace', 'faaliyet kodu', 'sgk tehlike', 'risk sinifi'],
    steps: ['Şirketlerimiz sayfasına gidin.', 'Aktif şirketi açın.', 'Resmi Değişiklikler > NACE / Faaliyet Kodu Güncelleme işlemini başlatın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'active',
    requiredPermission: 'companies.edit',
    wizardKey: 'nace_change',
  },
  {
    intent: 'activity_subject_change',
    title: 'Faaliyet Konusu Değişikliği',
    explanation: 'Şirketin esas faaliyet alanı değişiyorsa Faaliyet Konusu Değişikliği sihirbazı kullanılır.',
    targetPage: '/app/sirket/companies',
    keywords: ['faaliyet konusu', 'esas sozlesme', 'ana faaliyet', 'is konusu'],
    steps: ['Şirketlerimiz sayfasına gidin.', 'Aktif şirketi açın.', 'Resmi Değişiklikler > Faaliyet Konusu Değişikliği işlemini başlatın.'],
    requiredRecordType: 'company',
    requiredRecordStatus: 'active',
    requiredPermission: 'companies.edit',
    wizardKey: 'activity_subject_change',
  },
  {
    intent: 'create_partner_draft',
    title: 'Ortak Kartı Taslağı',
    explanation: '+ Ekle ortak kartı taslağı oluşturur. Ortaklık hakları ayrıca ortaklık işlemleriyle tanımlanır.',
    targetPage: '/app/sirket/companies/partners',
    keywords: ['yeni ortak', 'ortak ekle', 'ortak taslagi'],
    steps: ['Ortaklarımız sayfasına gidin.', '+ Ekle ile ortak kartı taslağı oluşturun.', 'Pay ve hak bilgileri için İlk Ortaklık Girişi işlemini kullanın.'],
    requiredPermission: 'partners.edit',
    createAction: true,
  },
  {
    intent: 'initial_partnership_entry',
    title: 'İlk Ortaklık Girişi',
    explanation: 'Pay oranı, oy hakkı, kar payı ve sermaye ilişkisi ortaklık işlemiyle oluşturulur.',
    targetPage: '/app/sirket/companies/partners',
    keywords: ['ilk ortaklik', 'pay orani', 'oy hakki', 'kar payi', 'ortaklik hakki'],
    steps: ['Ortaklarımız sayfasında ortak kartını açın.', 'İlk Ortaklık Girişi işlemini başlatın.', 'Pay, oy hakkı ve sermaye bilgilerini sihirbazda onaylayın.'],
    requiredRecordType: 'partner',
    requiredPermission: 'partners.edit',
    wizardKey: 'initial_partnership_entry',
  },
  {
    intent: 'share_transfer',
    title: 'Pay Devri',
    explanation: 'Pay devri ortak kartı editinden değil ortaklık işlemiyle yapılır.',
    targetPage: '/app/sirket/companies/partners',
    keywords: ['pay devri', 'hisse devri', 'ortak pay aktar'],
    steps: ['Ortaklarımız sayfasına gidin.', 'İlgili ortak kaydını açın.', 'Pay Devri işlemini başlatın.'],
    requiredRecordType: 'partner',
    requiredPermission: 'partners.edit',
    wizardKey: 'share_transfer',
  },
  {
    intent: 'ownership_exit',
    title: 'Ortaklıktan Çıkış',
    explanation: 'Aktif ortak doğrudan silinmez; ortaklıktan çıkış resmi ortaklık işlemiyle yapılır.',
    targetPage: '/app/sirket/companies/partners',
    keywords: ['ortakliktan cikis', 'ortak cikisi', 'ortak sil', 'ortak ayrildi'],
    steps: ['Ortaklarımız sayfasında ortak kaydını açın.', 'Ortaklıktan Çıkış işlemini başlatın.', 'Etki ve pay bilgilerini sihirbazda onaylayın.'],
    requiredRecordType: 'partner',
    requiredPermission: 'partners.edit',
    wizardKey: 'ownership_exit',
  },
  {
    intent: 'partner_rights_change',
    title: 'Ortaklık Hakları Değişikliği',
    explanation: 'Oy hakkı, kar payı ve benzeri ortaklık hakları karttan değil ortaklık işlemiyle değiştirilir.',
    targetPage: '/app/sirket/companies/partners',
    keywords: ['ortak hak', 'oy hakki degistir', 'kar payi degistir', 'ortaklik haklari'],
    steps: ['Ortaklarımız sayfasında ortak kaydını açın.', 'Ortaklık haklarıyla ilgili işlemi başlatın.', 'Yeni hakları sihirbazda onaylayın.'],
    requiredRecordType: 'partner',
    requiredPermission: 'partners.edit',
    wizardKey: 'partner_rights_change',
  },
  {
    intent: 'ownership_correction',
    title: 'Ortaklık Düzeltme Kaydı',
    explanation: 'Geçmiş ortaklık bilgisinde düzeltme gerekiyorsa kart alanı değil düzeltme işlemi kullanılır.',
    targetPage: '/app/sirket/companies/partners',
    keywords: ['ortaklik duzeltme', 'hisse duzeltme', 'pay duzeltme', 'ortaklik hatasi'],
    steps: ['Ortaklarımız sayfasında ilgili kaydı açın.', 'Düzeltme işlemini başlatın.', 'Eski ve yeni değerleri sihirbazda onaylayın.'],
    requiredRecordType: 'partner',
    requiredPermission: 'partners.edit',
    wizardKey: 'ownership_correction',
  },
  {
    intent: 'create_representative_draft',
    title: 'Temsilci Kartı Taslağı',
    explanation: '+ Ekle temsilci kartı taslağı oluşturur. Yetki ve limitler temsil işlemleriyle verilir.',
    targetPage: '/app/sirket/companies/representatives',
    keywords: ['yeni temsilci', 'temsilci ekle', 'yetkili ekle'],
    steps: ['Temsilcilerimiz sayfasına gidin.', '+ Ekle ile temsilci kartı taslağı oluşturun.', 'Yetki vermek için Temsilcilik Başlatma işlemini kullanın.'],
    requiredPermission: 'representatives.insert',
    createAction: true,
  },
  {
    intent: 'representative_start',
    title: 'Temsilcilik Başlatma',
    explanation: 'Banka, SGK, GİB, imza, limit ve kapsam yetkileri temsilcilik işlemiyle verilir.',
    targetPage: '/app/sirket/companies/representatives',
    keywords: ['temsilci yetki', 'banka yetkisi', 'imza yetkisi', 'gib yetkisi', 'sgk yetkisi', 'temsilcilik baslat'],
    steps: ['Temsilcilerimiz sayfasında temsilci kartını açın.', 'Temsilcilik Başlatma işlemini başlatın.', 'Yetki türü, limit ve kapsamı sihirbazda seçin.'],
    requiredRecordType: 'representative',
    requiredPermission: 'representatives.edit',
    wizardKey: 'representative_start',
  },
  {
    intent: 'representative_authority_renewal',
    title: 'Temsil Yetkisi Yenileme',
    explanation: 'Süresi dolan veya yenilenmesi gereken temsil yetkisi yetki işlemiyle güncellenir.',
    targetPage: '/app/sirket/companies/representatives',
    keywords: ['yetki yenile', 'temsil yenileme', 'imza yetkisi yenile'],
    steps: ['Temsilcilerimiz sayfasında temsilci kartını açın.', 'Yetki Yenileme işlemini başlatın.', 'Yeni tarih ve belge bilgilerini onaylayın.'],
    requiredRecordType: 'representative',
    requiredPermission: 'representatives.edit',
    wizardKey: 'representative_authority_renewal',
  },
  {
    intent: 'representative_authority_scope_change',
    title: 'Yetki Kapsamı Değişikliği',
    explanation: 'Temsil yetkisi şirket geneli, şube, organizasyon birimi veya tesis/lokasyon bazında sınırlandırılabilir.',
    targetPage: '/app/sirket/companies/representatives',
    keywords: ['yetki kapsami', 'sube bazli yetki', 'tesis yetkisi', 'organizasyon yetkisi'],
    steps: ['Temsilcilerimiz sayfasında temsilci kartını açın.', 'Yetki Kapsamı Değişikliği işlemini başlatın.', 'Kapsam türünü ve ilgili şube/birim/lokasyonu seçin.'],
    requiredRecordType: 'representative',
    requiredPermission: 'representatives.edit',
    wizardKey: 'representative_authority_scope_change',
  },
  {
    intent: 'representative_limit_change',
    title: 'Temsil Yetki Limiti Değişikliği',
    explanation: 'Banka, satınalma veya onay limitleri temsilci kartından değil limit değişikliği işlemiyle güncellenir.',
    targetPage: '/app/sirket/companies/representatives',
    keywords: ['limit degistir', 'banka limiti', 'yetki limiti', 'onay limiti'],
    steps: ['Temsilcilerimiz sayfasında temsilci kartını açın.', 'Limit Değişikliği işlemini başlatın.', 'Yeni limitleri sihirbazda onaylayın.'],
    requiredRecordType: 'representative',
    requiredPermission: 'representatives.edit',
    wizardKey: 'representative_limit_change',
  },
  {
    intent: 'representative_suspend',
    title: 'Temsil Yetkisini Askıya Alma',
    explanation: 'Geçici durdurma işlemi temsilci kartını çoğaltmadan yetki işlemiyle yapılır.',
    targetPage: '/app/sirket/companies/representatives',
    keywords: ['yetki aski', 'askiya al', 'temsilciyi durdur'],
    steps: ['Temsilcilerimiz sayfasında temsilci kartını açın.', 'Askıya Alma işlemini başlatın.', 'Gerekçe ve tarih bilgisini onaylayın.'],
    requiredRecordType: 'representative',
    requiredPermission: 'representatives.edit',
    wizardKey: 'representative_suspend',
  },
  {
    intent: 'representative_terminate',
    title: 'Temsil Yetkisini Sonlandırma',
    explanation: 'Temsil yetkisi sona erdiğinde kart silinmez; yetki sonlandırma işlemi yapılır.',
    targetPage: '/app/sirket/companies/representatives',
    keywords: ['temsilci sonlandir', 'yetki sonlandir', 'imza yetkisi bitir'],
    steps: ['Temsilcilerimiz sayfasında temsilci kartını açın.', 'Sonlandırma işlemini başlatın.', 'Sona erme tarihini ve belgeleri onaylayın.'],
    requiredRecordType: 'representative',
    requiredPermission: 'representatives.edit',
    wizardKey: 'representative_terminate',
  },
  {
    intent: 'branch_view',
    title: 'Şube Görüntüleme',
    explanation: 'Açılmış şubeler Şubelerimiz sayfasında bağlı şirket alt kaydı olarak izlenir.',
    targetPage: '/app/sirket/companies/branches',
    keywords: ['subeleri gor', 'sube listesi', 'sube detayi'],
    steps: ['Şubelerimiz sayfasına gidin.', 'Bağlı şirket filtresini kullanın.', 'Şube satırına tıklayarak detayını açın.'],
    requiredPermission: PERMISSIONS.branches.view,
  },
  {
    intent: 'branch_location_link',
    title: 'Şube Lokasyon Bağlantısı',
    explanation: 'Şubenin fiziksel yer bilgisi Tesisler/Lokasyonlar bağlantısıyla izlenir.',
    targetPage: '/app/sirket/companies/branches',
    keywords: ['sube lokasyon', 'sube tesis', 'lokasyon bagla'],
    steps: ['Şubelerimiz sayfasında şubeyi açın.', 'Adres / Lokasyon sekmesindeki tesis bağlantısını kontrol edin.', 'Fiziksel detayları Tesisler/Lokasyonlar sayfasında yönetin.'],
    requiredRecordType: 'branch',
    requiredPermission: PERMISSIONS.branches.view,
  },
  {
    intent: 'branch_organization_link',
    title: 'Şube Organizasyon Bağlantısı',
    explanation: 'Şubenin kadro ve hiyerarşi karşılığı Teşkilat/Kadro bağlantısıyla izlenir.',
    targetPage: '/app/sirket/companies/branches',
    keywords: ['sube organizasyon', 'sube kadro', 'organizasyon bagla'],
    steps: ['Şubelerimiz sayfasında şubeyi açın.', 'Organizasyon Bağlantısı sekmesini kontrol edin.', 'Kadro ve pozisyonları Teşkilat/Kadro sayfasında yönetin.'],
    requiredRecordType: 'branch',
    requiredPermission: PERMISSIONS.branches.view,
  },
  {
    intent: 'create_organization_unit',
    title: 'Organizasyon Birimi Oluşturma',
    explanation: 'Organizasyon birimleri Teşkilat/Kadro sayfasından yönetilir.',
    targetPage: '/app/sirket/teskilat',
    keywords: ['organizasyon birimi olustur', 'birim ac', 'departman ac'],
    steps: ['Teşkilat/Kadro sayfasına gidin.', 'Yeni birim veya pozisyon akışını başlatın.', 'Bağlı şirket ve üst birim bilgisini seçin.'],
    requiredPermission: 'organization.edit',
  },
  {
    intent: 'assign_staff_to_unit',
    title: 'Personeli Birime Bağlama',
    explanation: 'Şube iç personel ve kadro atamaları Teşkilat/Kadro’dan yapılır.',
    targetPage: '/app/sirket/teskilat',
    keywords: ['personel ata', 'calisani birime bagla', 'sube personeli'],
    steps: ['Teşkilat/Kadro sayfasına gidin.', 'İlgili organizasyon birimini açın.', 'Personel veya kadro atama işlemini burada yapın.'],
    requiredPermission: 'organization.edit',
  },
  {
    intent: 'manage_positions',
    title: 'Kadro / Pozisyon Yönetimi',
    explanation: 'Şube iç kadro ve personel işleri Teşkilat/Kadro sayfasından yönetilir.',
    targetPage: '/app/sirket/teskilat',
    keywords: ['kadro', 'pozisyon', 'personel ata', 'teskilat', 'organizasyon birimi'],
    steps: ['Teşkilat/Kadro sayfasına gidin.', 'İlgili organizasyon birimini açın.', 'Pozisyon ve kadro bilgilerini burada yönetin.'],
    requiredPermission: 'organization.view',
  },
  {
    intent: 'branch_staff_management',
    title: 'Şube Kadro Yönetimi',
    explanation: 'Şube kadrosu şube kartında değil Teşkilat/Kadro sayfasında yönetilir.',
    targetPage: '/app/sirket/teskilat',
    keywords: ['sube kadro yonet', 'sube personel yonet', 'sube pozisyon'],
    steps: ['Teşkilat/Kadro sayfasına gidin.', 'Şubeye bağlı organizasyon birimini bulun.', 'Pozisyon ve personel atamalarını orada yönetin.'],
    requiredPermission: 'organization.view',
  },
  {
    intent: 'create_facility',
    title: 'Tesis / Lokasyon Yönetimi',
    explanation: 'Fiziksel lokasyon ve tesis detayları Tesisler/Lokasyonlar sayfasından yönetilir.',
    targetPage: '/app/sirket/tesisler',
    keywords: ['tesis', 'lokasyon', 'depo', 'fiziksel yer'],
    steps: ['Tesisler/Lokasyonlar sayfasına gidin.', 'Lokasyon kaydını açın veya oluşturun.', 'Şube bağlantısını ilgili işlemle kurun.'],
    requiredPermission: 'companies.view',
  },
  {
    intent: 'link_facility_to_branch',
    title: 'Tesis / Lokasyon Şubeye Bağlama',
    explanation: 'Şube ile fiziksel lokasyon bağlantısı şube açılışı veya lokasyon yönetimiyle kurulur.',
    targetPage: '/app/sirket/tesisler',
    keywords: ['tesisi subeye bagla', 'lokasyonu subeye bagla', 'facility branch'],
    steps: ['Tesisler/Lokasyonlar sayfasına gidin.', 'İlgili lokasyon kaydını açın.', 'Bağlı şube veya bağlı şirket bilgisini kontrol edin.'],
    requiredPermission: 'companies.edit',
  },
  {
    intent: 'deactivate_facility',
    title: 'Tesis / Lokasyon Pasife Alma',
    explanation: 'Şube kapanışında lokasyon açık bırakılabilir veya pasife alınabilir; fiziksel lokasyon ayrıca Tesisler/Lokasyonlar’dan izlenir.',
    targetPage: '/app/sirket/tesisler',
    keywords: ['tesis pasife al', 'lokasyon kapat', 'depo kapat'],
    steps: ['Şube kapanışı varsa sihirbazda lokasyon aksiyonunu seçin.', 'Bağımsız lokasyon yönetimi için Tesisler/Lokasyonlar sayfasına gidin.', 'Lokasyonun durumunu kontrol edin.'],
    requiredPermission: 'companies.edit',
  },
]

const DEFAULT_INTENT = INTENTS[0]

export function resolveActionGuide(query: string, context: ActionGuideContext = {}): ActionGuideResult {
  const definition = matchIntent(query) || DEFAULT_INTENT
  const hasPermission = canUseIntent(definition, context)
  const recordCheck = checkRecord(definition, context)
  const canStartNow = hasPermission && recordCheck.ok
  const blockingReasons = [
    ...(hasPermission ? [] : ['Bu işlemi başlatmak için gerekli yetkiniz görünmüyor.']),
    ...recordCheck.reasons,
  ]

  const suggestedActions: ActionGuideAction[] = [
    {
      label: `${definition.title} sayfasına git`,
      action_type: 'navigate',
      target_page: definition.targetPage,
    },
  ]

  if (definition.createAction) {
    suggestedActions.push({
      label: '+ Ekle ile taslak oluştur',
      action_type: 'start_create',
      target_page: definition.targetPage,
      disabled: !hasPermission,
      reason: hasPermission ? undefined : 'Bu işlem için yetkiniz görünmüyor.',
    })
  }

  if (definition.wizardKey) {
    suggestedActions.push({
      label: `${definition.title} sihirbazını başlat`,
      action_type: 'open_wizard',
      wizard_key: definition.wizardKey,
      target_page: definition.targetPage,
      record_id: context.selectedRecordId || context.activeCompanyId || context.activeBranchId || null,
      record_type: definition.requiredRecordType || null,
      disabled: !canStartNow,
      reason: canStartNow ? undefined : blockingReasons[0],
    })
  }

  if (!canStartNow && definition.requiredRecordStatus === 'active' && normalizeStatus(context.selectedRecordStatus) === 'draft') {
    suggestedActions.push({
      label: 'Önce Şirket Açılışı sihirbazını başlat',
      action_type: 'open_wizard',
      wizard_key: 'company_opening',
      target_page: '/app/sirket/companies',
      record_id: context.selectedRecordId || context.activeCompanyId || null,
      record_type: 'company',
    })
  }

  return {
    intent: definition.intent,
    confidence: scoreIntent(query, definition),
    title: definition.title,
    explanation: definition.explanation,
    steps: definition.steps,
    target_page: definition.targetPage,
    required_record_type: definition.requiredRecordType || null,
    required_record_status: definition.requiredRecordStatus || null,
    can_start_now: canStartNow,
    blocking_reasons: blockingReasons,
    suggested_actions: suggestedActions,
  }
}

function matchIntent(query: string) {
  const normalized = normalizeText(query)
  if (!normalized) return null
  return INTENTS
    .map(intent => ({ intent, score: scoreIntent(query, intent) }))
    .sort((left, right) => right.score - left.score)[0]?.intent || null
}

function scoreIntent(query: string, definition: IntentDefinition) {
  const normalized = normalizeText(query)
  if (!normalized) return 0.5
  const hits = definition.keywords.filter(keyword => normalized.includes(normalizeText(keyword))).length
  if (hits > 0) return Math.min(0.98, 0.72 + hits * 0.08)
  const titleTokens = normalizeText(definition.title).split(/\s+/).filter(token => token.length > 2)
  const tokenHits = titleTokens.filter(token => normalized.includes(token)).length
  return Math.max(0.45, Math.min(0.7, 0.45 + tokenHits * 0.08))
}

function canUseIntent(definition: IntentDefinition, context: ActionGuideContext) {
  if (!definition.requiredPermission) return true
  const permissions = new Set(context.userPermissions || [])
  if (permissions.has('__eden_demo_allow_all__')) return true
  if (permissions.has(definition.requiredPermission)) return true
  if (definition.requiredPermission.startsWith('branches.') && permissions.has(PERMISSIONS.companies.edit)) return true
  return false
}

function checkRecord(definition: IntentDefinition, context: ActionGuideContext) {
  const reasons: string[] = []
  if (definition.requiredRecordType && context.selectedRecordType !== definition.requiredRecordType) {
    reasons.push(`${definition.title} için önce ilgili ${recordTypeLabel(definition.requiredRecordType)} kaydını açın.`)
  }

  const currentStatus = normalizeStatus(context.selectedRecordStatus)
  if (definition.requiredRecordStatus && currentStatus !== definition.requiredRecordStatus) {
    if (!currentStatus) {
      reasons.push(`${definition.title} için ${statusLabel(definition.requiredRecordStatus)} durumda bir kayıt seçilmelidir.`)
    } else if (definition.requiredRecordStatus === 'active' && currentStatus === 'draft') {
      reasons.push('Bu kayıt henüz aktif değil. Önce açılış işlemi tamamlanmalıdır.')
    } else {
      reasons.push(`Bu işlem ${statusLabel(definition.requiredRecordStatus)} kayıtlarda başlatılır.`)
    }
  }

  return { ok: reasons.length === 0, reasons }
}

function normalizeStatus(value: unknown) {
  const status = String(value || '').toLocaleLowerCase('tr-TR')
  if (!status) return ''
  if (['active', 'aktif'].includes(status)) return 'active'
  if (['draft', 'taslak'].includes(status)) return 'draft'
  if (['closed', 'kapali', 'kapalı', 'deregistered', 'terkin'].includes(status)) return 'deregistered'
  if (['liquidation', 'tasfiye'].includes(status)) return 'liquidation'
  return status
}

function recordTypeLabel(value: string) {
  if (value === 'company') return 'şirket'
  if (value === 'branch') return 'şube'
  if (value === 'partner') return 'ortak'
  if (value === 'representative') return 'temsilci'
  return 'kayıt'
}

function statusLabel(value: string) {
  if (value === 'active') return 'aktif'
  if (value === 'draft') return 'taslak'
  return value
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim()
}
