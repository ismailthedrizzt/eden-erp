'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Search, Star, Trash2 } from 'lucide-react'
import {
  RecordLifecycleWizard,
  type RecordLifecycleWizardOption,
  type RecordLifecycleWizardStep,
} from './RecordLifecycleWizard'
import {
  createLifecycleDocumentsStep,
  createLifecycleInformationStep,
} from './lifecycleWizardTemplate'
import {
  COMPANY_LIFECYCLE_PROCESSES,
  type CompanyLifecycleWizardType,
} from '@/lib/lifecycle/processes/companyLifecycleProcesses'
import { cn } from '@/lib/utils'
import { formControlClass } from '@/components/ui/formControlStyles'
import type { Sirket } from '@/types/sirket'

export type { CompanyLifecycleWizardType } from '@/lib/lifecycle/processes/companyLifecycleProcesses'

type CompanyLifecycleWizardProps = {
  type: CompanyLifecycleWizardType
  company: Sirket
  readOnly?: boolean
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

export function CompanyLifecycleWizard({ type, company, readOnly = false, onClose, onComplete }: CompanyLifecycleWizardProps) {
  const [form, setForm] = useState<Record<string, any>>({})
  const [context, setContext] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [contextError, setContextError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const template = COMPANY_LIFECYCLE_PROCESSES[type]

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setContextError(null)
    setError(null)

    const contextUrl = `/api/companies/${company.id}/${template.endpoint}/context${readOnly ? '?readonly=true' : ''}`
    fetch(contextUrl)
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
  }, [company, readOnly, template.endpoint, type])

  const options = useMemo(() => buildContextOptions(context), [context])
  const steps = useMemo(() => buildSteps(type, options, form), [type, options, form])
  const openingCompletionIssues = useMemo(() => type === 'opening' ? getOpeningCompletionIssues(form) : [], [form, type])
  const submitLabel = type === 'liquidation' && getCompanyLifecycleStatus(company) === 'liquidation'
    ? 'Tasfiye Bilgilerini Güncelle'
    : template.submitLabel

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/companies/${company.id}/${template.endpoint}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'opening' ? buildOpeningSubmitForm(form) : form),
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
    if (type === 'opening' && (field === 'foundation_capital_amount' || field === 'foundation_share_units')) {
      next.foundation_nominal_value = calculateShareValue(next.foundation_capital_amount, next.foundation_share_units)
      delete next.foundation_share_ratio
      delete next.share_ratio
    }
    return next
  }

  return (
    <RecordLifecycleWizard
      title={template.title}
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
      submitBlockedContent={type === 'opening' && openingCompletionIssues.length > 0 ? (
        <span>Eksik açılış bilgileri: {openingCompletionIssues.join(', ')}</span>
      ) : undefined}
      readOnly={readOnly}
      onFieldChange={handleFieldChange}
    />
  )
}

function buildSteps(
  type: CompanyLifecycleWizardType,
  options: ReturnType<typeof buildContextOptions>,
  form: Record<string, any>
): RecordLifecycleWizardStep[] {
  if (type === 'opening') return openingSteps(options, form)
  if (type === 'liquidation') return liquidationSteps(options)
  return deregistrationSteps(options, form)
}

