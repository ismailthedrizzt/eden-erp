import { permissionRegistry } from '@/lib/security/permissionRegistry'
import type { ActionGuideDefinition } from './actionGuide.types'

const PAGES = {
  companies: '/app/sirket/companies',
  partners: '/app/sirket/companies/partners',
  representatives: '/app/sirket/companies/representatives',
  branches: '/app/sirket/companies/branches',
  organization: '/app/sirket/teskilat',
  facilities: '/app/sirket/tesisler',
} as const

export const actionGuideDefinitions: ActionGuideDefinition[] = [
  defineAction({
    key: 'create_company_draft',
    label: 'Sirket Taslagi Olustur',
    description: '+ Ekle sirket karti taslagi olusturur; resmi acilis ayri Sirket Acilisi sihirbaziyla tamamlanir.',
    moduleKey: 'companies',
    domain: 'company',
    actionType: 'create_draft',
    targetPage: PAGES.companies,
    intentExamples: ['sirket ekle', 'yeni sirket olustur', 'sirket karti ac', 'firma ekle'],
    keywords: ['sirket', 'firma', 'ekle', 'taslak', 'yeni'],
    requiredModules: ['companies'],
    requiredPermissions: [permissionRegistry.companies.insert],
    fallbackPermissions: [permissionRegistry.companies.edit],
    steps: [
      'Sirketlerimiz sayfasina gidin.',
      '+ Ekle ile sirket karti taslagi olusturun.',
      'Sirket resmi acilisi icin Sirket Acilisi sihirbazini tamamlayin.',
    ],
    helpText: 'Yeni sirket once taslak kart olarak acilir. Taslak sirket aktif sayilmaz; sermaye, sube, unvan/adres degisikligi gibi islemler icin Sirket Acilisi tamamlanmalidir.',
  }),
  defineAction({
    key: 'company_opening',
    label: 'Sirket Acilisi',
    description: 'Taslak sirket, Sirket Acilisi sihirbaziyla aktif hale gelir.',
    moduleKey: 'companies',
    domain: 'company',
    actionType: 'open_wizard',
    targetPage: PAGES.companies,
    wizardKey: 'company_opening',
    requiredRecordType: 'company',
    requiredRecordStatuses: ['draft'],
    requiredModules: ['companies'],
    requiredPermissions: [permissionRegistry.companies.openingStart],
    fallbackPermissions: [permissionRegistry.companies.edit],
    intentExamples: ['sirket acilisi', 'taslak sirketi ac', 'sirketi aktif yap', 'kurulus islemi'],
    keywords: ['sirket', 'acilis', 'kurulus', 'aktif', 'taslak'],
    steps: [
      'Sirketlerimiz sayfasinda taslak sirketi acin.',
      'Yasam Donemi alanindan Sirket Acilisi sihirbazini baslatin.',
      'Tescil ve kurulus bilgilerini onaylayin.',
    ],
    helpText: 'Sirket acilisi yalnizca taslak sirketlerde baslatilir.',
  }),
  companyOfficialAction('capital_increase', 'Sermaye Artirimi', 'Sermaye artisi aktif sirket kartindan resmi islem sihirbaziyla yapilir.', 'capital_increase', ['sermaye artirimi', 'sermaye artir', 'sermaye yukseltecegim', 'capital increase'], ['sermaye', 'artirim', 'artir', 'pay', 'ortak'], {
    requiredModules: ['companies', 'partners'],
    requiredPermissions: [permissionRegistry.companies.capitalIncreaseStart],
    fallbackPermissions: [permissionRegistry.companies.edit],
    relatedFields: [{ entityType: 'company', field: 'committed_capital_amount' }, { entityType: 'company', field: 'paid_capital_amount' }],
    helpText: 'Sermaye Artirimi icin aktif sirket, Ortaklarimiz modulu, aktif ortaklar ve %100 guncel ortaklik dagilimi gerekir.',
  }),
  companyOfficialAction('capital_decrease', 'Sermaye Azaltimi', 'Sermaye azaltimi aktif sirket kartindan resmi islem sihirbaziyla yapilir.', 'capital_decrease', ['sermaye azaltimi', 'sermaye azalt', 'capital decrease'], ['sermaye', 'azaltim', 'azalt', 'pay'], {
    requiredModules: ['companies', 'partners'],
    requiredPermissions: [permissionRegistry.companies.capitalDecreaseStart],
    fallbackPermissions: [permissionRegistry.companies.edit],
    relatedFields: [{ entityType: 'company', field: 'committed_capital_amount' }],
  }),
  companyOfficialAction('title_change', 'Unvan Degisikligi', 'Aktif sirket unvani karttan degil Unvan Degisikligi sihirbaziyla degistirilir.', 'title_change', ['unvan degisikligi', 'unvan degistir', 'sirket adi degistir', 'ticari unvan'], ['unvan', 'ticari', 'isim', 'ad', 'degistir'], {
    relatedFields: [{ entityType: 'company', field: 'trade_name' }, { entityType: 'company', field: 'short_name' }],
  }),
  companyOfficialAction('address_change', 'Adres Degisikligi', 'Aktif sirket adresi resmi islem kontrolludur; Adres Degisikligi sihirbazi kullanilir.', 'address_change', ['adres degisikligi', 'adres degistirecegim', 'sirket adresini degistir', 'adres guncelle'], ['adres', 'il', 'ilce', 'posta', 'degistir'], {
    relatedFields: [{ entityType: 'company', field: 'address' }, { entityType: 'company', field: 'city' }, { entityType: 'company', field: 'district' }],
  }),
  companyOfficialAction('public_registration_update', 'Kamu / Tescil Bilgisi Guncelleme', 'Vergi, sicil, MERSIS ve kamu bilgileri resmi guncelleme sihirbaziyla degisir.', 'public_registration_update', ['tescil bilgisi', 'vergi dairesi degistir', 'mersis guncelle', 'sgk sicil'], ['tescil', 'vergi', 'mersis', 'sgk', 'sicil', 'kamu']),
  companyOfficialAction('nace_change', 'NACE / Faaliyet Kodu Guncelleme', 'NACE kodu ve faaliyet kodu degisiklikleri NACE sihirbaziyla yapilir; faaliyet konusu degisiyorsa Faaliyet Konusu Degisikligi onerilir.', 'nace_change', ['nace kodu', 'faaliyet kodu', 'risk sinifi', 'tehlike sinifi', 'nace degistirmek istiyorum'], ['nace', 'faaliyet', 'kod', 'risk', 'tehlike'], {
    relatedFields: [{ entityType: 'company', field: 'nace_codes' }, { entityType: 'company', field: 'risk_class' }],
  }),
  companyOfficialAction('activity_subject_change', 'Faaliyet Konusu Degisikligi', 'Sirketin faaliyet konusu resmi degisiklik sihirbaziyla guncellenir.', 'activity_subject_change', ['faaliyet konusu', 'esas sozlesme konusu', 'ana faaliyet degisikligi'], ['faaliyet', 'konu', 'esas', 'sozlesme'], {
    relatedFields: [{ entityType: 'company', field: 'activity_subject' }],
  }),
  defineAction({
    key: 'create_partner_draft',
    label: 'Ortak Karti Taslagi',
    description: '+ Ekle ortak karti taslagi olusturur; pay ve haklar ortaklik islemleriyle tanimlanir.',
    moduleKey: 'partners',
    domain: 'ownership',
    actionType: 'create_draft',
    targetPage: PAGES.partners,
    requiredModules: ['companies', 'partners'],
    requiredPermissions: [permissionRegistry.partners.edit],
    intentExamples: ['yeni ortak ekle', 'ortak ekle', 'ortak karti ac', 'hissedar ekle'],
    keywords: ['ortak', 'hissedar', 'paydas', 'ekle', 'taslak'],
    steps: [
      'Ortaklarimiz sayfasina gidin.',
      '+ Ekle ile ortak karti taslagi olusturun.',
      'Pay ve hak bilgileri icin Ilk Ortaklik Girisi islemini kullanin.',
    ],
    helpText: 'Ortak karti kisi/kurum bilgisini tutar; pay dagilimi transaction ile olusur.',
  }),
  partnerAction('initial_partnership_entry', 'Ilk Ortaklik Girisi', 'Taslak ortak kartina ilk pay, oy, kar payi ve sermaye haklari bu islemle verilir.', ['ilk ortaklik girisi', 'pay orani ver', 'ortaga hisse tanimla', 'yeni ortaga pay ver'], ['ilk', 'ortaklik', 'pay', 'hisse', 'oran'], {
    helpText: 'Taslak ortak karti tek basina ortaklik hakki dogurmaz. Ilk Ortaklik Girisi, current ownership read modelini olusturan resmi ownership transaction baslangicidir.',
    relatedFields: [{ entityType: 'company_partner', field: 'share_ratio' }, { entityType: 'company_partner', field: 'capital_amount' }],
  }),
  partnerAction('share_transfer', 'Pay Devri', 'Pay devri kart editinden degil, devreden/devralan etkisini hesaplayan ownership transaction ile yapilir.', ['pay devri', 'hisse devri', 'ortak pay aktar', 'pay oranini degistir'], ['pay', 'hisse', 'devir', 'aktar'], {
    helpText: 'Pay Devri, devreden ortagin mevcut payini dusurur, devralani artirir ve toplam pay dagiliminin %100 kalmasini kontrol eder.',
    relatedFields: [{ entityType: 'company_partner', field: 'share_ratio' }],
  }),
  partnerAction('ownership_exit', 'Ortakliktan Cikis', 'Aktif ortak dogrudan silinmez; paylarin akibeti belirlenerek ortakliktan cikis islemi yapilir.', ['ortakliktan cikis', 'ortak cikisi', 'ortak sil', 'tek ortak cikabilir mi'], ['ortak', 'cikis', 'sil', 'ayril'], {
    helpText: 'Ortakliktan Cikis, tek ortakli sirketi sahipsiz birakmaz; pay devri veya yeni ortak plani olmadan cikis blocking olabilir.',
  }),
  partnerAction('partner_rights_change', 'Hak / Imtiyaz Degisikligi', 'Oy hakki, kar payi, imtiyaz ve kontrol haklari karttan degil ownership transaction ile degisir.', ['oy hakki degistir', 'kar payi degistir', 'imtiyaz tanimla', 'kontrol hakki ver'], ['oy', 'kar', 'imtiyaz', 'kontrol', 'veto'], {
    relatedFields: [
      { entityType: 'company_partner', field: 'voting_ratio' },
      { entityType: 'company_partner', field: 'profit_ratio' },
      { entityType: 'company_partner', field: 'has_control_right' },
    ],
    helpText: 'Hak degisikligi eski deger/yeni deger etkisini transaction gecmisine yazar; kart PATCH bu alanlari degistiremez.',
  }),
  partnerAction('ownership_correction', 'Ortaklik Duzeltme Kaydi', 'Gecmis ortaklik bilgisinde duzeltme veya ters kayit gerekiyorsa yetkili duzeltme islemi kullanilir.', ['ortaklik duzeltme', 'hisse duzeltme', 'pay duzeltme', 'ters kayit'], ['ortaklik', 'hisse', 'pay', 'duzeltme', 'ters'], {
    helpText: 'Duzeltme/Ters Kayit onceki transaction etkisini aciklar ve current ownership valid kalmiyorsa blocking uretir.',
  }),
  defineAction({
    key: 'create_representative_draft',
    label: 'Temsilci Karti Taslagi',
    description: '+ Ekle temsilci karti taslagi olusturur; yetki, imza turu, limit ve kapsam Temsilcilik Baslatma veya ilgili authority islemleriyle verilir.',
    moduleKey: 'representatives',
    domain: 'representative',
    actionType: 'create_draft',
    targetPage: PAGES.representatives,
    requiredModules: ['companies', 'representatives'],
    requiredPermissions: [permissionRegistry.representatives.insert],
    fallbackPermissions: [permissionRegistry.representatives.edit],
    intentExamples: ['yeni temsilci', 'temsilci ekle', 'yetkili ekle', 'temsilci karti taslagi'],
    keywords: ['temsilci', 'yetkili', 'ekle', 'taslak', 'kart'],
    steps: [
      'Temsilcilerimiz sayfasina gidin.',
      '+ Ekle ile temsilci karti taslagi olusturun.',
      'Yetki vermek icin Temsilcilik Baslatma islemini kullanin.',
    ],
    helpText: 'Temsilci karti yetki dogurmaz; kart durumu ve authority status ayridir. Yetki current authority read modelinden okunur.',
  }),
  representativeAction('representative_start', 'Temsilcilik Baslatma', 'Banka, SGK, GIB, imza, limit ve company_wide/sube/organizasyon/facility kapsami temsilcilik islemiyle verilir.', ['temsilciye yetki ver', 'banka yetkisi ver', 'imza yetkisi ver', 'temsilcilik baslat', 'sube bazli imza yetkisi'], ['temsilci', 'yetki', 'banka', 'imza', 'baslat', 'kapsam'], {
    relatedFields: [{ entityType: 'company_representative', field: 'authority_types' }, { entityType: 'company_representative', field: 'scope_type' }, { entityType: 'company_representative', field: 'transaction_limit' }],
    helpText: 'Temsilcilik Baslatma taslak karti active karta ve active authority read modeline tasir; scope_type company_wide, branch, organization_unit veya facility olabilir.',
  }),
  representativeAction('representative_authority_renewal', 'Temsil Yetkisi Yenileme / Askidan Kaldirma', 'Suresi dolan veya askidaki temsil yetkisi yetki islemiyle guncellenir.', ['yetki yenile', 'temsil yenileme', 'imza yetkisi yenile', 'askidan kaldir'], ['yetki', 'yenile', 'sure', 'aski']),
  representativeAction('representative_authority_scope_change', 'Yetki Kapsami Degisikligi', 'Temsil yetkisi sirket geneli, sube, organizasyon veya tesis bazinda sinirlandirilabilir.', ['yetki kapsami', 'sube bazli yetki', 'tesis yetkisi', 'temsilci yetkisini degistir'], ['yetki', 'kapsam', 'sube', 'tesis', 'organizasyon'], {
    relatedFields: [{ entityType: 'company_representative', field: 'authority_types' }, { entityType: 'company_representative', field: 'scope_type' }, { entityType: 'company_representative', field: 'branch_id' }, { entityType: 'company_representative', field: 'facility_id' }],
    helpText: 'Kapsam degisikligi kapali/pasif sube, organizasyon birimi veya facility icin yeni aktif yetki olusturmaz.',
  }),
  representativeAction('representative_limit_change', 'Temsil Yetki Limiti Degisikligi', 'Banka, satin alma, odeme, sozlesme veya genel islem limitleri limit degisikligi islemiyle guncellenir.', ['limit degistir', 'banka limiti', 'yetki limiti', 'odeme onay limiti'], ['limit', 'banka', 'onay', 'satin', 'odeme']),
  representativeAction('representative_suspend', 'Temsil Yetkisini Askiya Alma', 'Gecici durdurma temsilci kartini cogaltmadan yetki islemiyle yapilir.', ['yetki askiya al', 'temsilciyi durdur', 'askiya al'], ['aski', 'durdur', 'pasif']),
  representativeAction('representative_terminate', 'Temsil Yetkisini Sonlandirma', 'Temsil yetkisi sona erdiginde kart silinmez; yetki sonlandirma islemi yapilir.', ['temsilciyi sonlandir', 'yetki sonlandir', 'imza yetkisi bitir'], ['sonlandir', 'bitir', 'kapat', 'yetki']),
  defineAction({
    key: 'branch_opening',
    label: 'Sube Acilisi',
    description: 'Sube acilisi aktif sirket kartindan baslatilan; sube kaydi, organizasyon birimi ve tesis/lokasyon etkilerini birlikte yoneten resmi islemdir.',
    moduleKey: 'branches',
    domain: 'branch',
    actionType: 'open_wizard',
    targetPage: PAGES.companies,
    wizardKey: 'branch_opening',
    requiredRecordType: 'company',
    requiredRecordStatuses: ['active'],
    requiredModules: ['companies', 'branches'],
    optionalModules: ['organization', 'facilities'],
    requiredPermissions: [permissionRegistry.branches.openingStart],
    fallbackPermissions: [permissionRegistry.companies.edit],
    intentExamples: ['sube acmak istiyorum', 'yeni sube', 'sube acilisi', 'ofis ac', 'operasyon noktasi ac', 'sube ayri sirket mi'],
    keywords: ['sube', 'ofis', 'acilis', 'ac', 'yeni', 'operasyon', 'lokasyon'],
    relatedFields: [{ entityType: 'company', field: 'branches' }],
    steps: [
      'Sirketlerimiz sayfasinda aktif sirketi acin.',
      'Resmi Degisiklikler bolumunden Sube Acilisi sihirbazini baslatin.',
      'Sube kimligi, adres, tescil, organizasyon birimi ve tesis/lokasyon kararlarini girin.',
      'Ozet ekraninda onaylayin.',
    ],
    helpText: 'Sube serbest POST ile olusmaz; resmi Sube Acilisi sihirbazi kullanilir. Sube ayri sirket degildir, bagli sirketin alt resmi/operasyonel birimidir.',
  }),
  defineAction({
    key: 'branch_closing',
    label: 'Sube Kapanisi',
    description: 'Sube kapanisi aktif sube uzerinden; temsil yetkisi, organizasyon birimi ve tesis/lokasyon etkilerini analiz ederek yapilan resmi islemdir.',
    moduleKey: 'branches',
    domain: 'branch',
    actionType: 'open_wizard',
    targetPage: PAGES.branches,
    wizardKey: 'branch_closing',
    requiredRecordType: 'branch',
    requiredRecordStatuses: ['active'],
    requiredModules: ['companies', 'branches'],
    requiredPermissions: [permissionRegistry.branches.closingStart],
    fallbackPermissions: [permissionRegistry.companies.edit],
    intentExamples: ['sube kapatacagim', 'sube kapanisi', 'ofis kapat', 'subeyi kapat', 'kapali subeye yetki verebilir miyim'],
    keywords: ['sube', 'ofis', 'kapat', 'kapanis', 'terk', 'yetki', 'etki'],
    steps: [
      'Subelerimiz sayfasina gidin veya sirket detayindan subeyi acin.',
      'Kapatilacak aktif subeyi secin.',
      'Sube Kapanisi sihirbazinda aktif temsilci yetkilerini, organizasyon birimi aksiyonunu ve facility aksiyonunu onaylayin.',
    ],
    helpText: 'Sube kapanisi organizasyon birimi ve lokasyon aksiyonlarini da yonetir; aktif temsilci yetkileri etki analizinde gorunmelidir.',
  }),
  defineAction({
    key: 'branch_document_update',
    label: 'Sube Belgelerini Guncelle',
    description: 'Sube belgeleri normal kart guncellemesiyle degil resmi belge guncelleme islemiyle yonetilir.',
    moduleKey: 'branches',
    domain: 'branch',
    actionType: 'open_wizard',
    targetPage: PAGES.branches,
    wizardKey: 'branch_document_update',
    requiredRecordType: 'branch',
    requiredModules: ['branches'],
    requiredPermissions: [permissionRegistry.branches.documentsUpdate],
    fallbackPermissions: [permissionRegistry.companies.edit],
    intentExamples: ['sube belgeleri', 'sube evrak guncelle', 'sube belge yukle'],
    keywords: ['sube', 'belge', 'evrak', 'dokuman', 'guncelle'],
    relatedFields: [{ entityType: 'company_branch', field: 'document_files' }],
    steps: [
      'Subelerimiz sayfasinda ilgili subeyi acin.',
      'Sube Belgeleri Guncelleme islemini baslatin.',
      'Belgeleri ekleyip ozet ekraninda onaylayin.',
    ],
    helpText: 'Sube belgeleri resmi islem kapsaminda yonetilir.',
  }),
  defineAction({
    key: 'branch_view',
    label: 'Subeleri Goruntule',
    description: 'Acilmis subeler Subelerimiz sayfasinda bagli sirket alt resmi/operasyonel birimi olarak izlenir.',
    moduleKey: 'branches',
    domain: 'branch',
    actionType: 'view',
    targetPage: PAGES.branches,
    requiredModules: ['branches'],
    requiredPermissions: [permissionRegistry.branches.view],
    fallbackPermissions: [permissionRegistry.companies.view],
    intentExamples: ['subeleri gor', 'sube listesi', 'sube detayi', 'subenin kadrosu nerede', 'subenin lokasyonu nerede', 'sube adresini neden degistiremiyorum'],
    keywords: ['sube', 'liste', 'gor', 'detay', 'kadro', 'lokasyon', 'adres'],
    steps: ['Subelerimiz sayfasina gidin.', 'Bagli sirket, tur, resmi sube ve il filtrelerini kullanin.', 'Sube satirina tiklayarak organizasyon, facility ve temsilci ozetlerini acin.'],
    helpText: 'Sube listesi projection/read model uzerinden beslenir. Sube kadrosu Teskilat/Kadro, fiziksel lokasyonu Tesisler/Lokasyonlar, temsil yetkisi Temsilcilerimiz uzerinden yonetilir.',
  }),
  orgAction('create_organization_unit', 'Organizasyon Birimi Olustur', 'Organizasyon birimleri Teskilat/Kadro sayfasindan yonetilir.', ['organizasyon birimi olustur', 'birim ac', 'departman ac'], ['organizasyon', 'birim', 'departman', 'teskilat']),
  orgAction('manage_positions', 'Kadro / Pozisyon Yonetimi', 'Kadro ve pozisyonlar Teskilat/Kadro sayfasindan yonetilir; Sube detayindaki organizasyon baglantisi yalnizca yonlendirme ve ozet amaclidir.', ['kadro yonet', 'pozisyon ac', 'pozisyon yonet', 'subenin kadrosu nerede'], ['kadro', 'pozisyon', 'teskilat', 'sube']),
  orgAction('assign_staff_to_unit', 'Personeli Birime Bagla', 'Personel ve kadro atamalari organizasyon birimi uzerinden yapilir.', ['personel ata', 'calisani birime bagla', 'sube personeli'], ['personel', 'calisan', 'ata', 'birim']),
  facilityAction('create_facility', 'Tesis / Lokasyon Olustur', 'Fiziksel lokasyon ve tesis detaylari Tesisler/Lokasyonlar sayfasindan yonetilir.', ['tesis olustur', 'lokasyon ekle', 'depo ekle'], ['tesis', 'lokasyon', 'depo', 'ekle']),
  facilityAction('link_facility_to_branch', 'Tesisi Subeye Bagla', 'Sube ile fiziksel lokasyon baglantisi sube acilisi veya tesis yonetimiyle kurulur.', ['tesisi subeye bagla', 'lokasyonu subeye bagla', 'subenin lokasyonunu nereden yonetirim'], ['tesis', 'lokasyon', 'sube', 'bagla']),
  facilityAction('deactivate_facility', 'Tesis / Lokasyon Pasife Al', 'Sube kapanisinda lokasyon acik birakilabilir veya pasife alinabilir.', ['tesis pasife al', 'lokasyon kapat', 'depo kapat'], ['tesis', 'lokasyon', 'kapat', 'pasif']),
]

