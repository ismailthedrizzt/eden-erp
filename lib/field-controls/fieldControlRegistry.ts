import type {
  ControlledByOperation,
  FieldControlDefinition,
  FieldControlEntityType,
} from './fieldControl.types'

const TARGETS = {
  companies: '/app/sirket/companies',
  partners: '/app/sirket/companies/partners',
  representatives: '/app/sirket/companies/representatives',
  branches: '/app/sirket/companies/branches',
} as const

const operations = {
  companyOpening: op('company_opening', 'Sirket Acilisi', 'company_opening', TARGETS.companies),
  titleChange: op('title_change', 'Unvan Degisikligi', 'title_change', TARGETS.companies),
  addressChange: op('address_change', 'Adres Degisikligi', 'address_change', TARGETS.companies),
  publicRegistrationUpdate: op('public_registration_update', 'Kamu / Tescil Bilgisi Guncelleme', 'public_registration_update', TARGETS.companies),
  capitalIncrease: op('capital_increase', 'Sermaye Artirimi', 'capital_increase', TARGETS.companies),
  capitalDecrease: op('capital_decrease', 'Sermaye Azaltimi On Kontrol', 'capital_decrease', TARGETS.companies),
  capitalIncreaseDecrease: op('capital_increase', 'Sermaye Artirimi / Sermaye Azaltimi', 'capital_increase', TARGETS.companies),
  capitalPayment: op('capital_payment', 'Sermaye Odeme / Muhasebe Islemi', 'capital_payment', TARGETS.companies),
  naceChange: op('nace_change', 'NACE / Faaliyet Kodu Guncelleme', 'nace_change', TARGETS.companies),
  activitySubjectChange: op('activity_subject_change', 'Faaliyet Konusu Degisikligi', 'activity_subject_change', TARGETS.companies),
  partnership: op('ownership_transaction', 'Ortaklik Islemleri', 'ownership_transaction', TARGETS.partners),
  initialPartnership: op('initial_partnership_entry', 'Ilk Ortaklik Girisi', 'initial_partnership_entry', TARGETS.partners),
  shareTransfer: op('share_transfer', 'Pay Devri', 'share_transfer', TARGETS.partners),
  ownershipExit: op('ownership_exit', 'Ortakliktan Cikis', 'ownership_exit', TARGETS.partners),
  ownershipCorrection: op('ownership_correction', 'Duzeltme Kaydi', 'ownership_correction', TARGETS.partners),
  ownershipRightsChange: op('ownership_rights_change', 'Hak / Imtiyaz Degisikligi', 'partner_rights_change', TARGETS.partners),
  representative: op('representative_authority_scope_change', 'Temsil Yetkisi Islemleri', 'representative_authority_scope_change', TARGETS.representatives),
  representativeStart: op('representative_start', 'Temsilcilik Baslatma', 'representative_start', TARGETS.representatives),
  representativeTerminate: op('representative_terminate', 'Temsilcilik Sonlandirma', 'representative_terminate', TARGETS.representatives),
  representativeLimitChange: op('representative_limit_change', 'Limit Degisikligi', 'representative_limit_change', TARGETS.representatives),
  representativeScopeChange: op('representative_authority_scope_change', 'Yetki Kapsami Degisikligi', 'representative_authority_scope_change', TARGETS.representatives),
  representativeSuspend: op('representative_suspend', 'Askiya Alma', 'representative_suspend', TARGETS.representatives),
  representativeResume: op('representative_authority_renewal', 'Askidan Kaldirma / Yetki Yenileme', 'representative_authority_renewal', TARGETS.representatives),
  representativeCorrection: op('representative_authority_correction', 'Duzeltme Kaydi', 'representative_authority_correction', TARGETS.representatives),
  representativeReverse: op('representative_authority_reverse', 'Ters Kayit', 'representative_authority_reverse', TARGETS.representatives),
  branchOpening: op('branch_opening', 'Sube Acilisi', 'branch_opening', TARGETS.branches),
  branchClosing: op('branch_closing', 'Sube Kapanisi', 'branch_closing', TARGETS.branches),
  branchDocumentUpdate: op('branch_document_update', 'Sube Belge Guncelleme', 'branch_document_update', TARGETS.branches),
  stakeholder: op('stakeholder_update', 'Paydas Islemleri', 'stakeholder_update', TARGETS.companies),
  system: op('system_update', 'Sistem / Projection', undefined, undefined),
} as const

