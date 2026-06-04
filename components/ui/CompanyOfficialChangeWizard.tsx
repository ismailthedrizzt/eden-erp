'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, Landmark, MapPin, X } from 'lucide-react'
import { apiClient } from '@/lib/api/apiClient'
import { DocumentSlotUploader, type DocumentSlot, type SlotDocument } from './DocumentSlotUploader'
import { formControlClass } from './formControlStyles'
import { cn } from '@/lib/utils'

export type CompanyOfficialChangeType = 'title_change' | 'address_change' | 'public_registration_update'

export type OfficialChangePrecheckContext = {
  ok: boolean
  operation_enabled: boolean
  message: string
  reasons?: string[]
  warnings?: string[]
  blocking_reasons?: string[]
  is_company_active?: boolean
  company_status?: string
  record_status?: string
  current: Record<string, any>
  public_tax?: Record<string, any> | null
  public_sgk?: Record<string, any> | null
  public_registry?: Record<string, any> | null
  public_channels?: Record<string, any> | null
}

export type CompanyOfficialChangeSubmitPayload = Record<string, any> & {
  client_request_id: string
  document_files: SlotDocument[]
  document_meta: Record<string, { document_date?: string | null; description?: string | null }>
}

type ChangeRow = {
  field: string
  label: string
  oldValue: unknown
  newValue: unknown
}

const standardSteps = ['Bilgiler', 'Belgeler', 'Ön İzleme/Onay']

const documentSlotsByType: Record<CompanyOfficialChangeType, DocumentSlot[]> = {
  title_change: [
    { id: 'general_assembly_resolution', title: 'Genel Kurul / Ortaklar Kurulu Kararı', required: false },
    { id: 'trade_registry_gazette', title: 'Ticaret Sicil Gazetesi', required: false },
    { id: 'registration_certificate', title: 'Tescil Belgesi', required: false },
    { id: 'signature_circular', title: 'İmza Sirküleri', required: false },
    { id: 'other_documents', title: 'Diğer Belgeler', required: false },
  ],
  address_change: [
    { id: 'address_change_resolution', title: 'Adres Değişikliği Kararı', required: false },
    { id: 'trade_registry_gazette', title: 'Ticaret Sicil Gazetesi', required: false },
    { id: 'lease_deed_usage_document', title: 'Kira Kontratı / Tapu / Kullanım Belgesi', required: false },
    { id: 'tax_office_notification', title: 'Vergi Dairesi Bildirimi', required: false },
    { id: 'sgk_notification', title: 'SGK Bildirimi', required: false },
    { id: 'other_documents', title: 'Diğer Belgeler', required: false },
  ],
  public_registration_update: [
    { id: 'tax_certificate', title: 'Vergi Levhası', required: false },
    { id: 'trade_registry_certificate', title: 'Ticaret Sicil Belgesi', required: false },
    { id: 'mersis_record', title: 'MERSİS Kaydı', required: false },
    { id: 'e_notification_certificate', title: 'E-Tebligat Belgesi', required: false },
    { id: 'gib_taxpayer_certificate', title: 'GİB Mükellefiyet Belgesi', required: false },
    { id: 'sgk_workplace_registration', title: 'SGK İşyeri Tescil Belgesi', required: false },
    { id: 'other_documents', title: 'Diğer Belgeler', required: false },
  ],
}

const fieldLabels: Record<string, string> = {
  trade_name: 'Ticari Unvan',
  short_name: 'Kısa Unvan',
  mersis_number: 'MERSİS No',
  trade_registry_number: 'Ticaret Sicil No',
  country: 'Ülke',
  city: 'İl',
  district: 'İlçe',
  address: 'Açık Adres',
  postal_code: 'Posta Kodu',
  tax_office: 'Vergi Dairesi',
  trade_registry_office: 'Ticaret Sicili Müdürlüğü',
  electronic_notification_address: 'Elektronik Tebligat Adresi',
  e_invoice_taxpayer: 'E-Fatura Mükellefi',
  e_archive_taxpayer: 'E-Arşiv Mükellefi',
  e_waybill_taxpayer: 'E-İrsaliye Mükellefi',
  sgk_workplace_registry_no: 'SGK İşyeri Sicil No',
  sgk_province: 'SGK İl',
  sgk_branch: 'SGK Şube',
}