export const actionRegistry = actionGuideDefinitions

export function listActionDefinitions() {
  return [...actionGuideDefinitions]
}

export function getActionDefinition(key: string) {
  return actionGuideDefinitions.find(item => item.key === key) || null
}

function defineAction(action: ActionGuideDefinition): ActionGuideDefinition {
  return action
}

function companyOfficialAction(
  key: string,
  label: string,
  description: string,
  wizardKey: string,
  intentExamples: string[],
  keywords: string[],
  rest: Partial<ActionGuideDefinition> = {}
) {
  return defineAction({
    key,
    label,
    description,
    moduleKey: 'companies',
    domain: 'company',
    actionType: 'open_wizard',
    targetPage: PAGES.companies,
    wizardKey,
    requiredRecordType: 'company',
    requiredRecordStatuses: ['active'],
    requiredModules: ['companies'],
    requiredPermissions: rest.requiredPermissions || [permissionRegistry.companies.officialChangeStart],
    fallbackPermissions: rest.fallbackPermissions || [permissionRegistry.companies.edit],
    intentExamples,
    keywords,
    steps: [
      'Sirketlerimiz sayfasina gidin.',
      'Aktif sirketi acin.',
      `${label} sihirbazini baslatin.`,
      'Ozet ekraninda onaylayin.',
    ],
    helpText: rest.helpText || `${label} aktif sirketlerde resmi islem sihirbazi ile baslatilir.`,
    ...rest,
  })
}