const companyControls: FieldControlDefinition[] = [
  controlled('company', 'trade_name', 'Ticari unvan', operations.titleChange, { lockExplanation: 'Bu alan aktif sirketlerde dogrudan degistirilemez. Ticari unvan degisiklikleri Unvan Degisikligi sihirbazi ile yapilir.' }),
  controlled('company', 'short_name', 'Kisa unvan', operations.titleChange, { lockExplanation: 'Bu alan aktif sirketlerde dogrudan degistirilemez. Kisa unvan degisiklikleri Unvan Degisikligi sihirbazi ile yapilir.' }),
  system('company', 'tax_number', 'VKN', operations.publicRegistrationUpdate),
  controlled('company', 'tax_office', 'Vergi dairesi', operations.publicRegistrationUpdate),
  controlled('company', 'mersis_number', 'MERSIS no', operations.publicRegistrationUpdate),
  controlled('company', 'trade_registry_number', 'Ticaret sicil no', operations.publicRegistrationUpdate),
  controlled('company', 'trade_registry_office', 'Ticaret sicili mudurlugu', operations.publicRegistrationUpdate),
  controlled('company', 'electronic_notification_address', 'Elektronik tebligat adresi', operations.publicRegistrationUpdate),
  controlled('company', 'e_invoice_taxpayer', 'E-Fatura mukellefiyeti', operations.publicRegistrationUpdate),
  controlled('company', 'e_archive_taxpayer', 'E-Arsiv mukellefiyeti', operations.publicRegistrationUpdate),
  controlled('company', 'e_waybill_taxpayer', 'E-Irsaliye mukellefiyeti', operations.publicRegistrationUpdate),
  controlled('company', 'sgk_workplace_registry_no', 'SGK isyeri sicil no', operations.publicRegistrationUpdate),
  controlled('company', 'sgk_province', 'SGK il', operations.publicRegistrationUpdate),
  controlled('company', 'sgk_branch', 'SGK sube', operations.publicRegistrationUpdate),
  controlled('company', 'country', 'Ulke', operations.addressChange, { lockExplanation: 'Adres bilgisi aktif sirketlerde resmi islem kontrolludur. Adres Degisikligi sihirbazini kullanin.' }),
  controlled('company', 'city', 'Il', operations.addressChange, { lockExplanation: 'Adres bilgisi aktif sirketlerde resmi islem kontrolludur. Adres Degisikligi sihirbazini kullanin.' }),
  controlled('company', 'district', 'Ilce', operations.addressChange, { lockExplanation: 'Adres bilgisi aktif sirketlerde resmi islem kontrolludur. Adres Degisikligi sihirbazini kullanin.' }),
  controlled('company', 'address', 'Adres', operations.addressChange, { lockExplanation: 'Adres bilgisi aktif sirketlerde resmi islem kontrolludur. Adres Degisikligi sihirbazini kullanin.' }),
  controlled('company', 'postal_code', 'Posta kodu', operations.addressChange, { lockExplanation: 'Adres bilgisi aktif sirketlerde resmi islem kontrolludur. Adres Degisikligi sihirbazini kullanin.' }),
  controlled('company', 'committed_capital_amount', 'Taahhut edilen sermaye', operations.capitalIncreaseDecrease, {
    allowDraftEdit: false,
    requiredModules: ['companies', 'partners'],
    requiredPermissions: ['companies.edit'],
    requiredRecordStatuses: ['active'],
    suggestedOperations: [operations.capitalIncrease, operations.capitalDecrease],
    lockExplanation: 'Sermaye bilgisi formdan dogrudan degistirilemez. Sermaye Artirimi veya Sermaye Azaltimi islemi kullanilmalidir.',
    helperText: 'Sermaye Artirimi ortak bazli pay ve sermaye dagilimi gerektirir. Bu islem icin Ortaklarimiz modulu ve guncel ortaklik dagilimi aktif olmalidir.',
  }),
  controlled('company', 'paid_capital_amount', 'Odenen sermaye', operations.capitalPayment, { allowDraftEdit: false }),
  controlled('company', 'nace_codes', 'NACE kodlari', operations.naceChange, { lockExplanation: 'NACE/faaliyet kodlari aktif sirketlerde NACE / Faaliyet Kodu Guncelleme islemiyle degistirilir.' }),
  relation('company', 'company_nace_codes', 'NACE kodlari', operations.naceChange, { lockExplanation: 'NACE/faaliyet kodlari aktif sirketlerde NACE / Faaliyet Kodu Guncelleme islemiyle degistirilir.' }),
  controlled('company', 'risk_class', 'Tehlike sinifi', operations.naceChange, { lockExplanation: 'Tehlike sinifi birincil NACE kodundan turetilir; NACE / Faaliyet Kodu Guncelleme islemini kullanin.' }),
  controlled('company', 'activity_subject', 'Faaliyet konusu', operations.activitySubjectChange, { lockExplanation: 'Faaliyet konusu esas sozlesme/faaliyet alani degisikligi kapsamindadir. Faaliyet Konusu Degisikligi sihirbazini kullanin.' }),
  controlled('company', 'foundation_date', 'Kurulus tarihi', operations.companyOpening),
  controlled('company', 'company_type', 'Sirket turu', operations.companyOpening),
  relation('company', 'partners', 'Ortaklar', operations.partnership),
  relation('company', 'representatives', 'Temsilciler', operations.representative),
  relation('company', 'stakeholders', 'Paydaslar', operations.stakeholder),
  relation('company', 'public_tax', 'Vergi bilgileri', operations.publicRegistrationUpdate),
  relation('company', 'public_sgk', 'SGK bilgileri', operations.publicRegistrationUpdate),
  relation('company', 'public_incentives', 'Tesvik bilgileri', operations.publicRegistrationUpdate),
  relation('company', 'public_registry', 'Sicil bilgileri', operations.publicRegistrationUpdate),
  relation('company', 'public_licenses', 'Ruhsat bilgileri', operations.publicRegistrationUpdate),
  relation('company', 'public_channels', 'Dijital kamu kanallari', operations.publicRegistrationUpdate),
  relation('company', 'branches', 'Subeler', operations.branchOpening),
]