function openingSteps(_options: ReturnType<typeof buildContextOptions>, form: Record<string, any>): RecordLifecycleWizardStep[] {
  return [
    createLifecycleInformationStep([
        {
          id: 'identity-fields',
          title: 'Şirket bilgileri',
          fields: [
            { name: 'trade_name', label: 'Ticari Ünvan', type: 'text', required: true, colSpan: 2 },
            { name: 'short_name', label: 'Kısa Ünvan', type: 'text' },
            { name: 'company_type', label: 'Şirket Türü', type: 'select', required: true, options: companyTypeOptions() },
            {
              name: 'foundation_capital_amount',
              label: 'Taahhüt Edilen Sermaye',
              type: 'custom',
              render: ({ value, onChange, readOnly, className }) => (
                <CurrencyWizardInput
                  value={value}
                  onChange={onChange}
                  readOnly={readOnly}
                  className={className}
                />
              ),
            },
            { name: 'foundation_share_units', label: 'Pay Sayısı', type: 'number', inputMode: 'numeric' },
            {
              name: 'foundation_nominal_value',
              label: 'Pay Değeri',
              type: 'custom',
              disabled: true,
              render: ({ data, className }) => (
                <CalculatedShareValueField
                  className={className}
                  capitalAmount={data.foundation_capital_amount}
                  shareUnits={data.foundation_share_units}
                />
              ),
            },
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
            { name: 'trade_registry_number', label: 'Ticaret Sicil No', type: 'text', required: true },
            { name: 'mersis_number', label: 'MERSİS No', type: 'text' },
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
        },
        {
          id: 'public-fields',
          title: 'Vergi ve SGK',
          fields: [
            {
              name: 'tax_number',
              label: 'VKN',
              type: 'text',
              required: true,
              pattern: '\\d{10}',
              automation: publicAutomation('VKN ve vergi dairesi kamu kayıtlarından okunur.'),
            },
            {
              name: 'tax_office',
              label: 'Vergi Dairesi',
              type: 'text',
              required: true,
              automation: publicAutomation('Vergi dairesi kamu kayıtlarından okunur.'),
            },
            {
              name: 'sgk_workplace_registry_no',
              label: 'SGK İşyeri Sicil No',
              type: 'text',
              automation: publicAutomation('SGK sicili kamu kayıtlarından okunur.'),
            },
            {
              name: 'electronic_notification_address',
              label: 'Elektronik Tebligat Adresi',
              type: 'email',
              automation: publicAutomation('Elektronik tebligat adresi kamu kayıtlarından okunur.'),
            },
          ],
        },
      ]),
    createLifecycleDocumentsStep({
      sectionId: 'opening-documents',
      sectionTitle: 'Açılış belgeleri',
      documents: COMPANY_LIFECYCLE_PROCESSES.opening.completion.documentWrites,
    }),
    createOpeningPreviewStep(form),
  ]
}

function createOpeningPreviewStep(form: Record<string, any>): RecordLifecycleWizardStep {
  const documentStatuses = getOpeningDocumentStatuses(form)
  const missingRequiredDocuments = documentStatuses.filter(item => item.required && !item.ready)
  const summaryRows = getOpeningPreviewRows(form)

  return {
    id: 'preview-complete',
    title: 'Önizleme ve Tamamla',
    description: 'Açılış kaydı tamamlanmadan önce son kontrol.',
    sections: [
      {
        id: 'opening-preview-summary',
        title: 'Şirket açılış özeti',
        children: (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summaryRows.map(row => (
              <div key={row.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{row.label}</div>
                <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{row.value || '-'}</div>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'opening-preview-documents',
        title: 'Belge kontrolü',
        children: (
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              {documentStatuses.map(document => (
                <div
                  key={document.field}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    document.ready
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : document.required
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
                        : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                  )}
                >
                  {document.ready ? <CheckCircle2 size={15} /> : <FileText size={15} />}
                  <span className="min-w-0 flex-1">{document.label}</span>
                  {document.required && <span className="text-xs font-semibold">Zorunlu</span>}
                </div>
              ))}
            </div>
            {missingRequiredDocuments.length > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                Eksik zorunlu belgeler: {missingRequiredDocuments.map(document => document.label).join(', ')}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                Zorunlu açılış belgeleri tamam.
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'opening-preview-confirmation',
        title: 'Tamamlama etkisi',
        children: (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
            Bu işlem tamamlandığında taslak şirket aktif hale gelir; tescil, vergi, SGK, NACE ve açılış belgeleri ilgili şirket kayıtlarına yazılır.
          </div>
        ),
      },
    ],
  }
}

function liquidationSteps(options: ReturnType<typeof buildContextOptions>): RecordLifecycleWizardStep[] {
  return [
    createLifecycleInformationStep([
        {
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
        },
        {
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
          ],
        },
        {
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
        },
      ]),
    createLifecycleDocumentsStep({
      sectionId: 'liquidation-documents',
      sectionTitle: 'Tasfiye belgeleri',
      documents: COMPANY_LIFECYCLE_PROCESSES.liquidation.completion.documentWrites,
    }),
  ]
}

function deregistrationSteps(options: ReturnType<typeof buildContextOptions>, form: Record<string, any>): RecordLifecycleWizardStep[] {
  return [
    createLifecycleInformationStep([
        {
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
        },
        {
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
        },
        {
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
        },
      ]),
    createLifecycleDocumentsStep({
      sectionId: 'deregistration-documents',
      sectionTitle: 'Terkin belgeleri',
      documents: COMPANY_LIFECYCLE_PROCESSES.deregistration.completion.documentWrites,
    }),
  ]
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
    const foundationCapitalAmount = opening.payload_json?.foundation_capital_amount ?? opening.payload_json?.capital_amount ?? ''
    const foundationShareUnits = opening.payload_json?.foundation_share_units ?? opening.payload_json?.share_units ?? ''
    const foundationNominalValue = opening.payload_json?.foundation_nominal_value ?? opening.payload_json?.nominal_value ?? calculateShareValue(foundationCapitalAmount, foundationShareUnits)

    return {
      short_name: current.short_name || '',
      trade_name: current.trade_name || '',
      company_type: current.company_type || '',
      registration_date: opening.registration_date || publicRegistry.establishment_registration_date || opening.foundation_date || current.foundation_date || '',
      trade_registry_office: opening.trade_registry_office || current.trade_registry_office || publicRegistry.registry_office || '',
      trade_registry_number: opening.trade_registry_number || opening.trade_registry_no || current.trade_registry_number || publicRegistry.trade_registry_no || '',
      mersis_number: opening.mersis_number || opening.mersis_no || current.mersis_number || publicRegistry.mersis_number || '',
      nace_codes: normalizeWizardNaceSelections(opening.payload_json?.nace_codes || naceRows),
      foundation_capital_amount: foundationCapitalAmount,
      foundation_share_units: foundationShareUnits,
      foundation_nominal_value: foundationNominalValue,
      tax_number: opening.tax_number || opening.tax_no || current.tax_number || publicTax.tax_number || '',
      tax_office: opening.tax_office_id || current.tax_office || publicTax.tax_office || '',
      sgk_workplace_registry_no: opening.sgk_workplace_registry_no || opening.sgk_workplace_no || current.sgk_workplace_registry_no || publicSgk.workplace_registry_no || '',
      nace_codes_available: hasNace ? 'true' : '',
      primary_nace_selected: hasPrimaryNace ? 'true' : '',
      primary_nace_id: naceRows.find((row: any) => row?.is_primary)?.id || '',
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
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<NaceReferenceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const primaryRow = rows.find(row => row.is_primary)
  const trimmedQuery = query.trim()
  const canSearchNace = trimmedQuery.length >= 2
  const availableOptions = options.filter(option => !rows.some(row => row.nace_code_id === option.id)).slice(0, 30)

  useEffect(() => {
    let cancelled = false
    if (readOnly || query.trim().length < 2) {
      setOptions([])
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

  const addNace = (option: NaceReferenceRow) => {
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
    setQuery('')
    setOpen(false)
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
        <div className="mb-3">
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className={formControlClass({ rounded: 'md', className: 'pl-9' })}
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onKeyDown={event => {
                if (event.key === 'Enter' && availableOptions.length === 1) {
                  event.preventDefault()
                  addNace(availableOptions[0])
                }
              }}
              placeholder={rows.length >= 5 ? '5 NACE kodu seçildi' : 'NACE kodu veya faaliyet adı ara'}
              disabled={rows.length >= 5}
            />
            {open && rows.length < 5 && (
              <div className="absolute left-0 top-full z-[80] mt-1 max-h-72 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {canSearchNace && availableOptions.length > 0 ? availableOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => addNace(option)}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-950/40"
                  >
                    {naceReferenceLabel(option)}
                  </button>
                )) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {!canSearchNace ? 'Aramak için en az 2 karakter yazın' : loading ? 'Aranıyor...' : warning || 'Sonuç bulunamadı'}
                  </div>
                )}
              </div>
            )}
          </label>
        </div>
      )}

      {(warning || (rows.length > 0 && !primaryRow)) && (
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
    targetFields: ['tax_number', 'tax_office', 'sgk_workplace_registry_no', 'electronic_notification_address'],
    title,
    idleLabel: 'Kaynak bekliyor',
    workingLabel: 'Okunuyor',
    doneLabel: 'OK',
    noDataLabel: 'Veri yok',
  }
}

function getOpeningPreviewRows(form: Record<string, any>) {
  const companyType = companyTypeOptions().find(option => option.value === form.company_type)?.label || form.company_type
  const naceCodes = normalizeWizardNaceSelections(form.nace_codes)
  const primaryNace = naceCodes.find(row => row.is_primary)

  return [
    { label: 'Ticari Ünvan', value: form.trade_name },
    { label: 'Kısa Ünvan', value: form.short_name },
    { label: 'Şirket Türü', value: companyType },
    { label: 'Tescil Tarihi', value: formatWizardDate(form.registration_date) },
    { label: 'Ticaret Sicil Müdürlüğü', value: form.trade_registry_office },
    { label: 'Ticaret Sicil No', value: form.trade_registry_number },
    { label: 'MERSİS No', value: form.mersis_number },
    { label: 'VKN', value: form.tax_number },
    { label: 'Vergi Dairesi', value: form.tax_office },
    { label: 'SGK İşyeri Sicil No', value: form.sgk_workplace_registry_no },
    { label: 'Elektronik Tebligat Adresi', value: form.electronic_notification_address },
    { label: 'Taahhüt Edilen Sermaye', value: formatMoneyValue(form.foundation_capital_amount) },
    { label: 'Pay Sayısı', value: formatPlainNumber(form.foundation_share_units) },
    { label: 'Pay Değeri', value: formatMoneyValue(calculateShareValue(form.foundation_capital_amount, form.foundation_share_units)) },
    { label: 'Birincil NACE', value: primaryNace ? naceLabel(primaryNace) : '' },
    { label: 'NACE Kod Sayısı', value: String(naceCodes.length || '') },
  ]
}

function getOpeningDocumentStatuses(form: Record<string, any>) {
  return COMPANY_LIFECYCLE_PROCESSES.opening.completion.documentWrites.map(write => ({
    field: write.sourceField,
    label: write.label || write.slotTitle,
    required: !!write.required,
    ready: hasOpeningDocumentValue(form[write.sourceField]),
  }))
}

function getOpeningCompletionIssues(form: Record<string, any>) {
  const issues: string[] = []
  const requiredFields = [
    ['trade_name', 'Ticari Ünvan'],
    ['company_type', 'Şirket Türü'],
    ['registration_date', 'Tescil Tarihi'],
    ['trade_registry_office', 'Ticaret Sicil Müdürlüğü'],
    ['trade_registry_number', 'Ticaret Sicil No'],
    ['tax_number', 'VKN'],
    ['tax_office', 'Vergi Dairesi'],
  ]

  requiredFields.forEach(([field, label]) => {
    if (!hasValue(form[field])) issues.push(label)
  })

  if (hasValue(form.tax_number) && !/^\d{10}$/.test(String(form.tax_number))) {
    issues.push('VKN formatı')
  }

  const naceCodes = normalizeWizardNaceSelections(form.nace_codes)
  if (naceCodes.length === 0) issues.push('NACE / Faaliyet Kodları')
  if (naceCodes.length > 0 && !naceCodes.some(row => row.is_primary)) issues.push('Birincil NACE')

  getOpeningDocumentStatuses(form).forEach(document => {
    if (document.required && !document.ready) issues.push(document.label)
  })

  return Array.from(new Set(issues))
}

function hasOpeningDocumentValue(value: any) {
  if (!value) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value !== 'object') return false
  return Boolean(value.storagePath || value.documentId || value.url || value.previewUrl || value.name)
}

function buildOpeningSubmitForm(form: Record<string, any>) {
  const foundationNominalValue = calculateShareValue(form.foundation_capital_amount, form.foundation_share_units)
  const next: Record<string, any> = {
    ...form,
    trade_registry_number: form.trade_registry_number || form.trade_registry_no || '',
    mersis_number: form.mersis_number || form.mersis_no || '',
    tax_number: form.tax_number || form.tax_no || '',
    sgk_workplace_registry_no: form.sgk_workplace_registry_no || form.sgk_workplace_no || '',
    foundation_nominal_value: foundationNominalValue,
  }

  delete next.foundation_share_ratio
  delete next.share_ratio
  delete next.trade_registry_no
  delete next.mersis_no
  delete next.tax_no
  delete next.sgk_workplace_no

  if (hasValue(form.foundation_share_units)) next.share_units = form.foundation_share_units
  else delete next.share_units

  if (hasValue(foundationNominalValue)) next.nominal_value = foundationNominalValue
  else delete next.nominal_value

  return next
}

function CurrencyWizardInput({
  value,
  onChange,
  readOnly,
  className,
}: {
  value: any
  onChange: (value: any) => void
  readOnly: boolean
  className: string
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value || ''}
        onChange={event => onChange(event.target.value)}
        inputMode="decimal"
        step="0.01"
        readOnly={readOnly}
        className={cn(className, 'pr-12')}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        TL
      </span>
    </div>
  )
}

function CalculatedShareValueField({
  className,
  capitalAmount,
  shareUnits,
}: {
  className: string
  capitalAmount: any
  shareUnits: any
}) {
  const formattedValue = formatMoneyValue(calculateShareValue(capitalAmount, shareUnits))

  return (
    <div className={cn(className, 'flex min-h-[42px] items-center')}>
      {formattedValue || '-'}
    </div>
  )
}

function calculateShareValue(capitalAmount: any, shareUnits: any) {
  const capital = parseWizardNumber(capitalAmount)
  const units = parseWizardNumber(shareUnits)

  if (capital === null || units === null || units <= 0) return ''
  return Number((capital / units).toFixed(6))
}

function parseWizardNumber(value: any) {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(String(value).replace(',', '.'))
  return Number.isFinite(numeric) ? numeric : null
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

function formatMoneyValue(value: any) {
  if (!hasValue(value)) return ''
  const numeric = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(numeric)) return String(value)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(numeric)
}

function formatPlainNumber(value: any) {
  if (!hasValue(value)) return ''
  const numeric = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toLocaleString('tr-TR', { maximumFractionDigits: 4 })
}

function formatWizardDate(value: any) {
  if (!hasValue(value)) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('tr-TR')
}

function hasValue(value: any) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object' && value !== null) return Object.values(value).some(hasValue)
  return value !== undefined && value !== null && value !== ''
}

function getCompanyLifecycleStatus(company: Sirket) {
  return company.record_status || company.company_status || (company.is_deleted ? 'deregistered' : 'active')
}
