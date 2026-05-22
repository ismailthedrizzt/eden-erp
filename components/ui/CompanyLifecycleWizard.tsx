'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Plus, Search, ShieldCheck, Star, Trash2 } from 'lucide-react'
import {
  RecordLifecycleWizard,
  type RecordLifecycleWizardOption,
  type RecordLifecycleWizardStep,
} from './RecordLifecycleWizard'
import { cn } from '@/lib/utils'
import { formControlClass } from '@/components/ui/formControlStyles'
import type { Sirket } from '@/types/sirket'

export type CompanyLifecycleWizardType = 'opening' | 'liquidation' | 'deregistration'

type CompanyLifecycleWizardProps = {
  type: CompanyLifecycleWizardType
  company: Sirket
  onClose: () => void
  onComplete: (company?: Partial<Sirket>) => void
}

type NaceReferenceRow = {
  id: string
  nace_code: string
  description?: string | null
  hazard_class?: string | null
}

type WizardNaceSelection = {
  nace_code_id: string
  is_primary: boolean
  nace_code?: NaceReferenceRow | null
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
        if (!response.ok) throw new Error(payload.error || 'Bilgiler yüklenemedi')
        return payload.data || {}
      })
      .then(payload => {
        if (cancelled) return
        setContext(payload)
        setForm(createInitialForm(type, company, payload))
      })
      .catch(fetchError => {
        if (cancelled) return
        setContextError(fetchError.message || 'Bilgiler yüklenemedi')
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
    if (field === 'nace_codes') {
      const naceCodes = normalizeWizardNaceSelections(value)
      const primary = naceCodes.find(row => row.is_primary) || null
      next.nace_codes = naceCodes
      next.nace_codes_available = naceCodes.length > 0 ? 'true' : ''
      next.primary_nace_selected = primary ? 'true' : ''
      next.primary_nace_id = primary?.nace_code_id || ''
    }
    if (field === 'sgk_workplace_registered' && value !== 'true') {
      next.sgk_workplace_no = ''
    }
    return next
  }

  return (
    <RecordLifecycleWizard
      title={meta.title}
      steps={steps}
      form={form}
      setForm={setForm}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      saving={saving}
      loadingMessage={loading ? 'Bilgiler yükleniyor...' : undefined}
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
      title: 'Kimlik',
      sections: [{
        id: 'identity-fields',
        title: 'Şirket bilgileri',
        fields: [
          { name: 'trade_name', label: 'Ticari Ünvan', type: 'text', required: true, colSpan: 2 },
          { name: 'short_name', label: 'Kısa Ünvan', type: 'text' },
          { name: 'company_type', label: 'Şirket Türü', type: 'select', required: true, options: companyTypeOptions() },
          { name: 'foundation_date', label: 'Kuruluş Tarihi', type: 'date', required: true },
          { name: 'registration_date', label: 'Tescil Tarihi', type: 'date', required: true },
          {
            name: 'trade_registry_office',
            label: 'Ticaret Sicil Müdürlüğü',
            type: 'select',
            required: true,
            searchable: true,
            remoteOptions: {
              endpoint: '/api/reference/trade-registry-offices',
              minQueryLength: 2,
              limit: 40,
            },
          },
          { name: 'trade_registry_no', label: 'Ticaret Sicil No', type: 'text', required: true },
          { name: 'mersis_no', label: 'MERSİS No', type: 'text' },
          {
            name: 'nace_codes',
            label: 'NACE / Faaliyet Kodları',
            type: 'custom',
            required: true,
            colSpan: 3,
            render: ({ value, onChange, readOnly }) => (
              <NaceCodesWizardField value={value} onChange={onChange} readOnly={readOnly} />
            ),
          },
        ],
      }],
    },
    {
      id: 'public',
      title: 'Kamu',
      sections: [{
        id: 'public-fields',
        title: 'Vergi ve SGK',
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
    confirmationStep('Onay'),
  ]
}

function liquidationSteps(options: ReturnType<typeof buildContextOptions>): RecordLifecycleWizardStep[] {
  return [
    {
      id: 'decision',
      title: 'Karar',
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
      title: 'Yetkililer',
      sections: [{
        id: 'liquidator-fields',
        title: 'Yetki bilgileri',
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
      title: 'Kontroller',
      sections: [{
        id: 'control-fields',
        title: 'Kontrol listesi',
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
    confirmationStep('Onay'),
  ]
}

function deregistrationSteps(options: ReturnType<typeof buildContextOptions>, form: Record<string, any>): RecordLifecycleWizardStep[] {
  return [
    {
      id: 'completion-controls',
      title: 'Kontroller',
      sections: [{
        id: 'completion-fields',
        title: 'Kapanış kontrolleri',
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
      title: 'Terkin',
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
      title: 'Kamu',
      sections: [{
        id: 'public-closure-fields',
        title: 'Kapanış bilgileri',
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
    confirmationStep('Onay'),
  ]
}

function confirmationStep(title: string): RecordLifecycleWizardStep {
  return {
    id: 'confirmation',
    title,
    sections: [{
      id: 'confirmation-placeholder',
      title: 'Özet',
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
      short_name: current.short_name || '',
      trade_name: current.trade_name || '',
      company_type: current.company_type || '',
      foundation_date: opening.foundation_date || current.foundation_date || '',
      registration_date: opening.registration_date || publicRegistry.establishment_registration_date || '',
      trade_registry_office: opening.trade_registry_office || current.trade_registry_office || publicRegistry.registry_office || '',
      trade_registry_no: opening.trade_registry_no || current.trade_registry_number || publicRegistry.trade_registry_no || '',
      mersis_no: opening.mersis_no || current.mersis_number || publicRegistry.mersis_number || '',
      nace_codes: normalizeWizardNaceSelections(opening.payload_json?.nace_codes || naceRows),
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
    const naceCodes = normalizeWizardNaceSelections(form.nace_codes)
    const primaryNace = naceCodes.find(row => row.is_primary)
    return [
      ['Şirket', form.short_name || form.trade_name],
      ['Kuruluş Tarihi', form.foundation_date],
      ['Tescil Tarihi', form.registration_date],
      ['Vergi Bilgileri', [form.tax_no, form.tax_office].filter(Boolean).join(' / ')],
      ['SGK Bilgileri', form.sgk_workplace_no || (form.sgk_workplace_registered === 'true' ? 'Var' : 'Yok')],
      ['NACE Durumu', primaryNace ? `${naceLabel(primaryNace)} (${naceCodes.length}/5)` : 'Eksik / bekliyor'],
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
        Durum: {finalStatus}
      </div>
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

function NaceCodesWizardField({
  value,
  onChange,
  readOnly,
}: {
  value: any
  onChange: (value: WizardNaceSelection[]) => void
  readOnly: boolean
}) {
  const rows = normalizeWizardNaceSelections(value)
  const [query, setQuery] = useState('')
  const [selectedNaceId, setSelectedNaceId] = useState('')
  const [options, setOptions] = useState<NaceReferenceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const primaryRow = rows.find(row => row.is_primary)
  const trimmedQuery = query.trim()
  const canSearchNace = trimmedQuery.length >= 2

  useEffect(() => {
    let cancelled = false
    if (readOnly || query.trim().length < 2) {
      setOptions([])
      setSelectedNaceId('')
      setLoading(false)
      setWarning(null)
      return () => {
        cancelled = true
      }
    }

    const timeout = window.setTimeout(() => {
      const url = new URL('/api/reference/nace-codes', window.location.origin)
      url.searchParams.set('q', query.trim())

      setLoading(true)
      fetch(url.toString())
        .then(async response => {
          const payload = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(payload.error || 'NACE listesi alınamadı.')
          return payload as { data?: NaceReferenceRow[]; warning?: string }
        })
        .then(payload => {
          if (cancelled) return
          setOptions(Array.isArray(payload.data) ? payload.data : [])
          setWarning(payload.warning || null)
        })
        .catch(error => {
          if (cancelled) return
          setOptions([])
          setWarning(error instanceof Error ? error.message : 'NACE listesi alınamadı.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [query, readOnly])

  const emitRows = (nextRows: WizardNaceSelection[]) => {
    const normalizedRows = enforceSinglePrimary(normalizeWizardNaceSelections(nextRows).slice(0, 5))
    onChange(normalizedRows)
  }

  const addNace = () => {
    const option = options.find(item => item.id === selectedNaceId)
    if (!option) return
    if (rows.length >= 5) {
      setWarning('En fazla 5 NACE kodu seçilebilir.')
      return
    }
    if (rows.some(row => row.nace_code_id === option.id)) {
      setWarning('Bu NACE kodu zaten seçildi.')
      return
    }

    emitRows([
      ...rows,
      {
        nace_code_id: option.id,
        is_primary: rows.length === 0,
        nace_code: option,
      },
    ])
    setSelectedNaceId('')
    setQuery('')
    setWarning(null)
  }

  const removeNace = (naceCodeId: string) => {
    emitRows(rows.filter(row => row.nace_code_id !== naceCodeId))
  }

  const setPrimary = (naceCodeId: string) => {
    emitRows(rows.map(row => ({ ...row, is_primary: row.nace_code_id === naceCodeId })))
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">NACE / Faaliyet Kodları</div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">En fazla 5 kod seçin; tam olarak 1 kod birincil olmalıdır.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
          {rows.length}/5
        </span>
      </div>

      {!readOnly && (
        <div className="mb-3 grid gap-2 lg:grid-cols-[220px_1fr_auto]">
          <label className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className={formControlClass({ rounded: 'md', className: 'pl-9' })}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Kod veya faaliyet ara"
            />
          </label>
          <select
            className={formControlClass({ rounded: 'md' })}
            value={selectedNaceId}
            onChange={event => setSelectedNaceId(event.target.value)}
            disabled={!canSearchNace || loading || options.length === 0 || rows.length >= 5}
          >
            <option value="">{loading ? 'Aranıyor...' : canSearchNace ? 'NACE kodu seç' : 'En az 2 karakter yazın'}</option>
            {options.map(option => (
              <option key={option.id} value={option.id} disabled={rows.some(row => row.nace_code_id === option.id)}>
                {naceReferenceLabel(option)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addNace}
            disabled={!selectedNaceId || loading || rows.length >= 5}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            <Plus size={16} />
            Ekle
          </button>
        </div>
      )}

      {(warning || !primaryRow) && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          {warning || 'Birincil NACE kodu seçilmelidir.'}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        {rows.length === 0 ? (
          <div className="px-3 py-5 text-center text-sm text-gray-500 dark:text-gray-400">NACE kodu seçilmedi.</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {rows.map(row => (
              <div key={row.nace_code_id} className="grid gap-2 px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white">{naceLabel(row)}</div>
                  {row.nace_code?.hazard_class && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Tehlike sınıfı: {row.nace_code.hazard_class}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPrimary(row.nace_code_id)}
                  disabled={readOnly || row.is_primary}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold',
                    row.is_primary
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40',
                    readOnly && 'cursor-default'
                  )}
                >
                  <Star size={14} />
                  {row.is_primary ? 'Birincil' : 'Birincil Yap'}
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeNace(row.nace_code_id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={14} />
                    Kaldır
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
    sourceFields: ['short_name', 'trade_name'],
    targetFields: ['tax_no', 'tax_office', 'sgk_workplace_no', 'kep_info_available'],
    title,
    idleLabel: 'Kaynak bekliyor',
    workingLabel: 'Okunuyor',
    doneLabel: 'OK',
    noDataLabel: 'Veri yok',
  }
}

function normalizeWizardNaceSelections(value: any): WizardNaceSelection[] {
  const rows = Array.isArray(value) ? value : []
  const seen = new Set<string>()
  const normalized: WizardNaceSelection[] = rows
    .map((row: any): WizardNaceSelection | null => {
      const naceCode = row?.nace_code || row?.naceCode || null
      const naceCodeId = String(row?.nace_code_id || row?.naceCodeId || naceCode?.id || row?.id || '').trim()
      if (!naceCodeId || seen.has(naceCodeId)) return null
      seen.add(naceCodeId)
      return {
        nace_code_id: naceCodeId,
        is_primary: row?.is_primary === true || row?.isPrimary === true,
        nace_code: naceCode ? {
          id: String(naceCode.id || naceCodeId),
          nace_code: String(naceCode.nace_code || ''),
          description: naceCode.description || null,
          hazard_class: naceCode.hazard_class || null,
        } : null,
      }
    })
    .filter((row): row is WizardNaceSelection => !!row)
    .slice(0, 5)

  return enforceSinglePrimary(normalized)
}

function enforceSinglePrimary(rows: WizardNaceSelection[]) {
  if (rows.length === 0) return []
  const primaryIndex = rows.findIndex(row => row.is_primary)
  return rows.map((row, index) => ({
    ...row,
    is_primary: primaryIndex >= 0 ? index === primaryIndex : index === 0,
  }))
}

function naceReferenceLabel(option: NaceReferenceRow) {
  return [option.nace_code, option.description].filter(Boolean).join(' - ')
}

function naceLabel(row: WizardNaceSelection) {
  const code = row.nace_code?.nace_code || row.nace_code_id
  return [code, row.nace_code?.description].filter(Boolean).join(' - ')
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