const partnerControls: FieldControlDefinition[] = [
  ...freeFields('company_partner', [
    ['first_name', 'Ad'],
    ['last_name', 'Soyad'],
    ['trade_name', 'Ticari unvan'],
    ['short_name', 'Kisa unvan'],
    ['identity_number', 'Kimlik / vergi no'],
    ['nationality', 'Uyruk'],
    ['passport_no', 'Pasaport no'],
    ['phone', 'Telefon'],
    ['email', 'E-posta'],
    ['address', 'Adres'],
    ['city', 'Il'],
    ['district', 'Ilce'],
    ['country', 'Ulke'],
    ['notes', 'Notlar'],
    ['photo_logo', 'Fotograf / logo'],
    ['partner_documents', 'Ortak belgeleri'],
    ['entity_bank_accounts', 'Banka hesaplari'],
  ]),
  ...controlledFields('company_partner', [
    ['share_ratio', 'Hisse orani'],
    ['share_units', 'Pay adedi'],
    ['nominal_value', 'Nominal deger'],
    ['share_class', 'Pay grubu'],
  ], operations.partnership, {
    allowDraftEdit: false,
    lockExplanation: 'Pay orani ortak kartindan dogrudan degistirilemez. Ilk Ortaklik Girisi, Pay Devri, Sermaye Artirimi veya Duzeltme Kaydi islemleriyle guncellenir.',
    suggestedOperations: [
      operations.initialPartnership,
      operations.shareTransfer,
      operations.capitalIncrease,
      operations.ownershipCorrection,
    ],
  }),
  ...controlledFields('company_partner', [
    ['voting_ratio', 'Oy hakki orani'],
    ['profit_ratio', 'Kar payi orani'],
  ], operations.ownershipRightsChange, {
    allowDraftEdit: false,
    lockExplanation: 'Oy hakki ve kar payi ortaklik islemiyle yonetilir. Kart bilgisi duzenleme ile degistirilemez.',
    suggestedOperations: [
      operations.initialPartnership,
      operations.shareTransfer,
      operations.ownershipRightsChange,
      operations.ownershipCorrection,
    ],
  }),
  ...controlledFields('company_partner', [
    ['capital_amount', 'Sermaye tutari'],
    ['committed_capital_amount', 'Taahhut edilen sermaye'],
  ], operations.capitalIncrease, {
    allowDraftEdit: false,
    lockExplanation: 'Ortagin sermaye tutari ortaklik ve sermaye islemleri sonucunda olusur. Sermaye Artirimi veya ilgili ortaklik islemini kullanin.',
    suggestedOperations: [
      operations.initialPartnership,
      operations.capitalIncrease,
      operations.ownershipCorrection,
    ],
  }),
  ...controlledFields('company_partner', [
    ['has_privileged_share', 'Imtiyazli pay'],
    ['has_privilege', 'Imtiyaz'],
    ['has_control_right', 'Kontrol hakki'],
    ['control_type', 'Kontrol tipi'],
    ['has_board_nomination_right', 'Yonetim kurulu aday gosterme hakki'],
    ['has_veto_right', 'Veto hakki'],
    ['beneficial_owner', 'Gercek faydalanici'],
    ['is_beneficial_owner', 'Gercek faydalanici mi'],
    ['beneficial_ratio', 'Faydalanma orani'],
    ['is_ultimate_controller', 'Nihai kontrol eden'],
  ], operations.ownershipRightsChange, {
    allowDraftEdit: false,
    lockExplanation: 'Imtiyaz, kontrol, veto, yonetim kurulu aday hakki ve faydalanici oranlari resmi ortaklik islemiyle degistirilir.',
    suggestedOperations: [
      operations.ownershipRightsChange,
      operations.ownershipCorrection,
    ],
  }),
  controlled('company_partner', 'start_date', 'Baslangic tarihi', operations.initialPartnership, { allowDraftEdit: false }),
  controlled('company_partner', 'end_date', 'Bitis tarihi', operations.ownershipExit, { allowDraftEdit: false }),
  controlled('company_partner', 'status', 'Durum', op('ownership_lifecycle', 'Ortaklik Lifecycle', 'ownership_lifecycle', TARGETS.partners), { allowDraftEdit: false }),
  controlled('company_partner', 'record_status', 'Kayit durumu', op('ownership_lifecycle', 'Ortaklik Lifecycle', 'ownership_lifecycle', TARGETS.partners), { allowDraftEdit: false }),
  system('company_partner', 'current_ownership', 'Guncel ortaklik', operations.system),
  system('company_partner', 'current_share_ratio', 'Guncel hisse orani', operations.system),
  system('company_partner', 'current_voting_ratio', 'Guncel oy hakki orani', operations.system),
  system('company_partner', 'current_profit_ratio', 'Guncel kar payi orani', operations.system),
  system('company_partner', 'current_capital_amount', 'Guncel sermaye tutari', operations.system),
  system('company_partner', 'current_share_units', 'Guncel pay adedi', operations.system),
  system('company_partner', 'ownership_transaction_history', 'Ortaklik islem gecmisi', operations.system),
  system('company_partner', 'approval_status', 'Onay durumu', operations.system),
  system('company_partner', 'workflow_status', 'Akis durumu', operations.system),
  system('company_partner', 'transaction_status', 'Islem durumu', operations.system),
  system('company_partner', 'ownership_action', 'Ortaklik aksiyonu', operations.system),
]