const publicRegistrationFields = [
  'tax_office',
  'trade_registry_office',
  'trade_registry_number',
  'mersis_number',
  'electronic_notification_address',
  'e_invoice_taxpayer',
  'e_archive_taxpayer',
  'e_waybill_taxpayer',
  'sgk_workplace_registry_no',
  'sgk_province',
  'sgk_branch',
] as const

export function CompanyOfficialChangeWizard({
  type,
  companyName,
  context,
  saving,
  onClose,
  onComplete,
}: {
  type: CompanyOfficialChangeType
  companyName: string
  context: OfficialChangePrecheckContext
  saving: boolean
  onClose: () => void
  onComplete: (type: CompanyOfficialChangeType, payload: CompanyOfficialChangeSubmitPayload) => Promise<void>
}) {
  const steps = standardSteps
  const current = context.current
  const documentSlots = documentSlotsByType[type]
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Record<string, any>>(() => initialDraft(type, current))
  const [documents, setDocuments] = useState<SlotDocument[]>([])
  const [documentMeta, setDocumentMeta] = useState<Record<string, { document_date?: string | null; description?: string | null }>>({})
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [clientRequestId] = useState(() => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    return `company-official-${type}:${randomId}`
  })

  const blockingReasons = context.blocking_reasons || (!context.ok && context.message ? [context.message] : [])
  const warnings = Array.from(new Set([...(context.warnings || []), ...(context.reasons || [])]))
  const changeRows = useMemo(() => buildChangeRows(type, current, draft), [current, draft, type])
  const activeDocumentCount = documents.filter(isActiveDocument).length
  const title = type === 'title_change'
    ? 'Unvan Değişikliği'
    : type === 'address_change'
      ? 'Adres Değişikliği'
      : 'Kamu / Tescil Bilgisi Güncelleme'

  const setField = (field: string, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validateStep = (targetStep = step) => {
    if (targetStep >= 0 && (!context.ok || blockingReasons.length)) {
      return blockingReasons[0] || 'Bu işlem şirketin mevcut durumunda başlatılamaz.'
    }

    if (type === 'title_change') {
      if (targetStep >= 0) {
        if (!trimmed(draft.new_trade_name)) return 'Yeni ticari unvan boş olamaz.'
        if (sameText(draft.new_trade_name, current.trade_name)) return 'Yeni ticari unvan mevcut ticari unvanla aynı olamaz.'
      }
      if (targetStep >= 0) {
        if (draft.registration_date && draft.decision_date && new Date(draft.registration_date) < new Date(draft.decision_date)) return 'Tescil tarihi karar tarihinden önce olamaz.'
        if (draft.mersis_changed && !trimmed(draft.new_mersis_number)) return 'MERSİS değiştiyse yeni MERSİS numarası girilmelidir.'
      }
    }

    if (type === 'address_change') {
      if (targetStep >= 0) {
        if (!trimmed(draft.new_address)) return 'Yeni açık adres boş olamaz.'
        if (!trimmed(draft.new_city)) return 'Yeni il boş olamaz.'
        if (!trimmed(draft.new_district)) return 'Yeni ilçe boş olamaz.'
        if (!changeRows.length) return 'Yeni adres mevcut adresle aynı olamaz.'
      }
      if (targetStep >= 0 && draft.registration_date && draft.decision_date && new Date(draft.registration_date) < new Date(draft.decision_date)) {
        return 'Tescil tarihi karar tarihinden önce olamaz.'
      }
    }

    if (type === 'public_registration_update' && targetStep >= 0 && !changeRows.length) {
      return 'Kamu / tescil güncellemesi için en az bir alan değişmelidir.'
    }

    return null
  }

  const nextStep = () => {
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const complete = async () => {
    const validationError = validateStep(steps.length - 1)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setFieldErrors({})
    try {
      await onComplete(type, {
        ...submitPayload(type, draft),
        client_request_id: clientRequestId,
        document_files: documents,
        document_meta: documentMeta,
      })
    } catch (caught: any) {
      const serverFieldErrors = caught?.details?.details?.fieldErrors || caught?.details?.fieldErrors || {}
      setFieldErrors(serverFieldErrors)
      setError(caught?.message || 'İşlem tamamlanamadı.')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{companyName}</p>
          </div>
          <button type="button" aria-label={`${title} penceresini kapat`} onClick={onClose} disabled={saving} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900">
            <X size={18} />
          </button>
        </div>

        <StepNav steps={steps} step={step} setStep={setStep} />

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {step === 0 && <PrecheckStep context={context} warnings={warnings} blockingReasons={blockingReasons} />}

          {type === 'title_change' && step === 0 && (
            <ReadonlyGrid title="Mevcut unvan bilgileri" fields={[
              ['Ticari Unvan', current.trade_name],
              ['Kısa Unvan', current.short_name],
              ['MERSİS No', current.mersis_number],
              ['Ticaret Sicil No', current.trade_registry_number],
            ]} />
          )}

          {type === 'title_change' && step === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Yeni Ticari Unvan" value={draft.new_trade_name} onChange={value => setField('new_trade_name', value)} error={fieldErrors.new_trade_name} required />
              <TextField label="Yeni Kısa Unvan" value={draft.new_short_name} onChange={value => setField('new_short_name', value)} error={fieldErrors.new_short_name} />
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={!!draft.mersis_changed} onChange={event => setField('mersis_changed', event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                MERSİS numarası değişti
              </label>
              <TextField label="Yeni MERSİS No" value={draft.new_mersis_number} onChange={value => setField('new_mersis_number', value)} error={fieldErrors.new_mersis_number} disabled={!draft.mersis_changed} />
              <TextField label="Yeni Ticaret Sicil No" value={draft.new_trade_registry_number} onChange={value => setField('new_trade_registry_number', value)} />
            </div>
          )}

          {type === 'address_change' && step === 0 && (
            <ReadonlyGrid title="Mevcut adres" fields={[
              ['Ülke', current.country],
              ['İl', current.city],
              ['İlçe', current.district],
              ['Posta Kodu', current.postal_code],
              ['Açık Adres', current.address],
            ]} />
          )}

          {type === 'address_change' && step === 0 && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="Yeni Ülke" value={draft.new_country} onChange={value => setField('new_country', value)} required />
                <ReferenceField label="Yeni İl" value={draft.new_city} onChange={value => {
                  setField('new_city', value)
                  setField('new_district', '')
                }} endpoint="/api/reference/turkey-locations" error={fieldErrors.new_city} required />
                <ReferenceField label="Yeni İlçe" value={draft.new_district} onChange={value => setField('new_district', value)} endpoint="/api/reference/turkey-locations" province={draft.new_city || ''} disabled={!draft.new_city} error={fieldErrors.new_district} required />
                <TextField label="Yeni Mahalle / Semt" value={draft.new_neighborhood} onChange={value => setField('new_neighborhood', value)} />
                <TextField label="Posta Kodu" value={draft.postal_code} onChange={value => setField('postal_code', value)} />
                <SelectField
                  label="Adres Değişikliği Türü"
                  value={draft.address_change_type}
                  onChange={value => setField('address_change_type', value)}
                  options={[
                    ['headquarters', 'Merkez adres değişikliği'],
                    ['branch_facility', 'Şube / tesis adres değişikliği'],
                    ['correspondence', 'Yazışma adresi değişikliği'],
                  ]}
                />
              </div>
              <TextareaField label="Yeni Açık Adres" value={draft.new_address} onChange={value => setField('new_address', value)} error={fieldErrors.new_address} required />
            </div>
          )}

          {type !== 'public_registration_update' && isDecisionStep(type, step) && (
            <DecisionStep draft={draft} setField={setField} fieldErrors={fieldErrors} />
          )}

          {type === 'public_registration_update' && step === 0 && (
            <ReadonlyGrid title="Mevcut kamu / tescil bilgileri" fields={[
              ['Vergi Dairesi', current.tax_office],
              ['Ticaret Sicili Müdürlüğü', current.trade_registry_office],
              ['Ticaret Sicil No', current.trade_registry_number],
              ['MERSİS No', current.mersis_number],
              ['Elektronik Tebligat Adresi', current.electronic_notification_address],
              ['E-Fatura', formatValue(current.e_invoice_taxpayer)],
              ['E-Arşiv', formatValue(current.e_archive_taxpayer)],
              ['E-İrsaliye', formatValue(current.e_waybill_taxpayer)],
              ['SGK İşyeri Sicil No', current.sgk_workplace_registry_no],
              ['SGK İl', current.sgk_province],
              ['SGK Şube', current.sgk_branch],
              ['NACE Kodları', Array.isArray(current.nace_codes) ? `${current.nace_codes.length} kayıt` : '-'],
            ]} />
          )}

          {type === 'public_registration_update' && step === 0 && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <ReferenceField label="Vergi Dairesi" value={draft.tax_office} onChange={value => setField('tax_office', value)} endpoint="/api/reference/tax-offices" error={fieldErrors.tax_office} />
                <ReferenceField label="Ticaret Sicili Müdürlüğü" value={draft.trade_registry_office} onChange={value => setField('trade_registry_office', value)} endpoint="/api/reference/trade-registry-offices" />
                <TextField label="Ticaret Sicil No" value={draft.trade_registry_number} onChange={value => setField('trade_registry_number', value)} />
                <TextField label="MERSİS No" value={draft.mersis_number} onChange={value => setField('mersis_number', value)} />
                <TextField label="Elektronik Tebligat Adresi" value={draft.electronic_notification_address} onChange={value => setField('electronic_notification_address', value)} />
                <TextField label="SGK İşyeri Sicil No" value={draft.sgk_workplace_registry_no} onChange={value => setField('sgk_workplace_registry_no', value)} />
                <ReferenceField label="SGK İl" value={draft.sgk_province} onChange={value => setField('sgk_province', value)} endpoint="/api/reference/turkey-locations" />
                <TextField label="SGK Şube" value={draft.sgk_branch} onChange={value => setField('sgk_branch', value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <CheckboxField label="E-Fatura Mükellefi" checked={!!draft.e_invoice_taxpayer} onChange={value => setField('e_invoice_taxpayer', value)} />
                <CheckboxField label="E-Arşiv Mükellefi" checked={!!draft.e_archive_taxpayer} onChange={value => setField('e_archive_taxpayer', value)} />
                <CheckboxField label="E-İrsaliye Mükellefi" checked={!!draft.e_waybill_taxpayer} onChange={value => setField('e_waybill_taxpayer', value)} />
              </div>
              <TextareaField label="Açıklama / Not" value={draft.notes} onChange={value => setField('notes', value)} />
            </div>
          )}

          {isDocumentsStep(type, step) && (
            <DocumentsStep
              slots={documentSlots}
              documents={documents}
              setDocuments={setDocuments}
              documentMeta={documentMeta}
              setDocumentMeta={setDocumentMeta}
            />
          )}

          {isSummaryStep(type, step, steps.length) && (
            <SummaryStep
              changeRows={changeRows}
              documents={documents}
              documentSlots={documentSlots}
              activeDocumentCount={activeDocumentCount}
              draft={draft}
              type={type}
            />
          )}
        </div>

        {error && (
          <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Değişen alan: <span className="font-semibold text-gray-900 dark:text-white">{changeRows.length}</span>
            <span className="mx-2">-</span>
            Belge: <span className="font-semibold text-gray-900 dark:text-white">{activeDocumentCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
              Vazgeç
            </button>
            {step > 0 && (
              <button type="button" onClick={() => setStep(prev => Math.max(0, prev - 1))} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
                Geri
              </button>
            )}
            {step < steps.length - 1 ? (
              <button type="button" onClick={nextStep} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                Devam
              </button>
            ) : (
              <button type="button" disabled={saving} onClick={complete} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
                Tamamla
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepNav({ steps, step, setStep }: { steps: string[]; step: number; setStep: (step: number) => void }) {
  return (
    <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => index <= step && setStep(index)}
            className={cn(
              'flex min-h-[48px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium',
              index === step
                ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
                : index < step
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : 'border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400'
            )}
          >
            <span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs shadow-sm dark:bg-gray-900">{index + 1}</span>
            <span className="min-w-0">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PrecheckStep({
  context,
  warnings,
  blockingReasons,
}: {
  context: OfficialChangePrecheckContext
  warnings: string[]
  blockingReasons: string[]
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Şirket Durumu" value={context.is_company_active ? 'Aktif' : (context.company_status || context.record_status || 'Kontrol edilemedi')} />
        <Metric label="İşlem Durumu" value={context.operation_enabled ? 'Başlatılabilir' : 'Kapalı'} />
        <Metric label="Ön Kontrol" value={context.ok ? 'Tamamlandı' : 'Engelli'} />
      </div>

      {blockingReasons.length ? (
        <MessageList title="İşlem başlatılamaz" tone="red" messages={blockingReasons} />
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          Ön kontrol tamamlandı. Bu değişiklik şirket kartı normal form editinden ayrılarak resmi işlem kaydıyla tamamlanacak.
        </div>
      )}

      {warnings.length ? <MessageList title="Uyarılar" tone="amber" messages={warnings} /> : null}
    </div>
  )
}

function DecisionStep({
  draft,
  setField,
  fieldErrors,
}: {
  draft: Record<string, any>
  setField: (field: string, value: any) => void
  fieldErrors: Record<string, string>
}) {
  const gazetteWarning = draft.trade_registry_gazette_date
    && draft.decision_date
    && new Date(draft.trade_registry_gazette_date) < new Date(draft.decision_date)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <DateField label="Karar Tarihi" value={draft.decision_date} onChange={value => setField('decision_date', value)} />
        <DateField label="Tescil Tarihi" value={draft.registration_date} onChange={value => setField('registration_date', value)} error={fieldErrors.registration_date} />
        <DateField label="Ticaret Sicil Gazetesi Tarihi" value={draft.trade_registry_gazette_date} onChange={value => setField('trade_registry_gazette_date', value)} />
        <TextField label="Ticaret Sicil Gazetesi Sayısı" value={draft.trade_registry_gazette_number} onChange={value => setField('trade_registry_gazette_number', value)} />
      </div>
      {gazetteWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Ticaret sicil gazetesi tarihi karar tarihinden önce görünüyor. Bu durum engel değil, belge tarihini kontrol edin.
        </div>
      ) : null}
      <TextareaField label="Açıklama / Not" value={draft.notes} onChange={value => setField('notes', value)} />
    </div>
  )
}

function DocumentsStep({
  slots,
  documents,
  setDocuments,
  documentMeta,
  setDocumentMeta,
}: {
  slots: DocumentSlot[]
  documents: SlotDocument[]
  setDocuments: (documents: SlotDocument[]) => void
  documentMeta: Record<string, { document_date?: string | null; description?: string | null }>
  setDocumentMeta: (meta: Record<string, { document_date?: string | null; description?: string | null }>) => void
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <DocumentSlotUploader
        slots={slots}
        documents={documents}
        onChange={setDocuments}
        allowExtraSlots
        mode="update"
        defaultTab="upload"
      />
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          En az bir belge önerilir. Zorunluluk daha sonra işlem konfigürasyonundan sıkılaştırılabilir.
        </div>
        {slots.map(slot => (
          <div key={slot.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <FileText size={15} />
              {slot.title}
            </div>
            <label className="mt-2 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Belge Tarihi
              <input
                type="date"
                value={documentMeta[slot.id]?.document_date || ''}
                onChange={event => setDocumentMeta({ ...documentMeta, [slot.id]: { ...documentMeta[slot.id], document_date: event.target.value } })}
                className={formControlClass({ size: 'sm', className: 'mt-1' })}
              />
            </label>
            <label className="mt-2 block text-xs font-medium text-gray-600 dark:text-gray-300">
              Açıklama
              <input
                value={documentMeta[slot.id]?.description || ''}
                onChange={event => setDocumentMeta({ ...documentMeta, [slot.id]: { ...documentMeta[slot.id], description: event.target.value } })}
                className={formControlClass({ size: 'sm', className: 'mt-1' })}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryStep({
  changeRows,
  documents,
  documentSlots,
  activeDocumentCount,
  draft,
  type,
}: {
  changeRows: ChangeRow[]
  documents: SlotDocument[]
  documentSlots: DocumentSlot[]
  activeDocumentCount: number
  draft: Record<string, any>
  type: CompanyOfficialChangeType
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Değişen Alan" value={String(changeRows.length)} />
        <Metric label="Belge" value={String(activeDocumentCount)} />
        <Metric label="İşlem Türü" value={type === 'title_change' ? 'Unvan' : type === 'address_change' ? 'Adres' : 'Kamu / Tescil'} />
      </div>

      {!activeDocumentCount ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Belge yüklenmedi. İşlem kaydı yine oluşturulabilir; belge zorunluluğu şu an öneri seviyesindedir.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2">Alan</th>
              <th className="px-3 py-2">Eski Değer</th>
              <th className="px-3 py-2">Yeni Değer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {changeRows.map(row => (
              <tr key={row.field}>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.label}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatValue(row.oldValue)}</td>
                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{formatValue(row.newValue)}</td>
              </tr>
            ))}
            {!changeRows.length && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">Değişen alan bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <CheckCircle2 size={16} />
          Belgeler
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {documentSlots.map(slot => {
            const doc = documents.find(item => item.slotId === slot.id && isActiveDocument(item))
            return (
              <div key={slot.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900">
                <span className="font-medium text-gray-900 dark:text-white">{slot.title}</span>
                <span className="ml-2 text-gray-500 dark:text-gray-400">{doc?.name || '-'}</span>
              </div>
            )
          })}
        </div>
      </div>

      {draft.notes ? <Metric label="Açıklama / Not" value={draft.notes} /> : null}
    </div>
  )
}

function ReadonlyGrid({ title, fields }: { title: string; fields: Array<[string, unknown]> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <Landmark size={16} />
        {title}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map(([label, value]) => <Metric key={label} label={label} value={formatValue(value)} />)}
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  error,
  required,
  disabled,
}: {
  label: string
  value: any
  onChange: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}{required ? <span className="text-red-500"> *</span> : null}
      <input value={value || ''} disabled={disabled} onChange={event => onChange(event.target.value)} className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'mt-1' })} />
      {error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}
    </label>
  )
}

function DateField({ label, value, onChange, error }: { label: string; value: any; onChange: (value: string) => void; error?: string }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}
      <input type="date" value={value || ''} onChange={event => onChange(event.target.value)} className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'mt-1' })} />
      {error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}
    </label>
  )
}

function TextareaField({ label, value, onChange, error, required }: { label: string; value: any; onChange: (value: string) => void; error?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}{required ? <span className="text-red-500"> *</span> : null}
      <textarea value={value || ''} onChange={event => onChange(event.target.value)} rows={3} className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'mt-1' })} />
      {error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}
    </label>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}
      <select value={value || ''} onChange={event => onChange(event.target.value)} className={formControlClass({ className: 'mt-1' })}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-200">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
      {label}
    </label>
  )
}

function ReferenceField({
  label,
  value,
  onChange,
  endpoint,
  province,
  error,
  required,
  disabled,
}: {
  label: string
  value: any
  onChange: (value: string) => void
  endpoint: string
  province?: string
  error?: string
  required?: boolean
  disabled?: boolean
}) {
  const [text, setText] = useState(String(value || ''))
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    setText(String(value || ''))
  }, [value])

  useEffect(() => {
    let cancelled = false
    const q = text.trim()
    if (disabled || (!q && !province)) {
      setOptions([])
      return
    }
    if (q.length < 2 && !province) {
      setOptions([])
      return
    }

    const timer = window.setTimeout(() => {
      apiClient.get<any>(endpoint, {
        skipAuth: true,
        useCache: false,
        query: { q, limit: 20, ...(province ? { province } : {}) },
      }).then(result => {
        if (cancelled) return
        const nextOptions = normalizeReferenceOptions(result)
        setOptions(nextOptions)
      }).catch(() => {
        if (!cancelled) setOptions([])
      })
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [disabled, endpoint, province, text])

  return (
    <label className="relative block text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}{required ? <span className="text-red-500"> *</span> : null}
      <div className="relative mt-1">
        <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={text}
          disabled={disabled}
          onChange={event => {
            setText(event.target.value)
            onChange(event.target.value)
          }}
          className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'pl-9' })}
        />
      </div>
      {error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}
      {options.length ? (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-950">
          {options.map(option => (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                setText(option.value)
                onChange(option.value)
                setOptions([])
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">{value || '-'}</div>
    </div>
  )
}

function MessageList({ title, messages, tone }: { title: string; messages: string[]; tone: 'red' | 'amber' }) {
  const className = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'

  return (
    <div className={`rounded-lg border p-4 text-sm ${className}`}>
      <div className="font-semibold">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {messages.map(message => <li key={message}>{message}</li>)}
      </ul>
    </div>
  )
}

function initialDraft(type: CompanyOfficialChangeType, current: Record<string, any>) {
  if (type === 'title_change') {
    return {
      new_trade_name: current.trade_name || '',
      new_short_name: current.short_name || '',
      mersis_changed: false,
      new_mersis_number: current.mersis_number || '',
      new_trade_registry_number: current.trade_registry_number || '',
      decision_date: '',
      registration_date: '',
      trade_registry_gazette_date: '',
      trade_registry_gazette_number: '',
      notes: '',
    }
  }

  if (type === 'address_change') {
    return {
      new_country: current.country || 'Türkiye',
      new_city: current.city || '',
      new_district: current.district || '',
      new_neighborhood: '',
      new_address: current.address || '',
      postal_code: current.postal_code || '',
      address_change_type: 'headquarters',
      decision_date: '',
      registration_date: '',
      trade_registry_gazette_date: '',
      trade_registry_gazette_number: '',
      notes: '',
    }
  }

  return {
    tax_office: current.tax_office || '',
    trade_registry_office: current.trade_registry_office || '',
    trade_registry_number: current.trade_registry_number || '',
    mersis_number: current.mersis_number || '',
    electronic_notification_address: current.electronic_notification_address || '',
    e_invoice_taxpayer: !!current.e_invoice_taxpayer,
    e_archive_taxpayer: !!current.e_archive_taxpayer,
    e_waybill_taxpayer: !!current.e_waybill_taxpayer,
    sgk_workplace_registry_no: current.sgk_workplace_registry_no || '',
    sgk_province: current.sgk_province || '',
    sgk_branch: current.sgk_branch || '',
    notes: '',
  }
}

function buildChangeRows(type: CompanyOfficialChangeType, current: Record<string, any>, draft: Record<string, any>): ChangeRow[] {
  if (type === 'title_change') {
    const pairs: Array<[string, unknown]> = [
      ['trade_name', draft.new_trade_name],
      ['short_name', draft.new_short_name],
      ...(draft.mersis_changed ? [['mersis_number', draft.new_mersis_number] as [string, unknown]] : []),
      ...(trimmed(draft.new_trade_registry_number) ? [['trade_registry_number', draft.new_trade_registry_number] as [string, unknown]] : []),
    ]
    return rowsFromPairs(current, pairs)
  }

  if (type === 'address_change') {
    return rowsFromPairs(current, [
      ['country', draft.new_country],
      ['city', draft.new_city],
      ['district', draft.new_district],
      ['address', draft.new_address],
      ['postal_code', draft.postal_code],
    ])
  }

  return rowsFromPairs(current, publicRegistrationFields.map(field => [field, draft[field]] as [string, unknown]))
}

function rowsFromPairs(current: Record<string, any>, pairs: Array<[string, unknown]>) {
  return pairs
    .filter(([field, nextValue]) => !sameComparable(nextValue, current[field]))
    .map(([field, nextValue]) => ({
      field,
      label: fieldLabels[field] || field,
      oldValue: current[field],
      newValue: nextValue,
    }))
}

function submitPayload(type: CompanyOfficialChangeType, draft: Record<string, any>) {
  if (type === 'title_change') {
    return {
      new_trade_name: draft.new_trade_name,
      new_short_name: draft.new_short_name,
      mersis_changed: !!draft.mersis_changed,
      new_mersis_number: draft.new_mersis_number,
      new_trade_registry_number: draft.new_trade_registry_number,
      decision_date: draft.decision_date || null,
      registration_date: draft.registration_date || null,
      trade_registry_gazette_date: draft.trade_registry_gazette_date || null,
      trade_registry_gazette_number: draft.trade_registry_gazette_number || null,
      notes: draft.notes || null,
    }
  }

  if (type === 'address_change') {
    return {
      new_country: draft.new_country,
      new_city: draft.new_city,
      new_district: draft.new_district,
      new_neighborhood: draft.new_neighborhood,
      new_address: draft.new_address,
      postal_code: draft.postal_code,
      address_change_type: draft.address_change_type,
      decision_date: draft.decision_date || null,
      registration_date: draft.registration_date || null,
      trade_registry_gazette_date: draft.trade_registry_gazette_date || null,
      trade_registry_gazette_number: draft.trade_registry_gazette_number || null,
      notes: draft.notes || null,
    }
  }

  return Object.fromEntries([
    ...publicRegistrationFields.map(field => [field, draft[field]]),
    ['notes', draft.notes || null],
  ])
}

function isDecisionStep(type: CompanyOfficialChangeType, step: number) {
  return (type === 'title_change' || type === 'address_change') && step === 0
}

function isDocumentsStep(_type: CompanyOfficialChangeType, step: number) {
  return step === 1
}

function isSummaryStep(_type: CompanyOfficialChangeType, step: number, _stepCount: number) {
  return step === 2
}

function normalizeReferenceOptions(result: any): Array<{ value: string; label: string }> {
  if (Array.isArray(result?.options)) return result.options
  if (result?.categories && typeof result.categories === 'object') {
    return Object.values(result.categories).flat().filter(Boolean) as Array<{ value: string; label: string }>
  }
  return []
}

function isActiveDocument(document: SlotDocument) {
  return document.status !== 'deleted' && document.status !== 'archived' && Boolean(document.storagePath || document.documentId || document.url || document.previewUrl)
}

function sameText(left: unknown, right: unknown) {
  return trimmed(left).toLocaleLowerCase('tr-TR') === trimmed(right).toLocaleLowerCase('tr-TR')
}

function sameComparable(left: unknown, right: unknown) {
  const normalizedLeft = typeof left === 'boolean' ? left : trimmed(left)
  const normalizedRight = typeof right === 'boolean' ? right : trimmed(right)
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight)
}

function trimmed(value: unknown) {
  return String(value ?? '').trim()
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'
  if (typeof value === 'number') return value.toLocaleString('tr-TR')
  if (Array.isArray(value)) return `${value.length} kayıt`
  return String(value)
}
