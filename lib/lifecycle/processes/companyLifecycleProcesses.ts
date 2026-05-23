import {
  createLifecycleWizardTemplate,
  lifecycleDocumentWrite,
  lifecycleFieldWrite,
  type LifecycleWizardTemplate,
} from '@/lib/lifecycle/lifecycleWizardTemplate'

export type CompanyLifecycleWizardType = 'opening' | 'liquidation' | 'deregistration'
export type CompanyLifecycleProcessType = CompanyLifecycleWizardType

export const COMPANY_LIFECYCLE_PROCESSES = {
  opening: createLifecycleWizardTemplate({
    id: 'opening',
    title: 'Şirket Açılışı',
    endpoint: 'opening-wizard',
    submitLabel: 'Şirket Açılışını Tamamla',
    completion: {
      formWrites: [
        lifecycleFieldWrite('trade_name', 'trade_name', { label: 'Ticari Unvan' }),
        lifecycleFieldWrite('short_name', 'short_name', { label: 'Kısa Ünvan' }),
        lifecycleFieldWrite('company_type', 'company_type', { label: 'Şirket Türü' }),
        lifecycleFieldWrite('registration_date', 'foundation_date', { label: 'Kuruluş Tarihi', required: true }),
        lifecycleFieldWrite('trade_registry_office', 'trade_registry_office', { label: 'Ticaret Sicili Müdürlüğü' }),
        lifecycleFieldWrite('trade_registry_no', 'trade_registry_number', { label: 'Ticaret Sicil No' }),
        lifecycleFieldWrite('mersis_no', 'mersis_number', { label: 'MERSİS No' }),
        lifecycleFieldWrite('tax_no', 'tax_number', { label: 'VKN' }),
        lifecycleFieldWrite('tax_office', 'tax_office', { label: 'Vergi Dairesi' }),
        lifecycleFieldWrite('sgk_workplace_no', 'sgk_workplace_registry_no', { label: 'SGK İşyeri Sicil No' }),
        lifecycleFieldWrite('electronic_notification_address', 'electronic_notification_address', { label: 'Elektronik Tebligat Adresi' }),
        lifecycleFieldWrite('nace_codes', 'company_nace_codes', { label: 'NACE / Faaliyet Kodları', mode: 'merge' }),
      ],
      documentWrites: [
        lifecycleDocumentWrite('foundation_trade_registry_gazette', 'hero_documents', 'ticaret_sicil_gazetesi', 'Ticaret Sicil Gazetesi', {
          label: 'Kuruluş Ticaret Sicil Gazetesi',
          required: true,
        }),
        lifecycleDocumentWrite('registry_certificate_document', 'hero_documents', 'sicil_tasdiknamesi', 'Sicil Tasdiknamesi', { required: true }),
        lifecycleDocumentWrite('articles_of_association_document', 'hero_documents', 'articles_of_association_document', 'Ana Sözleşme'),
        lifecycleDocumentWrite('tax_plate_document', 'hero_documents', 'vergi_levhasi', 'Vergi Levhası', { required: true }),
        lifecycleDocumentWrite('sgk_opening_document', 'hero_documents', 'sgk_opening_document', 'SGK İşyeri Açılış Belgesi'),
        lifecycleDocumentWrite('mersis_document', 'hero_documents', 'mersis_document', 'MERSİS Belgesi'),
      ],
    },
  }),
  liquidation: createLifecycleWizardTemplate({
    id: 'liquidation',
    title: 'Tasfiye',
    endpoint: 'liquidation-wizard',
    submitLabel: 'Tasfiyeyi Başlat',
    completion: {
      formWrites: [
        lifecycleFieldWrite('liquidation_decision_date', 'company_liquidation_details.liquidation_decision_date', { label: 'Tasfiye Karar Tarihi', required: true }),
        lifecycleFieldWrite('liquidation_start_date', 'company_liquidation_details.liquidation_start_date', { label: 'Tasfiye Başlangıç Tarihi', required: true }),
        lifecycleFieldWrite('decision_type', 'company_liquidation_details.decision_type', { label: 'Karar Türü' }),
        lifecycleFieldWrite('decision_no', 'company_liquidation_details.decision_no', { label: 'Karar No' }),
        lifecycleFieldWrite('liquidation_reason', 'company_liquidation_details.liquidation_reason', { label: 'Tasfiye Gerekçesi' }),
        lifecycleFieldWrite('liquidator_id', 'company_liquidation_details.liquidator_id', { label: 'Tasfiye Memuru' }),
        lifecycleFieldWrite('liquidator_display_name', 'company_liquidation_details.liquidator_display_name', { label: 'Tasfiye Memuru Adı' }),
        lifecycleFieldWrite('liquidator_authority', 'company_liquidation_details.liquidator_authority', { label: 'Tasfiye Temsil Yetkisi' }),
        lifecycleFieldWrite('liquidator_authority_start_date', 'company_liquidation_details.liquidator_authority_start_date', { label: 'Yetki Başlangıç Tarihi' }),
      ],
      documentWrites: [
        lifecycleDocumentWrite('liquidation_decision_document', 'company_liquidation_details.payload_json', 'liquidation_decision_document', 'Tasfiye Kararı', { required: true }),
        lifecycleDocumentWrite('liquidator_authority_document', 'company_liquidation_details.payload_json', 'liquidator_authority_document', 'Yetki Belgesi', { required: true }),
        lifecycleDocumentWrite('assembly_decision_document', 'company_liquidation_details.payload_json', 'assembly_decision_document', 'Genel Kurul / Ortaklar Kurulu Kararı'),
        lifecycleDocumentWrite('liquidator_assignment_document', 'company_liquidation_details.payload_json', 'liquidator_assignment_document', 'Tasfiye Memuru Atama Belgesi'),
        lifecycleDocumentWrite('trade_registry_application_document', 'company_liquidation_details.payload_json', 'trade_registry_application_document', 'Ticaret Sicil Başvuru Belgesi'),
        lifecycleDocumentWrite('liquidation_announcement_document', 'company_liquidation_details.payload_json', 'liquidation_announcement_document', 'Tasfiye İlanı'),
      ],
    },
  }),
  deregistration: createLifecycleWizardTemplate({
    id: 'deregistration',
    title: 'Terkin',
    endpoint: 'deregistration-wizard',
    submitLabel: 'Terkin İşlemini Tamamla',
    completion: {
      formWrites: [
        lifecycleFieldWrite('liquidation_completion_decision_date', 'company_deregistration_details.liquidation_completion_decision_date', { label: 'Tasfiye Sonu Karar Tarihi', required: true }),
        lifecycleFieldWrite('deregistration_application_date', 'company_deregistration_details.deregistration_application_date', { label: 'Terkin Başvuru Tarihi' }),
        lifecycleFieldWrite('deregistration_registration_date', 'company_deregistration_details.deregistration_registration_date', { label: 'Terkin Tescil Tarihi', required: true }),
        lifecycleFieldWrite('deregistration_reference_no', 'company_deregistration_details.deregistration_reference_no', { label: 'Terkin Sicil No / Referans' }),
        lifecycleFieldWrite('trade_registry_office', 'company_deregistration_details.trade_registry_office', { label: 'Ticaret Sicili Müdürlüğü' }),
        lifecycleFieldWrite('tax_closure_status', 'company_deregistration_details.tax_closure_status', { label: 'Vergi Kapanış Durumu' }),
        lifecycleFieldWrite('tax_closure_date', 'company_deregistration_details.tax_closure_date', { label: 'Vergi Kapanış Tarihi' }),
        lifecycleFieldWrite('sgk_closure_status', 'company_deregistration_details.sgk_closure_status', { label: 'SGK Kapanış Durumu' }),
        lifecycleFieldWrite('sgk_closure_date', 'company_deregistration_details.sgk_closure_date', { label: 'SGK Kapanış Tarihi' }),
        lifecycleFieldWrite('document_archive_responsible', 'company_deregistration_details.document_archive_responsible', { label: 'Defter / Belge Saklama Sorumlusu' }),
      ],
      documentWrites: [
        lifecycleDocumentWrite('deregistration_trade_registry_gazette', 'company_deregistration_details.payload_json', 'deregistration_trade_registry_gazette', 'Terkin Ticaret Sicil Gazetesi', { required: true }),
        lifecycleDocumentWrite('liquidation_completion_decision_document', 'company_deregistration_details.payload_json', 'liquidation_completion_decision_document', 'Tasfiye Sonu Kararı'),
        lifecycleDocumentWrite('final_balance_document', 'company_deregistration_details.payload_json', 'final_balance_document', 'Son Bilanço / Nihai Hesap'),
        lifecycleDocumentWrite('tax_closure_document', 'company_deregistration_details.payload_json', 'tax_closure_document', 'Vergi Kapanış Belgesi'),
        lifecycleDocumentWrite('sgk_closure_document', 'company_deregistration_details.payload_json', 'sgk_closure_document', 'SGK Kapanış Belgesi'),
        lifecycleDocumentWrite('archive_minutes_document', 'company_deregistration_details.payload_json', 'archive_minutes_document', 'Defter / Belge Saklama Tutanağı'),
      ],
    },
  }),
} satisfies Record<CompanyLifecycleWizardType, LifecycleWizardTemplate<CompanyLifecycleWizardType>>

export function getCompanyLifecycleProcess(type: CompanyLifecycleWizardType) {
  return COMPANY_LIFECYCLE_PROCESSES[type]
}