const representativeControls: FieldControlDefinition[] = [
  ...freeFields('company_representative', [
    ['display_name', 'Gorunen ad'],
    ['first_name', 'Ad'],
    ['last_name', 'Soyad'],
    ['trade_name', 'Ticari unvan'],
    ['short_name', 'Kisa unvan'],
    ['identity_number', 'Kimlik / vergi no'],
    ['phone', 'Telefon'],
    ['email', 'E-posta'],
    ['address', 'Adres'],
    ['city', 'Il'],
    ['district', 'Ilce'],
    ['country', 'Ulke'],
    ['notes', 'Notlar'],
    ['photo_logo', 'Fotograf / logo'],
    ['representative_profile', 'Temsilci profili'],
    ['entity_bank_accounts', 'Banka hesaplari'],
  ]),
  controlled('company_representative', 'status', 'Durum', op('representative_lifecycle', 'Temsilci Lifecycle', 'representative_lifecycle', TARGETS.representatives), {
    allowDraftEdit: false,
    lockExplanation: 'Temsilci kart durumu yetki lifecycle islemlerinden ayri izlenir; aktif/askida/sonlandirilmis yetki statusu kart editinden degistirilemez.',
    suggestedOperations: [operations.representativeStart, operations.representativeSuspend, operations.representativeTerminate],
  }),
  controlled('company_representative', 'record_status', 'Kayit durumu', op('representative_lifecycle', 'Temsilci Lifecycle', 'representative_lifecycle', TARGETS.representatives), {
    allowDraftEdit: false,
    lockExplanation: 'Temsilci kart lifecycle degeri kart formundan degistirilmez. Yetki baslatma veya sonlandirma sureci kullanilir.',
    suggestedOperations: [operations.representativeStart, operations.representativeTerminate],
  }),
  ...controlledFields('company_representative', [
    ['authority_status', 'Yetki durumu'],
    ['authority_record_status', 'Yetki kayit durumu'],
    ['authority_effect_status', 'Yetki etki durumu'],
    ['transaction_status', 'Islem durumu'],
    ['approval_status', 'Onay durumu'],
    ['workflow_status', 'Akis durumu'],
    ['authority_type', 'Yetki tipi'],
    ['authority_types', 'Yetki tipleri'],
    ['job_title', 'Gorev unvani'],
    ['signature_type', 'Imza tipi'],
  ], operations.representative, {
    allowDraftEdit: false,
    lockExplanation: 'Temsil yetkileri karttan dogrudan degistirilemez. Temsilcilik Baslatma veya Yetki Kapsami Degisikligi islemini kullanin.',
    suggestedOperations: [
      operations.representativeStart,
      operations.representativeScopeChange,
      operations.representativeResume,
      operations.representativeSuspend,
      operations.representativeTerminate,
      operations.representativeCorrection,
    ],
  }),
  controlled('company_representative', 'start_date', 'Baslangic tarihi', operations.representativeStart, { allowDraftEdit: false }),
  controlled('company_representative', 'end_date', 'Bitis tarihi', operations.representativeTerminate, { allowDraftEdit: false }),
  controlled('company_representative', 'primary_authority_type', 'Birincil yetki tipi', operations.representativeScopeChange, { allowDraftEdit: false }),
  ...controlledFields('company_representative', [
    ['authority_limit', 'Yetki limiti'],
    ['transaction_limit', 'Islem limiti'],
    ['payment_approval_limit', 'Odeme onay limiti'],
    ['purchase_approval_limit', 'Satinalma onay limiti'],
    ['bank_transaction_limit', 'Banka islem limiti'],
    ['contract_signature_limit', 'Sozlesme imza limiti'],
    ['currency', 'Para birimi'],
  ], operations.representativeLimitChange, {
    allowDraftEdit: false,
    lockExplanation: 'Yetki limitleri kart duzenleme ile degistirilemez. Limit Degisikligi islemini kullanin.',
    suggestedOperations: [operations.representativeLimitChange, operations.representativeCorrection],
  }),
  ...controlledFields('company_representative', [
    ['requires_joint_signature', 'Birlikte imza gerekir'],
    ['can_approve_alone', 'Tek basina onaylayabilir'],
    ['bank_authority_level', 'Banka yetki seviyesi'],
    ['department_scope', 'Departman kapsami'],
    ['gib_permissions', 'GIB yetkileri'],
    ['sgk_permissions', 'SGK yetkileri'],
    ['scope_type', 'Kapsam tipi'],
    ['branch_id', 'Sube kapsami'],
    ['organization_unit_id', 'Organizasyon birimi kapsami'],
    ['facility_id', 'Tesis / lokasyon kapsami'],
    ['scope_label', 'Kapsam etiketi'],
    ['scope_notes', 'Kapsam notlari'],
    ['authority_documents', 'Yetki belgeleri'],
    ['bank_currency', 'Banka para birimi'],
    ['limit_currency', 'Limit para birimi'],
    ['limit_start_date', 'Limit baslangic tarihi'],
    ['limit_end_date', 'Limit bitis tarihi'],
    ['can_submit_declaration', 'Beyanname gonderebilir'],
    ['can_process_e_invoice', 'E-fatura isleyebilir'],
    ['can_submit_hiring_notice', 'Ise giris bildirgesi verebilir'],
    ['can_submit_termination_notice', 'Isten cikis bildirgesi verebilir'],
    ['official_correspondence_authority', 'Resmi yazisma yetkisi'],
  ], operations.representativeScopeChange, {
    allowDraftEdit: false,
    lockExplanation: 'Yetki kapsami temsilci kartindan dogrudan degistirilemez. Yetki Kapsami Degisikligi islemiyle guncellenir.',
    suggestedOperations: [operations.representativeScopeChange, operations.representativeCorrection],
  }),
  system('company_representative', 'current_authority', 'Guncel yetki', operations.system),
  system('company_representative', 'authority_transaction_history', 'Yetki islem gecmisi', operations.system),
]

