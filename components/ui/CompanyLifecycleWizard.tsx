'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import {
  RecordLifecycleWizard,
  type RecordLifecycleWizardOption,
  type RecordLifecycleWizardStep,
} from './RecordLifecycleWizard'
import type { Sirket } from '@/types/sirket'

export type CompanyLifecycleWizardType = 'opening' | 'liquidation' | 'deregistration'

type CompanyLifecycleWizardProps = {
  type: CompanyLifecycleWizardType
  company: Sirket
  onClose: () => void
  onComplete: (company?: Partial<Sirket>) => void
}

const YES_NO_OPTIONS: RecordLifecycleWizardOption[] = [
  { value: 'true', label: 'Evet' },
  { value: 'false', label: 'Hayır' },
]

const STATUS_OPTIONS: RecordLifecycleWizardOption[] = [
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'pending', label: 'Bekliyor' },
  { value: 'not_required', label: 'Gerekli Değil' },
]

const DECISION_TYPE_OPTIONS: RecordLifecycleWizardOption[] = [
  { value: 'general_assembly', label: 'Genel Kurul Kararı' },
  { value: 'partners_board', label: 'Ortaklar Kurulu Kararı' },
  { value: 'court', label: 'Mahkeme Kararı' },
  { value: 'other', label: 'Diğer' },
]

const WIZARD_META: Record<CompanyLifecycleWizardType, { title: string; endpoint: string; submitLabel: string }> = {
  opening: { title: 'Şirket Açılışı', endpoint: 'opening-wizard', submitLabel: 'Şirket Açılışını Tamamla' },
  liquidation: { title: 'Tasfiye', endpoint: 'liquidation-wizard', submitLabel: 'Tasfiyeyi Başlat' },
  deregistration: { title: 'Terkin', endpoint: 'deregistration-wizard', submitLabel: 'Terkin İşlemini Tamamla' },
}

export function CompanyLifecycleWizard({ type, company, onClose, onComplete }: CompanyLifecycleWizardProps) {
  const [form, setForm] = useState<Record<string, any>>({})
  const [context, setContext] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [contextError, setContextError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const meta = WIZARD_META[type]

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setContextError(null)
    setError(null)

    fetch(`/api/companies/${company.id}/${meta.endpoint}/context`)
      .then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Wizard bağlamı yüklenemedi')
        return payload.data || {}
      })
      .then(payload => {
        if (cancelled) return
        setContext(payload)
        setForm(createInitialForm(type, company, payload))
      })
      .catch(fetchError => {
        if (cancelled) return
        setContextError(fetchError.message || 'Wizard bağlamı yüklenemedi')
        setForm(createInitialForm(type, company, null))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [company, meta.endpoint, type])

  const options = useMemo(() => buildContextOptions(context), [context])
  const steps = useMemo(() => buildSteps(type, options, form), [type, options, form])
  const submitLabel = type === 'liquidation' && getCompanyLifecycleStatus(company) === 'liquidation'
    ? 'Tasfiye Bilgilerini Güncelle'
    : meta.submitLabel

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/companies/${company.id}/${meta.endpoint}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Wizard tamamlanamadı')
      onComplete(payload.data?.company || payload.data)
    } catch (submitError: any) {
      setError(submitError.message || 'Wizard tamamlanamadı')
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (field: string, value: any, previous: Record<string, any>) => {
    const next = { ...previous, [field]: value }
    if (field === 'liquidator_id') {
      const option = options.liquidators.find(item => item.value === value)
      next.liquidator_display_name = option?.label || ''
    }
    if (field === 'sgk_workplace_registered' && value !== 'true') {
      next.sgk_workplace_no = ''
    }
    return next
  }

  return (
    <RecordLifecycleWizard
      title={meta.title}
      subtitle={<span>{company.short_name || company.trade_name} yaşam döngüsü işlemi</span>}
      steps={steps}
      form={form}
      setForm={setForm}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      saving={saving}
      loadingMessage={loading ? 'Wizard bağlamı yükleniyor...' : undefined}
      contextError={contextError || undefined}
      error={error || undefined}
      sideInfo={<WizardSideInfo type={type} />}
      finalContent={<CompanyLifecycleSummaryPreview type={type} form={form} />}
      onFieldChange={handleFieldChange}
    />
  )
}