function partnerAction(
  key: string,
  label: string,
  description: string,
  intentExamples: string[],
  keywords: string[],
  rest: Partial<ActionGuideDefinition> = {},
) {
  return defineAction({
    key,
    label,
    description,
    moduleKey: 'partners',
    domain: 'ownership',
    actionType: 'open_wizard',
    targetPage: PAGES.partners,
    wizardKey: key,
    requiredRecordType: 'partner',
    requiredModules: ['companies', 'partners'],
    requiredPermissions: [permissionRegistry.partners.ownershipStart],
    fallbackPermissions: [permissionRegistry.partners.edit],
    intentExamples,
    keywords,
    relatedFields: rest.relatedFields || (key === 'initial_partnership_entry' || key === 'share_transfer'
      ? [{ entityType: 'company_partner', field: 'share_ratio' }]
      : undefined),
    steps: rest.steps || [
      'Ortaklarimiz sayfasinda ilgili ortak kartini acin.',
      `${label} islemini baslatin.`,
      'Pay, hak ve sermaye bilgilerini ozet ekraninda onaylayin.',
    ],
    helpText: rest.helpText || 'Ortaklik haklari normal kart PATCH ile degil ownership transaction ile degisir.',
    ...rest,
  })
}

function representativeAction(
  key: string,
  label: string,
  description: string,
  intentExamples: string[],
  keywords: string[],
  rest: Partial<ActionGuideDefinition> = {}
) {
  const requiredPermission = representativePermissionForAction(key)
  return defineAction({
    key,
    label,
    description,
    moduleKey: 'representatives',
    domain: 'representative',
    actionType: 'open_wizard',
    targetPage: PAGES.representatives,
    wizardKey: key,
    requiredRecordType: 'representative',
    requiredModules: ['companies', 'representatives'],
    requiredPermissions: [requiredPermission],
    fallbackPermissions: [permissionRegistry.representatives.edit],
    intentExamples,
    keywords,
    steps: [
      'Temsilcilerimiz sayfasinda temsilci kartini acin.',
      `${label} islemini baslatin.`,
      'Yetki turu, limit, kapsam ve belge bilgilerini onaylayin.',
    ],
    helpText: 'Temsilci karti cogaltilmaz; yetki farklari authority scope islemlerinde tutulur.',
    ...rest,
  })
}