const branchControls: FieldControlDefinition[] = [
  ...freeFields('company_branch', [
    ['branch_short_name', 'Sube kisa adi'],
    ['phone', 'Telefon'],
    ['email', 'E-posta'],
    ['responsible_person_id', 'Sorumlu kisi'],
    ['organization_unit_id', 'Organizasyon birimi'],
    ['facility_id', 'Tesis / lokasyon'],
    ['notes', 'Notlar'],
  ]),
  controlled('company_branch', 'company_id', 'Bagli sirket', operations.branchOpening, { allowDraftEdit: false }),
  controlled('company_branch', 'branch_name', 'Sube adi', operations.branchOpening, {
    allowDraftEdit: false,
    lockExplanation: 'Sube adi Sube Acilisi islemiyle olusur. Resmi sube adi kart duzenleme ile degistirilemez.',
    helperText: 'Yeni sube adi veya resmi sube kimligi icin Sube Acilisi ya da ileride Sube Resmi Bilgi Degisikligi islemi kullanilmalidir.',
  }),
  controlled('company_branch', 'branch_type', 'Sube turu', operations.branchOpening, { allowDraftEdit: false }),
  controlled('company_branch', 'is_official_branch', 'Resmi sube mi', operations.branchOpening, { allowDraftEdit: false }),
  ...controlledFields('company_branch', [
    ['country', 'Ulke'],
    ['city', 'Il'],
    ['district', 'Ilce'],
    ['neighborhood', 'Mahalle / semt'],
    ['address', 'Adres'],
    ['postal_code', 'Posta kodu'],
  ], operations.branchOpening, {
    allowDraftEdit: false,
    message: 'Sube adresi resmi islem kontrolludur. Sube adres degisikligi icin ayri islem kullanilmalidir.',
    lockExplanation: 'Sube adresi Sube Acilisi isleminde belirlenir; kart duzenleme ile degistirilemez.',
  }),
  ...controlledFields('company_branch', [
    ['trade_registry_number', 'Ticaret sicil no'],
    ['trade_registry_office', 'Ticaret sicil mudurlugu'],
    ['tax_office', 'Vergi dairesi'],
    ['sgk_workplace_registry_no', 'SGK isyeri sicil no'],
    ['opening_decision_date', 'Acilis karar tarihi'],
    ['trade_registry_gazette_date', 'Ticaret sicil gazetesi tarihi'],
    ['trade_registry_gazette_number', 'Ticaret sicil gazetesi sayisi'],
    ['start_date', 'Baslangic tarihi'],
  ], operations.branchOpening, { allowDraftEdit: false }),
  controlled('company_branch', 'opening_registration_date', 'Acilis tescil tarihi', operations.branchOpening, {
    allowDraftEdit: false,
    lockExplanation: 'Sube acilis tescil tarihi Sube Acilisi islemiyle olusur. Kart duzenleme ile degistirilemez.',
  }),
  ...controlledFields('company_branch', [
    ['closing_decision_date', 'Kapanis karar tarihi'],
    ['closing_registration_date', 'Kapanis tescil tarihi'],
    ['end_date', 'Bitis tarihi'],
  ], operations.branchClosing, {
    allowDraftEdit: false,
    lockExplanation: 'Sube kapanis tarihi ve kapanis resmi bilgileri Sube Kapanisi islemiyle olusur.',
    helperText: 'Aktif subeyi kapatmak icin etki analizli Sube Kapanisi sihirbazini kullanin.',
  }),
  controlled('company_branch', 'status', 'Durum', op('branch_lifecycle', 'Sube Lifecycle', 'branch_lifecycle', TARGETS.branches), { allowDraftEdit: false }),
  controlled('company_branch', 'record_status', 'Kayit durumu', op('branch_lifecycle', 'Sube Lifecycle', 'branch_lifecycle', TARGETS.branches), { allowDraftEdit: false }),
  controlled('company_branch', 'document_files', 'Sube belgeleri', operations.branchDocumentUpdate, {
    allowDraftEdit: false,
    requiredModules: ['branches'],
    requiredPermissions: ['branches.documents.update'],
    fallbackPermissions: ['companies.edit'],
    lockExplanation: 'Sube belgeleri normal kart guncellemesiyle degistirilemez. Sube Belgeleri Guncelleme islemi kullanilmalidir.',
    helperText: 'Sube belgeleri resmi islem kapsaminda yonetilir. Bu islem icin Subelerimiz ve belge yukleme altyapisi aktif olmalidir.',
  }),
]