function buildSteps(
  type: CompanyLifecycleWizardType,
  options: ReturnType<typeof buildContextOptions>,
  form: Record<string, any>
): RecordLifecycleWizardStep[] {
  if (type === 'opening') return openingSteps(options)
  if (type === 'liquidation') return liquidationSteps(options)
  return deregistrationSteps(options, form)
}

function openingSteps(options: ReturnType<typeof buildContextOptions>): RecordLifecycleWizardStep[] {
  return [
    {
      id: 'identity',
      title: 'Şirket Kimliği ve Tescil',
      description: 'Master kayıt ve tescil bilgileri tamamlanır.',
      sections: [{
        id: 'identity-fields',
        title: 'Kimlik ve tescil',
        fields: [
          { name: 'company_display', label: 'Şirket', type: 'text', disabled: true },
          { name: 'trade_name', label: 'Ticari Ünvan', type: 'text', required: true, colSpan: 2 },
          { name: 'company_type', label: 'Şirket Türü', type: 'select', required: true, options: companyTypeOptions() },
          { name: 'foundation_date', label: 'Kuruluş Tarihi', type: 'date', required: true },
          { name: 'registration_date', label: 'Tescil Tarihi', type: 'date', required: true },
          { name: 'trade_registry_office', label: 'Ticaret Sicil Müdürlüğü', type: 'text', required: true },
          { name: 'trade_registry_no', label: 'Ticaret Sicil No', type: 'text', required: true },
          { name: 'mersis_no', label: 'MERSİS No', type: 'text' },
          { name: 'opening_note', label: 'Kuruluş Açıklaması', type: 'textarea', colSpan: 3 },
        ],
      }],
    },
    {
      id: 'public',
      title: 'Kamu Başlangıç Bilgileri',
      description: 'Kamu sekmesindeki kaynak bilgiler kontrol edilir.',
      sections: [{
        id: 'public-fields',
        title: 'Vergi, SGK ve NACE',
        fields: [
          {
            name: 'tax_no',
            label: 'VKN',
            type: 'text',
            required: true,
            pattern: '\\d{10}',
            automation: publicAutomation('VKN ve vergi dairesi Kamu sekmesinden okunur.'),
          },
          {
            name: 'tax_office',
            label: 'Vergi Dairesi',
            type: 'text',
            required: true,
            automation: publicAutomation('Vergi dairesi Kamu sekmesinden okunur.'),
          },
          { name: 'public_info_completed', label: 'Kamu Sekmesi Bilgileri Tamamlandı mı?', type: 'select', required: true, options: YES_NO_OPTIONS },
          { name: 'sgk_workplace_registered', label: 'SGK İşveren Kaydı Var mı?', type: 'select', required: true, options: YES_NO_OPTIONS },
          {
            name: 'sgk_workplace_no',
            label: 'SGK İşyeri Sicil No',
            type: 'text',
            requiredWhen: { field: 'sgk_workplace_registered', operator: 'equals', value: 'true' },
            visibleWhen: { field: 'sgk_workplace_registered', operator: 'equals', value: 'true' },
            automation: publicAutomation('SGK sicili Kamu sekmesinden okunur.'),
          },
          { name: 'nace_codes_available', label: 'NACE / Faaliyet Kodları Var mı?', type: 'select', required: true, options: YES_NO_OPTIONS },
          {
            name: 'primary_nace_selected',
            label: 'Birincil NACE Seçildi mi?',
            type: 'select',
            requiredWhen: { field: 'nace_codes_available', operator: 'equals', value: 'true' },
            options: YES_NO_OPTIONS,
            automation: publicAutomation('Birincil NACE seçimi Kamu sekmesinden okunur.'),
          },
          {
            name: 'kep_info_available',
            label: 'KEP / e-Tebligat Bilgisi Var mı?',
            type: 'select',
            required: true,
            options: YES_NO_OPTIONS,
            automation: publicAutomation('KEP ve e-Tebligat bilgisi Kamu sekmesinden okunur.'),
          },
        ],
      }],
    },
    {
      id: 'documents',
      title: 'Belgeler',
      description: 'Document Registry üzerinden yeni belge yüklenir veya mevcut belge seçilir.',
      sections: [{
        id: 'opening-documents',
        title: 'Açılış belgeleri',
        fields: [
          { name: 'foundation_trade_registry_gazette', label: 'Kuruluş Ticaret Sicil Gazetesi', type: 'document', required: true },
          { name: 'articles_of_association_document', label: 'Ana Sözleşme', type: 'document' },
          { name: 'tax_plate_document', label: 'Vergi Levhası', type: 'document' },
          { name: 'signature_circular_document', label: 'İmza Sirküleri', type: 'document' },
          { name: 'activity_certificate_document', label: 'Faaliyet Belgesi', type: 'document' },
          { name: 'sgk_opening_document', label: 'SGK İşyeri Açılış Belgesi', type: 'document' },
          { name: 'mersis_document', label: 'MERSİS Belgesi', type: 'document' },
          { name: 'other_opening_document', label: 'Diğer', type: 'document' },
        ],
      }],
    },
    confirmationStep('Onay ve Aktivasyon'),
  ]
}