function representativePermissionForAction(key: string) {
  if (key === 'representative_start') return permissionRegistry.representatives.authorityStart
  if (key === 'representative_suspend') return permissionRegistry.representatives.authoritySuspend
  if (key === 'representative_terminate') return permissionRegistry.representatives.authorityTerminate
  return permissionRegistry.representatives.authorityUpdate
}

function orgAction(key: string, label: string, description: string, intentExamples: string[], keywords: string[]) {
  return defineAction({
    key,
    label,
    description,
    moduleKey: 'organization',
    domain: 'organization',
    actionType: 'navigate',
    targetPage: PAGES.organization,
    requiredModules: ['organization'],
    requiredPermissions: [permissionRegistry.organization.edit],
    fallbackPermissions: [permissionRegistry.companies.edit],
    intentExamples,
    keywords,
    steps: ['Teskilat/Kadro sayfasina gidin.', `${label} akisina baslayin.`, 'Bagli sirket ve birim bilgilerini kontrol edin.'],
    helpText: 'Organizasyon ve kadro islemleri Teskilat/Kadro modulu uzerinden yonetilir.',
  })
}

function facilityAction(key: string, label: string, description: string, intentExamples: string[], keywords: string[]) {
  return defineAction({
    key,
    label,
    description,
    moduleKey: 'facilities',
    domain: 'facility',
    actionType: 'navigate',
    targetPage: PAGES.facilities,
    requiredModules: ['facilities'],
    requiredPermissions: [permissionRegistry.facilities.edit],
    fallbackPermissions: [permissionRegistry.companies.edit],
    intentExamples,
    keywords,
    steps: ['Tesisler/Lokasyonlar sayfasina gidin.', `${label} akisina baslayin.`, 'Bagli sirket/sube bilgisini kontrol edin.'],
    helpText: 'Fiziksel lokasyon kayitlari tesis/lokasyon modulu uzerinden yonetilir.',
  })
}