export const fieldControlDefinitions: FieldControlDefinition[] = [
  ...companyControls,
  ...partnerControls,
  ...representativeControls,
  ...branchControls,
]

const controlsByEntity = new Map<string, FieldControlDefinition[]>()
const controlsByEntityAndField = new Map<string, FieldControlDefinition>()

for (const definition of fieldControlDefinitions) {
  const entityDefinitions = controlsByEntity.get(definition.entityType) || []
  entityDefinitions.push(definition)
  controlsByEntity.set(definition.entityType, entityDefinitions)
  controlsByEntityAndField.set(`${definition.entityType}:${definition.field}`, definition)
}

export function getFieldControl(entityType: FieldControlEntityType, field: string) {
  return controlsByEntityAndField.get(`${entityType}:${field}`) || null
}

export function listFieldControls(entityType: FieldControlEntityType) {
  return [...(controlsByEntity.get(entityType) || [])]
}

export function getControlledFields(entityType: FieldControlEntityType) {
  return listFieldControls(entityType).filter(definition =>
    ['operation_controlled', 'system_controlled', 'read_only', 'relation_controlled'].includes(definition.controlType)
  )
}

export function getControlledFieldNames(entityType: FieldControlEntityType) {
  return getControlledFields(entityType).map(definition => definition.field)
}

