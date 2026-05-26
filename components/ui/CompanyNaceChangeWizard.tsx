'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, FileText, Search, X } from 'lucide-react'
import { apiClient } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'
import { DocumentSlotUploader, type DocumentSlot, type SlotDocument } from './DocumentSlotUploader'
import { formControlClass } from './formControlStyles'

export type CompanyNacePrecheckContext = {
  ok: boolean
  operation_enabled: boolean
  message: string
  reasons?: string[]
  warnings?: string[]
  blocking_reasons?: string[]
  current: Record<string, any>
  public_tax?: Record<string, any> | null
  public_sgk?: Record<string, any> | null
  public_registry?: Record<string, any> | null
  nace_codes?: NaceWizardRow[]
  primary_nace?: NaceWizardRow | null
  secondary_nace_codes?: NaceWizardRow[]
  activity_subject?: string | null
}

export type NaceWizardRow = {
  id?: string | null
  nace_code_id?: string | null
  nace_code?: string | Record<string, any> | null
  description?: string | null
  hazard_class?: string | null
  is_primary?: boolean | null
  notes?: string | null
}

export type CompanyNaceChangeSubmitPayload = Record<string, any> & {
  client_request_id: string
  document_files: SlotDocument[]
  document_meta: Record<string, { document_date?: string | null; description?: string | null }>
}

const steps = ['Ön Kontrol', 'Faaliyet Konusu Etkisi', 'Mevcut NACE Bilgileri', 'Yeni NACE Bilgileri', 'Vergi / SGK Etkileri', 'Belgeler', 'Özet ve Onay']

const documentSlots: DocumentSlot[] = [
  { id: 'tax_certificate', title: 'Vergi Levhası', required: false },
  { id: 'activity_certificate', title: 'Faaliyet Belgesi', required: false },
  { id: 'sgk_hazard_document', title: 'SGK Tehlike Sınıfı / İşyeri Bilgisi Belgesi', required: false },
  { id: 'chamber_registration', title: 'Meslek Odası / Oda Kayıt Belgesi', required: false },
  { id: 'other_documents', title: 'Diğer Belgeler', required: false },
]