function liquidationSteps(options: ReturnType<typeof buildContextOptions>): RecordLifecycleWizardStep[] {
  return [
    {
      id: 'decision',
      title: 'Tasfiye Kararı',
      sections: [{
        id: 'decision-fields',
        title: 'Karar bilgileri',
        fields: [
          { name: 'liquidation_decision_date', label: 'Tasfiye Karar Tarihi', type: 'date', required: true },
          { name: 'liquidation_start_date', label: 'Tasfiye Başlangıç Tarihi', type: 'date', required: true },
          { name: 'decision_type', label: 'Karar Türü', type: 'select', required: true, options: DECISION_TYPE_OPTIONS },
          { name: 'decision_no', label: 'Karar No', type: 'text', required: true },
          { name: 'liquidation_reason', label: 'Tasfiye Gerekçesi', type: 'textarea', required: true, colSpan: 3 },
          { name: 'notes', label: 'Açıklama', type: 'textarea', colSpan: 3 },
        ],
      }],
    },
    {
      id: 'liquidators',
      title: 'Tasfiye Yetkilileri',
      sections: [{
        id: 'liquidator-fields',
        title: 'Tasfiye memuru ve temsil yetkisi',
        fields: [
          {
            name: 'liquidator_id',
            label: 'Tasfiye Memuru / Memurları',
            type: 'select',
            required: true,
            searchable: true,
            options: options.liquidators,
            emptyOptionsRedirect: {
              href: '/app/sirket/companies/representatives',
              label: 'Temsilci sayfasına git',
              message: 'Tasfiye memuru seçmek için temsilci / paydaş kaydı bulunamadı.',
            },
          },
          { name: 'liquidator_authority', label: 'Tasfiye Temsil Yetkisi', type: 'text', required: true },
          { name: 'liquidator_authority_start_date', label: 'Yetki Başlangıç Tarihi', type: 'date', required: true },
          { name: 'liquidator_authority_document', label: 'Yetki Belgesi', type: 'document', required: true },
        ],
      }],
    },
    {
      id: 'controls',
      title: 'Kamu ve Operasyon Kontrolleri',
      sections: [{
        id: 'control-fields',
        title: 'Kontrol listesi',
        description: 'Bu kontroller ilk aşamada uyarı niteliğindedir; sistem ayarlarıyla blokaja çevrilebilir.',
        fields: [
          { name: 'tax_notification_required', label: 'Vergi dairesi bildirimi gerekli mi?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'sgk_notification_required', label: 'SGK bildirimi gerekli mi?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'bank_accounts_checked', label: 'Banka hesapları kontrol edildi mi?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'open_current_movements_checked', label: 'Açık cari hareketler var mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'open_contracts_checked', label: 'Açık sözleşmeler var mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'active_employees_checked', label: 'Aktif çalışan var mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'active_assets_checked', label: 'Aktif araç / varlık var mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'open_legal_obligations_checked', label: 'Açık dava / yükümlülük var mı?', type: 'select', options: YES_NO_OPTIONS },
        ],
      }],
    },
    {
      id: 'documents',
      title: 'Belgeler',
      sections: [{
        id: 'liquidation-documents',
        title: 'Tasfiye belgeleri',
        fields: [
          { name: 'liquidation_decision_document', label: 'Tasfiye Kararı', type: 'document', required: true },
          { name: 'assembly_decision_document', label: 'Genel Kurul / Ortaklar Kurulu Kararı', type: 'document' },
          { name: 'liquidator_assignment_document', label: 'Tasfiye Memuru Atama Belgesi', type: 'document' },
          { name: 'trade_registry_application_document', label: 'Ticaret Sicil Başvuru Belgesi', type: 'document' },
          { name: 'liquidation_announcement_document', label: 'Tasfiye İlanı', type: 'document' },
          { name: 'other_liquidation_document', label: 'Diğer', type: 'document' },
        ],
      }],
    },
    confirmationStep('Onay ve Tasfiyeye Alma'),
  ]
}

function deregistrationSteps(options: ReturnType<typeof buildContextOptions>, form: Record<string, any>): RecordLifecycleWizardStep[] {
  return [
    {
      id: 'completion-controls',
      title: 'Tasfiye Tamamlama Kontrolü',
      sections: [{
        id: 'completion-fields',
        title: 'Kapanış öncesi kontroller',
        children: hasDeregistrationWarnings(form) ? <WarningBox /> : null,
        fields: [
          { name: 'liquidation_completed', label: 'Tasfiye işlemleri tamamlandı mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'receivables_payables_settled', label: 'Alacak / borç tasfiyesi tamamlandı mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'bank_accounts_closed', label: 'Banka hesapları kapatıldı mı veya devredildi mi?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'no_active_employees', label: 'Aktif çalışan kalmadı mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'tax_closure_completed', label: 'Vergi kapanış süreci tamamlandı mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'sgk_closure_completed', label: 'SGK kapanış süreci tamamlandı mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'final_balance_ready', label: 'Son bilanço / nihai hesap hazır mı?', type: 'select', options: YES_NO_OPTIONS },
          { name: 'archive_responsible_selected', label: 'Defter ve belgelerin saklama sorumlusu belirlendi mi?', type: 'select', options: YES_NO_OPTIONS },
        ],
      }],
    },
    {
      id: 'deregistration-info',
      title: 'Terkin Bilgileri',
      sections: [{
        id: 'deregistration-fields',
        title: 'Terkin tescil bilgileri',
        fields: [
          { name: 'liquidation_completion_decision_date', label: 'Tasfiye Sonu Karar Tarihi', type: 'date', required: true },
          { name: 'deregistration_application_date', label: 'Terkin Başvuru Tarihi', type: 'date', required: true },
          { name: 'deregistration_registration_date', label: 'Terkin Tescil Tarihi', type: 'date', required: true },
          { name: 'deregistration_reference_no', label: 'Terkin Sicil No / Referans', type: 'text', required: true },
          { name: 'trade_registry_office', label: 'Ticaret Sicil Müdürlüğü', type: 'text', required: true },
          { name: 'notes', label: 'Açıklama', type: 'textarea', colSpan: 3 },
        ],
      }],
    },
    {
      id: 'public-closure',
      title: 'Kamu Kapanış Bilgileri',
      sections: [{
        id: 'public-closure-fields',
        title: 'Vergi, SGK ve e-Tebligat kapanışı',
        fields: [
          { name: 'tax_closure_status', label: 'Vergi Kapanış Durumu', type: 'select', required: true, options: STATUS_OPTIONS },
          { name: 'tax_closure_date', label: 'Vergi Kapanış Tarihi', type: 'date' },
          { name: 'sgk_closure_status', label: 'SGK Kapanış Durumu', type: 'select', required: true, options: STATUS_OPTIONS },
          { name: 'sgk_closure_date', label: 'SGK Kapanış Tarihi', type: 'date' },
          { name: 'kep_closure_status', label: 'KEP / e-Tebligat Kapanış Durumu', type: 'select', options: STATUS_OPTIONS },
          { name: 'financial_seal_closure_note', label: 'Mali Mühür / e-İmza Kapanış Notu', type: 'textarea', colSpan: 3 },
          {
            name: 'document_archive_responsible',
            label: 'Defter / Belge Saklama Sorumlusu',
            type: 'select',
            options: options.archiveResponsibles,
            emptyOptionsRedirect: {
              href: '/app/sirket/companies/stakeholders',
              label: 'Paydaş sayfasına git',
              message: 'Saklama sorumlusu seçmek için kişi, temsilci veya paydaş kaydı bulunamadı.',
            },
          },
        ],
      }],
    },
    {
      id: 'documents',
      title: 'Belgeler',
      sections: [{
        id: 'deregistration-documents',
        title: 'Terkin belgeleri',
        fields: [
          { name: 'deregistration_trade_registry_gazette', label: 'Terkin Ticaret Sicil Gazetesi', type: 'document', required: true },
          { name: 'liquidation_completion_decision_document', label: 'Tasfiye Sonu Kararı', type: 'document' },
          { name: 'final_balance_document', label: 'Son Bilanço / Nihai Hesap', type: 'document' },
          { name: 'tax_closure_document', label: 'Vergi Kapanış Belgesi', type: 'document' },
          { name: 'sgk_closure_document', label: 'SGK Kapanış Belgesi', type: 'document' },
          { name: 'archive_minutes_document', label: 'Defter / Belge Saklama Tutanağı', type: 'document' },
          { name: 'other_deregistration_document', label: 'Diğer', type: 'document' },
        ],
      }],
    },
    confirmationStep('Onay ve Kapatma'),
  ]
}

function confirmationStep(title: string): RecordLifecycleWizardStep {
  return {
    id: 'confirmation',
    title,
    description: 'Son adımda tüm bilgiler tek payload olarak transaction içinde kaydedilir.',
    sections: [{
      id: 'confirmation-placeholder',
      title: 'Özet ve onay',
      fields: [],
    }],
  }
}

function createInitialForm(type: CompanyLifecycleWizardType, company: Sirket, context: Record<string, any> | null) {
  const current = context?.company || company
  const opening = context?.opening || company.opening_details || {}
  const liquidation = context?.liquidation || company.liquidation_details || {}
  const deregistration = context?.deregistration || company.deregistration_details || {}
  const publicTax = context?.public?.tax || company.public_tax || {}
  const publicSgk = context?.public?.sgk || company.public_sgk || {}
  const publicRegistry = context?.public?.registry || company.public_registry || {}
  const publicChannels = context?.public?.channels || company.public_channels || {}
  const naceRows = context?.references?.naceCodes || (company as any).company_nace_codes || []
  const hasNace = Array.isArray(naceRows) && naceRows.length > 0
  const hasPrimaryNace = Array.isArray(naceRows) && naceRows.some((row: any) => row?.is_primary)

  if (type === 'opening') {
    return {
      company_display: current.short_name || current.trade_name || '',
      trade_name: current.trade_name || '',
      company_type: current.company_type || '',
      foundation_date: opening.foundation_date || current.foundation_date || '',
      registration_date: opening.registration_date || publicRegistry.establishment_registration_date || '',
      trade_registry_office: opening.trade_registry_office || current.trade_registry_office || publicRegistry.registry_office || '',
      trade_registry_no: opening.trade_registry_no || current.trade_registry_number || publicRegistry.trade_registry_no || '',
      mersis_no: opening.mersis_no || current.mersis_number || publicRegistry.mersis_number || '',
      opening_note: opening.payload_json?.opening_note || '',
      tax_no: opening.tax_no || current.tax_number || publicTax.tax_number || '',
      tax_office: opening.tax_office_id || current.tax_office || publicTax.tax_office || '',
      public_info_completed: publicTax.tax_number || publicSgk.workplace_registry_no || publicRegistry.mersis_number ? 'true' : '',
      sgk_workplace_registered: publicSgk.workplace_registry_no || opening.sgk_workplace_no ? 'true' : '',
      sgk_workplace_no: opening.sgk_workplace_no || current.sgk_workplace_registry_no || publicSgk.workplace_registry_no || '',
      nace_codes_available: hasNace ? 'true' : '',
      primary_nace_selected: hasPrimaryNace ? 'true' : '',
      primary_nace_id: naceRows.find((row: any) => row?.is_primary)?.id || '',
      kep_info_available: publicChannels.kep_address || publicChannels.e_notification_address || current.electronic_notification_address ? 'true' : '',
      kep_address: publicChannels.kep_address || '',
      electronic_notification_address: publicChannels.e_notification_address || current.electronic_notification_address || '',
    }
  }

  if (type === 'liquidation') {
    return {
      liquidation_decision_date: liquidation.liquidation_decision_date || '',
      liquidation_start_date: liquidation.liquidation_start_date || '',
      decision_type: liquidation.decision_type || '',
      decision_no: liquidation.decision_no || '',
      liquidation_reason: liquidation.liquidation_reason || '',
      notes: liquidation.notes || '',
      liquidator_id: liquidation.liquidator_person_id || liquidation.liquidator_organization_id || '',
      liquidator_display_name: liquidation.liquidator_display_name || '',
      liquidator_authority: liquidation.liquidator_authority || '',
      liquidator_authority_start_date: liquidation.liquidator_authority_start_date || '',
      trade_registry_application_status: liquidation.trade_registry_application_status || '',
      tax_notification_status: liquidation.tax_notification_status || '',
      sgk_notification_status: liquidation.sgk_notification_status || '',
    }
  }

  return {
    liquidation_completed: '',
    receivables_payables_settled: '',
    bank_accounts_closed: '',
    no_active_employees: '',
    tax_closure_completed: deregistration.tax_closure_status === 'completed' ? 'true' : '',
    sgk_closure_completed: deregistration.sgk_closure_status === 'completed' ? 'true' : '',
    final_balance_ready: '',
    archive_responsible_selected: deregistration.document_archive_responsible ? 'true' : '',
    liquidation_completion_decision_date: deregistration.liquidation_completion_decision_date || '',
    deregistration_application_date: deregistration.deregistration_application_date || '',
    deregistration_registration_date: deregistration.deregistration_registration_date || '',
    deregistration_reference_no: deregistration.deregistration_reference_no || '',
    trade_registry_office: deregistration.trade_registry_office || current.trade_registry_office || '',
    tax_closure_status: deregistration.tax_closure_status || '',
    tax_closure_date: deregistration.tax_closure_date || '',
    sgk_closure_status: deregistration.sgk_closure_status || '',
    sgk_closure_date: deregistration.sgk_closure_date || '',
    kep_closure_status: deregistration.kep_closure_status || '',
    financial_seal_closure_note: deregistration.financial_seal_closure_note || '',
    document_archive_responsible: deregistration.document_archive_responsible || '',
    notes: deregistration.notes || '',
  }
}

function buildContextOptions(context: Record<string, any> | null) {
  const references = context?.references || {}
  const representatives = toEntityOptions(references.representatives, 'Temsilci')
  const partners = toEntityOptions(references.partners, 'Ortak')
  const stakeholders = toEntityOptions(references.stakeholders, 'Paydaş')
  const people = uniqueOptions([...representatives, ...partners, ...stakeholders])
  return {
    liquidators: people,
    archiveResponsibles: people,
  }
}

function toEntityOptions(rows: any[] | undefined, suffix: string): RecordLifecycleWizardOption[] {
  return (rows || []).map(row => ({
    value: row.person_id || row.organization_id || row.id,
    label: `${row.display_name || row.full_name || row.partner_name || row.name || 'Kayıt'} (${suffix})`,
  })).filter(option => option.value)
}

function uniqueOptions(options: RecordLifecycleWizardOption[]) {
  const seen = new Set<string>()
  return options.filter(option => {
    if (seen.has(option.value)) return false
    seen.add(option.value)
    return true
  })
}

function CompanyLifecycleSummaryPreview({ type, form }: { type: CompanyLifecycleWizardType; form: Record<string, any> }) {
  const rows = summaryRows(type, form)
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
        <ShieldCheck size={16} />
        Onay özeti
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-gray-950">
            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{formatSummaryValue(value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function summaryRows(type: CompanyLifecycleWizardType, form: Record<string, any>): Array<[string, any]> {
  if (type === 'opening') {
    return [
      ['Şirket', form.company_display || form.trade_name],
      ['Kuruluş Tarihi', form.foundation_date],
      ['Tescil Tarihi', form.registration_date],
      ['Vergi Bilgileri', [form.tax_no, form.tax_office].filter(Boolean).join(' / ')],
      ['SGK Bilgileri', form.sgk_workplace_no || (form.sgk_workplace_registered === 'true' ? 'Var' : 'Yok')],
      ['NACE Durumu', form.primary_nace_selected === 'true' ? 'Birincil NACE seçildi' : 'Eksik / bekliyor'],
      ['Belgeler', countDocumentFields(form)],
    ]
  }
  if (type === 'liquidation') {
    return [
      ['Karar Tarihi', form.liquidation_decision_date],
      ['Başlangıç Tarihi', form.liquidation_start_date],
      ['Karar No', form.decision_no],
      ['Tasfiye Memuru', form.liquidator_display_name || form.liquidator_id],
      ['Gerekçe', form.liquidation_reason],
      ['Belgeler', countDocumentFields(form)],
    ]
  }
  return [
    ['Tasfiye Sonu Kararı', form.liquidation_completion_decision_date],
    ['Terkin Başvuru', form.deregistration_application_date],
    ['Terkin Tescil', form.deregistration_registration_date],
    ['Terkin Referansı', form.deregistration_reference_no],
    ['Vergi / SGK Kapanış', `${optionLabel(STATUS_OPTIONS, form.tax_closure_status)} / ${optionLabel(STATUS_OPTIONS, form.sgk_closure_status)}`],
    ['Belgeler', countDocumentFields(form)],
  ]
}

function countDocumentFields(form: Record<string, any>) {
  const count = Object.entries(form).filter(([key, value]) => key.includes('document') && hasValue(value)).length
  return count > 0 ? `${count} belge seçildi` : 'Belge seçilmedi'
}

function WizardSideInfo({ type }: { type: CompanyLifecycleWizardType }) {
  const finalStatus = type === 'opening' ? 'Aktif' : type === 'liquidation' ? 'Tasfiye Halinde' : 'Terkin Edildi'
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-semibold">
        <CheckCircle2 size={14} />
        Son durum: {finalStatus}
      </div>
      <p>Adımlar veritabanına parça parça yazılmaz; son onayda detail, belge referansı, lifecycle event, durum ve history tek transaction ile kaydedilir.</p>
    </div>
  )
}

function WarningBox() {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      Eksik kapanış kontrolleri varsa terkin öncesi operasyonel uyarı olarak izlenir.
    </div>
  )
}

function hasDeregistrationWarnings(form: Record<string, any>) {
  const tracked = [
    'liquidation_completed',
    'receivables_payables_settled',
    'bank_accounts_closed',
    'no_active_employees',
    'tax_closure_completed',
    'sgk_closure_completed',
    'final_balance_ready',
    'archive_responsible_selected',
  ]
  return tracked.some(field => form[field] && form[field] !== 'true')
}

function publicAutomation(title: string) {
  return {
    sourceFields: ['company_display'],
    targetFields: ['tax_no', 'tax_office', 'sgk_workplace_no', 'primary_nace_selected', 'kep_info_available'],
    title,
    idleLabel: 'Kaynak bekliyor',
    workingLabel: 'Okunuyor',
    doneLabel: 'OK',
    noDataLabel: 'Veri yok',
  }
}

function companyTypeOptions(): RecordLifecycleWizardOption[] {
  return [
    { value: 'anonim', label: 'Sermaye Şirketi - Anonim' },
    { value: 'limited', label: 'Sermaye Şirketi - Limited' },
    { value: 'komandit', label: 'Sermaye Şirketi - Komandit' },
    { value: 'kolektif', label: 'Şahıs Şirketi - Kolektif' },
    { value: 'adi_komandit', label: 'Şahıs Şirketi - Adi Komandit' },
    { value: 'adi_sirket', label: 'Şahıs Şirketi - Adi Şirket' },
  ]
}

function optionLabel(options: RecordLifecycleWizardOption[], value: any) {
  return options.find(option => option.value === value)?.label || (value ? String(value) : '-')
}

function formatSummaryValue(value: any) {
  if (value === 'true') return 'Evet'
  if (value === 'false') return 'Hayır'
  if (!hasValue(value)) return '-'
  return String(value)
}

function hasValue(value: any) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object' && value !== null) return Object.values(value).some(hasValue)
  return value !== undefined && value !== null && value !== ''
}

function getCompanyLifecycleStatus(company: Sirket) {
  return company.record_status || company.company_status || (company.is_deleted ? 'deregistered' : 'active')
}