export function getFreeEditFields(entityType: FieldControlEntityType) {
  return listFieldControls(entityType).filter(definition => definition.controlType === 'free_edit')
}

export function suggestOperationForField(entityType: FieldControlEntityType, field: string) {
  return getFieldControl(entityType, field)?.controlledBy || null
}

function op(operationKey: string, operationLabel: string, wizardKey?: string, targetPage?: string): ControlledByOperation {
  return { operationKey, operationLabel, wizardKey, targetPage }
}

function freeFields(entityType: FieldControlEntityType, fields: Array<[string, string]>) {
  return fields.map(([field, label]) => ({ entityType, field, label, controlType: 'free_edit' as const }))
}

function controlledFields(
  entityType: FieldControlEntityType,
  fields: Array<[string, string]>,
  controlledBy: ControlledByOperation,
  options: Partial<FieldControlDefinition> = {}
) {
  return fields.map(([field, label]) => controlled(entityType, field, label, controlledBy, options))
}

function controlled(
  entityType: FieldControlEntityType,
  field: string,
  label: string,
  controlledBy: ControlledByOperation,
  options: Partial<FieldControlDefinition> = {}
): FieldControlDefinition {
  return {
    entityType,
    field,
    label,
    controlType: 'operation_controlled',
    controlledBy,
    allowDraftEdit: options.allowDraftEdit ?? true,
    lockInStatuses: options.lockInStatuses || ['active', 'passive', 'closed', 'liquidation', 'deregistered'],
    requiredModules: options.requiredModules || defaultRequiredModules(entityType, controlledBy.operationKey),
    optionalModules: options.optionalModules || defaultOptionalModules(controlledBy.operationKey),
    requiredPermissions: options.requiredPermissions || defaultRequiredPermissions(controlledBy.operationKey),
    fallbackPermissions: options.fallbackPermissions || defaultFallbackPermissions(controlledBy.operationKey),
    requiredRecordStatuses: options.requiredRecordStatuses || defaultRequiredRecordStatuses(controlledBy.operationKey),
    ...options,
  }
}