export function CompanyNaceChangeWizard({
  companyName,
  context,
  saving,
  onClose,
  onComplete,
  onRedirectToActivitySubject,
}: {
  companyName: string
  context: CompanyNacePrecheckContext
  saving: boolean
  onClose: () => void
  onComplete: (payload: CompanyNaceChangeSubmitPayload) => Promise<void>
  onRedirectToActivitySubject?: (candidateRows?: NaceWizardRow[]) => void
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({
    activity_subject_changes: false,
    nace_codes: normalizeInitialNaceRows(context.nace_codes || []),
    change_reason: '',
    effective_date: new Date().toISOString().slice(0, 10),
    tax_activity_code_impact: '',
    sgk_hazard_class_impact: '',
    sgk_work_line_impact: '',
    notes: '',
  })
  const [documents, setDocuments] = useState<SlotDocument[]>([])
  const [documentMeta, setDocumentMeta] = useState<Record<string, { document_date?: string | null; description?: string | null }>>({})
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [clientRequestId] = useState(() => `company-nace-change:${randomId()}`)
  const blockingReasons = context.blocking_reasons || (!context.ok && context.message ? [context.message] : [])
  const warnings = Array.from(new Set([...(context.warnings || []), ...(context.reasons || [])]))
  const changeRows = useMemo(() => buildNaceChangeRows(context.nace_codes || [], draft.nace_codes), [context.nace_codes, draft.nace_codes])
  const activeDocumentCount = documents.filter(isActiveDocument).length

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
    if (targetStep >= 0 && (!context.ok || blockingReasons.length)) return blockingReasons[0] || 'Bu işlem şirketin mevcut durumunda başlatılamaz.'
    if (targetStep >= 1 && draft.activity_subject_changes) return 'Bu değişiklik faaliyet konusu / esas sözleşme alanını etkiliyorsa Faaliyet Konusu Değişikliği wizardı kullanılmalıdır.'
    if (targetStep >= 3) {
      const selectionError = validateNaceRows(draft.nace_codes)
      if (selectionError) return selectionError
      if (changeRows.length === 0) return 'NACE / faaliyet kodu güncellemesi için en az bir kod değişmelidir.'
    }
    if (targetStep >= 4 && !draft.effective_date) return 'Yürürlük tarihi boş olamaz.'
    return null
  }

  const nextStep = () => {
    if (step === 1 && draft.activity_subject_changes) {
      onRedirectToActivitySubject?.(draft.nace_codes)
      return
    }

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
      await onComplete({
        activity_subject_changes: false,
        nace_codes: toSubmitNaceRows(draft.nace_codes),
        change_reason: draft.change_reason || null,
        effective_date: draft.effective_date,
        tax_activity_code_impact: draft.tax_activity_code_impact || null,
        sgk_hazard_class_impact: draft.sgk_hazard_class_impact || null,
        sgk_work_line_impact: draft.sgk_work_line_impact || null,
        notes: draft.notes || null,
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
    <WizardShell title="NACE / Faaliyet Kodu Güncelleme" companyName={companyName} steps={steps} step={step} setStep={setStep} saving={saving} onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
        {step === 0 && <PrecheckStep context={context} warnings={warnings} blockingReasons={blockingReasons} />}
        {step === 1 && (
          <div className="space-y-4">
            <SectionTitle title="Faaliyet konusu etkisi" description="NACE değişikliği yalnızca idari/kamu faaliyet kodu düzeltmesi ise bu wizard devam eder." />
            <div className="grid gap-3 md:grid-cols-2">
              <ChoiceButton selected={!draft.activity_subject_changes} title="Sadece faaliyet kodu / kamu kaydı güncellenecek" onClick={() => setField('activity_subject_changes', false)} />
              <ChoiceButton selected={draft.activity_subject_changes} title="Şirketin faaliyet konusu / esas sözleşme alanı değişecek" onClick={() => setField('activity_subject_changes', true)} />
            </div>
            {draft.activity_subject_changes && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Bu durumda NACE güncelleme işlemi devam etmez. Devam düğmesi Faaliyet Konusu Değişikliği wizardını açar.
              </div>
            )}
          </div>
        )}
        {step === 2 && (
          <ReadonlyGrid title="Mevcut NACE bilgileri" fields={[
            ['Birincil NACE', formatNaceRow((context.nace_codes || []).find(row => row.is_primary))],
            ['İkincil NACE sayısı', String((context.nace_codes || []).filter(row => !row.is_primary).length)],
            ['SGK tehlike sınıfı', context.public_sgk?.risk_class || context.current?.risk_class],
            ['Vergi dairesi', context.public_tax?.tax_office || context.current?.tax_office],
            ['Faaliyet konusu özeti', context.activity_subject || context.current?.activity_subject],
          ]} />
        )}
        {step === 3 && (
          <NaceSelectionEditor
            rows={draft.nace_codes}
            onChange={rows => setField('nace_codes', rows)}
            error={fieldErrors.nace_codes}
          />
        )}
        {step === 4 && (
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Değişiklik Nedeni" value={draft.change_reason} onChange={value => setField('change_reason', value)} />
            <TextField label="Yürürlük Tarihi" type="date" value={draft.effective_date} onChange={value => setField('effective_date', value)} error={fieldErrors.effective_date} required />
            <TextareaField label="Vergi Dairesi Faaliyet Kodu Etkisi" value={draft.tax_activity_code_impact} onChange={value => setField('tax_activity_code_impact', value)} />
            <TextareaField label="SGK Tehlike Sınıfı Etkisi" value={draft.sgk_hazard_class_impact} onChange={value => setField('sgk_hazard_class_impact', value)} />
            <TextareaField label="SGK İş Kolu / Risk Sınıfı Etkisi" value={draft.sgk_work_line_impact} onChange={value => setField('sgk_work_line_impact', value)} />
            <TextareaField label="Açıklama / Not" value={draft.notes} onChange={value => setField('notes', value)} />
          </div>
        )}
        {step === 5 && (
          <DocumentsStep
            slots={documentSlots}
            documents={documents}
            setDocuments={setDocuments}
            documentMeta={documentMeta}
            setDocumentMeta={setDocumentMeta}
          />
        )}
        {step === 6 && (
          <div className="space-y-5">
            <ReadonlyGrid title="Değişiklik özeti" fields={changeRows.length ? changeRows.map(row => [row.label, `${row.oldValue || '-'} -> ${row.newValue || '-'}`]) : [['Değişiklik', 'Henüz değişiklik yok']]} />
            <ReadonlyGrid title="İşlem bilgileri" fields={[
              ['Yürürlük Tarihi', draft.effective_date],
              ['Belge Sayısı', String(activeDocumentCount)],
              ['Değişiklik Nedeni', draft.change_reason],
            ]} />
          </div>
        )}
      </div>
      {error && <WizardError message={error} />}
      <WizardFooter step={step} steps={steps} saving={saving} onClose={onClose} onBack={() => setStep(prev => Math.max(0, prev - 1))} onNext={nextStep} onComplete={complete} nextLabel={step === 1 && draft.activity_subject_changes ? 'Faaliyet Konusu Wizardına Geç' : 'Devam'} />
    </WizardShell>
  )
}

export function NaceSelectionEditor({
  rows,
  onChange,
  error,
}: {
  rows: NaceWizardRow[]
  onChange: (rows: NaceWizardRow[]) => void
  error?: string
}) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<NaceWizardRow[]>([])
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setOptions([])
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      apiClient.get<{ data: any[]; warning?: string }>('/api/reference/nace-codes', {
        skipAuth: true,
        useCache: true,
        query: { q: trimmed },
      }).then(result => {
        if (cancelled) return
        setOptions((result.data || []).map(row => ({
          id: row.id,
          nace_code_id: row.id,
          nace_code: row.nace_code,
          description: row.description,
          hazard_class: row.hazard_class,
        })))
        setWarning(result.warning || null)
      }).catch(error => {
        if (!cancelled) setWarning(error?.message || 'NACE kodları alınamadı.')
      }).finally(() => {
        if (!cancelled) setLoading(false)
      })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const addRow = (row: NaceWizardRow) => {
    if (rows.length >= 5) {
      setWarning('Bir şirket için en fazla 5 aktif NACE kodu seçilebilir.')
      return
    }
    if (rows.some(item => getNaceKey(item) === getNaceKey(row))) {
      setWarning('Bu NACE kodu zaten seçildi.')
      return
    }
    onChange([...rows, { ...row, is_primary: rows.length === 0 }])
    setQuery('')
    setOptions([])
    setWarning(null)
  }

  const setPrimary = (row: NaceWizardRow) => {
    const key = getNaceKey(row)
    onChange(rows.map(item => ({ ...item, is_primary: getNaceKey(item) === key })))
  }

  const removeRow = (row: NaceWizardRow) => {
    const key = getNaceKey(row)
    const next = rows.filter(item => getNaceKey(item) !== key)
    if (row.is_primary && next.length) next[0] = { ...next[0], is_primary: true }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Yeni NACE bilgileri" description="Birincil kod tek olmalıdır; ikincil kodlarda tekrar eden kayıt seçilemez." />
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-3 text-gray-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={rows.length >= 5 ? '5 NACE kodu seçildi' : 'NACE kodu veya faaliyet adı ara'} disabled={rows.length >= 5} className={cn(formControlClass, 'pl-9')} />
      </div>
      {query.trim().length >= 2 && (
        <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
          {loading && <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">NACE kodları aranıyor...</div>}
          {!loading && options.length === 0 && <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">NACE kodu bulunamadı.</div>}
          {!loading && options.map(option => (
            <button key={getNaceKey(option)} type="button" onClick={() => addRow(option)} className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">
              <span className="font-semibold text-gray-900 dark:text-white">{formatNaceCode(option)}</span>
              <span className="ml-2 text-gray-600 dark:text-gray-300">{formatNaceDescription(option)}</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{formatHazardClass(formatNaceHazard(option))}</span>
            </button>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2">Tür</th>
              <th className="px-3 py-2">NACE Kodu</th>
              <th className="px-3 py-2">Faaliyet</th>
              <th className="px-3 py-2">Tehlike Sınıfı</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">NACE kodu seçilmedi.</td>
              </tr>
            )}
            {rows.map(row => (
              <tr key={getNaceKey(row)}>
                <td className="px-3 py-2">
                  {row.is_primary ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Birincil</span> : <button type="button" onClick={() => setPrimary(row)} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-300">Birincil yap</button>}
                </td>
                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{formatNaceCode(row)}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatNaceDescription(row)}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatHazardClass(formatNaceHazard(row)) || '-'}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => removeRow(row)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Kaldır</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(warning || error) && <div className="text-sm text-amber-700 dark:text-amber-200">{error || warning}</div>}
    </div>
  )
}

export function WizardShell({
  title,
  companyName,
  steps,
  step,
  setStep,
  saving,
  onClose,
  children,
}: {
  title: string
  companyName: string
  steps: string[]
  step: number
  setStep: (step: number) => void
  saving: boolean
  onClose: () => void
  children: ReactNode
}) {
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
        {children}
      </div>
    </div>
  )
}

export function PrecheckStep({ context, warnings, blockingReasons }: { context: { ok?: boolean; message?: string }; warnings: string[]; blockingReasons: string[] }) {
  return (
    <div className="space-y-4">
      <div className={cn('rounded-lg border px-4 py-3 text-sm', context.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200')}>
        <div className="flex items-center gap-2">
          {context.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-medium">{context.message || (context.ok ? 'Ön kontrol tamamlandı.' : 'İşlem başlatılamaz.')}</span>
        </div>
      </div>
      {blockingReasons.length > 0 && <MessageList title="Engeller" items={blockingReasons} tone="red" />}
      {warnings.length > 0 && <MessageList title="Uyarılar" items={warnings} tone="amber" />}
    </div>
  )
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
  )
}

export function ReadonlyGrid({ title, fields }: { title: string; fields: Array<[string, unknown]> }) {
  return (
    <div className="space-y-3">
      <SectionTitle title={title} />
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">{formatValue(value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TextField({ label, value, onChange, type = 'text', error, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; error?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}{required && <span className="ml-1 text-red-500">*</span>}
      <input type={type} value={value || ''} onChange={event => onChange(event.target.value)} className={cn(formControlClass, 'mt-1')} />
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span>}
    </label>
  )
}

export function TextareaField({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 md:col-span-2">
      {label}
      <textarea value={value || ''} onChange={event => onChange(event.target.value)} rows={4} className={cn(formControlClass, 'mt-1 min-h-[96px]')} />
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span>}
    </label>
  )
}

export function DocumentsStep({
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
    <div className="space-y-4">
      <SectionTitle title="Belgeler" description="Belge zorunlulukları konfigürasyonla yönetilir; en az bir destekleyici belge önerilir." />
      <DocumentSlotUploader slots={slots} documents={documents} onChange={setDocuments} allowExtraSlots />
      <div className="grid gap-3 md:grid-cols-2">
        {slots.map(slot => (
          <div key={slot.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"><FileText size={15} />{slot.title}</div>
            <input type="date" value={documentMeta[slot.id]?.document_date || ''} onChange={event => setDocumentMeta({ ...documentMeta, [slot.id]: { ...documentMeta[slot.id], document_date: event.target.value } })} className={cn(formControlClass, 'mt-2')} />
            <input value={documentMeta[slot.id]?.description || ''} onChange={event => setDocumentMeta({ ...documentMeta, [slot.id]: { ...documentMeta[slot.id], description: event.target.value } })} placeholder="Belge açıklaması" className={cn(formControlClass, 'mt-2')} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function WizardFooter({
  step,
  steps,
  saving,
  onClose,
  onBack,
  onNext,
  onComplete,
  nextLabel = 'Devam',
}: {
  step: number
  steps: string[]
  saving: boolean
  onClose: () => void
  onBack: () => void
  onNext: () => void
  onComplete: () => void
  nextLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-400">{steps[step]}</div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Vazgeç</button>
        {step > 0 && <button type="button" onClick={onBack} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Geri</button>}
        {step < steps.length - 1 ? (
          <button type="button" onClick={onNext} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{nextLabel}</button>
        ) : (
          <button type="button" onClick={onComplete} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">Tamamla</button>
        )}
      </div>
    </div>
  )
}

export function WizardError({ message }: { message: string }) {
  return (
    <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
      <div className="flex items-center gap-2"><AlertCircle size={16} />{message}</div>
    </div>
  )
}

function StepNav({ steps, step, setStep }: { steps: string[]; step: number; setStep: (step: number) => void }) {
  return (
    <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((label, index) => (
          <button key={label} type="button" onClick={() => index <= step && setStep(index)} className={cn('flex min-h-[48px] items-center rounded-lg border px-3 py-2 text-left text-sm font-medium', index === step ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400')}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChoiceButton({ selected, title, onClick }: { selected: boolean; title: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('rounded-lg border px-4 py-3 text-left text-sm font-semibold', selected ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900')}>
      {title}
    </button>
  )
}

function MessageList({ title, items, tone }: { title: string; items: string[]; tone: 'amber' | 'red' }) {
  const classes = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', classes)}>
      <div className="font-semibold">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}

function buildNaceChangeRows(currentRows: NaceWizardRow[], nextRows: NaceWizardRow[]) {
  const currentPrimary = normalizeInitialNaceRows(currentRows).find(row => row.is_primary)
  const nextPrimary = normalizeInitialNaceRows(nextRows).find(row => row.is_primary)
  const currentSecondary = normalizeInitialNaceRows(currentRows).filter(row => !row.is_primary).map(formatNaceCode).sort().join(', ')
  const nextSecondary = normalizeInitialNaceRows(nextRows).filter(row => !row.is_primary).map(formatNaceCode).sort().join(', ')
  const rows: Array<{ label: string; oldValue: string; newValue: string }> = []
  if (formatNaceCode(currentPrimary) !== formatNaceCode(nextPrimary)) rows.push({ label: 'Birincil NACE', oldValue: formatNaceRow(currentPrimary), newValue: formatNaceRow(nextPrimary) })
  if (currentSecondary !== nextSecondary) rows.push({ label: 'İkincil NACE Kodları', oldValue: currentSecondary || '-', newValue: nextSecondary || '-' })
  return rows
}

export function validateNaceRows(rows: NaceWizardRow[]) {
  if (!rows.length) return 'En az bir NACE kodu seçilmelidir.'
  if (!rows.some(row => row.is_primary)) return 'Birincil NACE kodu seçilmelidir.'
  const keys = rows.map(getNaceKey).filter(Boolean)
  if (new Set(keys).size !== keys.length) return 'Aynı NACE kodu birden fazla seçilemez.'
  if (rows.length > 5) return 'Bir şirket için en fazla 5 aktif NACE kodu tanımlanabilir.'
  return ''
}

export function normalizeInitialNaceRows(rows: NaceWizardRow[]) {
  return (rows || []).map(row => ({
    id: row.id || row.nace_code_id || (typeof row.nace_code === 'object' ? row.nace_code?.id : null),
    nace_code_id: row.nace_code_id || row.id || (typeof row.nace_code === 'object' ? row.nace_code?.id : null),
    nace_code: typeof row.nace_code === 'object' ? row.nace_code?.nace_code : row.nace_code,
    description: row.description || (typeof row.nace_code === 'object' ? row.nace_code?.description : null),
    hazard_class: row.hazard_class || (typeof row.nace_code === 'object' ? row.nace_code?.hazard_class : null),
    is_primary: !!row.is_primary,
    notes: row.notes || null,
  })).filter(row => row.nace_code_id || row.nace_code)
}

export function toSubmitNaceRows(rows: NaceWizardRow[]) {
  return normalizeInitialNaceRows(rows).map(row => ({
    nace_code_id: row.nace_code_id || row.id || null,
    nace_code: row.nace_code || null,
    description: row.description || null,
    hazard_class: row.hazard_class || null,
    is_primary: !!row.is_primary,
    notes: row.notes || null,
  }))
}

export function formatNaceRow(row?: NaceWizardRow | null) {
  if (!row) return '-'
  const code = formatNaceCode(row)
  const description = formatNaceDescription(row)
  return [code, description].filter(Boolean).join(' - ') || '-'
}

export function formatNaceCode(row?: NaceWizardRow | null) {
  if (!row) return ''
  if (typeof row.nace_code === 'object') return String(row.nace_code?.nace_code || '')
  return String(row.nace_code || '')
}

export function formatNaceDescription(row?: NaceWizardRow | null) {
  if (!row) return ''
  if (typeof row.nace_code === 'object') return String(row.nace_code?.description || '')
  return String(row.description || '')
}

export function formatNaceHazard(row?: NaceWizardRow | null) {
  if (!row) return ''
  if (typeof row.nace_code === 'object') return String(row.nace_code?.hazard_class || '')
  return String(row.hazard_class || '')
}

function getNaceKey(row: NaceWizardRow) {
  return String(row.nace_code_id || row.id || formatNaceCode(row) || '')
}

function formatHazardClass(value: unknown) {
  const normalized = String(value || '').trim().toLocaleLowerCase('tr-TR').replace(/_/g, ' ')
  if (!normalized) return ''
  if (normalized === 'az tehlikeli') return 'Az Tehlikeli'
  if (normalized === 'tehlikeli') return 'Tehlikeli'
  if (normalized === 'cok tehlikeli' || normalized === 'çok tehlikeli') return 'Çok Tehlikeli'
  return String(value || '')
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'
  if (Array.isArray(value)) return `${value.length} kayıt`
  return String(value)
}

function isActiveDocument(document: SlotDocument) {
  return document && String(document.status || 'active') !== 'deleted'
}

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