function system(
  entityType: FieldControlEntityType,
  field: string,
  label: string,
  controlledBy: ControlledByOperation,
  options: Partial<FieldControlDefinition> = {}
): FieldControlDefinition {
  return {
    entityType,
    field,
    label,
    controlType: 'system_controlled',
    controlledBy,
    allowDraftEdit: false,
    requiredModules: options.requiredModules || defaultRequiredModules(entityType, controlledBy.operationKey),
    optionalModules: options.optionalModules || defaultOptionalModules(controlledBy.operationKey),
    requiredPermissions: options.requiredPermissions || defaultRequiredPermissions(controlledBy.operationKey),
    fallbackPermissions: options.fallbackPermissions || defaultFallbackPermissions(controlledBy.operationKey),
    requiredRecordStatuses: options.requiredRecordStatuses || defaultRequiredRecordStatuses(controlledBy.operationKey),
    ...options,
  }
}

function relation(
  entityType: FieldControlEntityType,
  field: string,
  label: string,
  controlledBy: ControlledByOperation,
  options: Partial<FieldControlDefinition> = {}
): FieldControlDefinition {
  return {
    entityType,
    field,
    label,
    controlType: 'relation_controlled',
    controlledBy,
    allowDraftEdit: false,
    requiredModules: options.requiredModules || defaultRequiredModules(entityType, controlledBy.operationKey),
    optionalModules: options.optionalModules || defaultOptionalModules(controlledBy.operationKey),
    requiredPermissions: options.requiredPermissions || defaultRequiredPermissions(controlledBy.operationKey),
    fallbackPermissions: options.fallbackPermissions || defaultFallbackPermissions(controlledBy.operationKey),
    requiredRecordStatuses: options.requiredRecordStatuses || defaultRequiredRecordStatuses(controlledBy.operationKey),
    ...options,
  }
}

function defaultRequiredModules(entityType: FieldControlEntityType, operationKey: string) {
  if (operationKey.startsWith('branch_')) return ['companies', 'branches']
  if (operationKey.startsWith('representative_') || operationKey === 'representative_lifecycle') return ['companies', 'representatives']
  if (operationKey.includes('ownership') || operationKey === 'share_transfer' || entityType === 'company_partner') return ['companies', 'partners']
  if (operationKey.startsWith('capital_')) return ['companies', 'partners']
  return entityType === 'company' ? ['companies'] : []
}

function defaultOptionalModules(operationKey: string) {
  if (operationKey === 'branch_opening') return ['organization', 'facilities']
  return []
}

function defaultRequiredPermissions(operationKey: string) {
  if (operationKey === 'branch_opening') return ['branches.opening.start']
  if (operationKey === 'branch_closing') return ['branches.closing.start']
  if (operationKey === 'branch_document_update') return ['branches.documents.update']
  if (operationKey.startsWith('representative_') || operationKey === 'representative_lifecycle') return ['representatives.edit']
  if (operationKey.includes('ownership') || operationKey === 'share_transfer') return ['partners.edit']
  return ['companies.edit']
}

function defaultFallbackPermissions(operationKey: string) {
  if (operationKey.startsWith('branch_') || operationKey.startsWith('representative_') || operationKey.includes('ownership')) return ['companies.edit']
  return []
}

function defaultRequiredRecordStatuses(operationKey: string) {
  if (operationKey === 'company_opening') return ['draft']
  if (operationKey === 'system_update' || operationKey.includes('lifecycle')) return []
  if (operationKey.startsWith('branch_') || operationKey.startsWith('capital_') || [
    'title_change',
    'address_change',
    'public_registration_update',
    'nace_change',
    'activity_subject_change',
  ].includes(operationKey)) return ['active']
  return []
}
