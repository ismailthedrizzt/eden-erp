'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, X } from 'lucide-react'
import { DocumentSlotUploader, type DocumentSlot, type SlotDocument } from './DocumentSlotUploader'
import { formControlClass } from './formControlStyles'
import { cn } from '@/lib/utils'

export type BranchOpeningPrecheckContext = {
  ok: boolean
  operation_enabled: boolean
  message: string
  warnings?: string[]
  reasons?: string[]
  blocking_reasons?: string[]
  is_company_active?: boolean
  company_status?: string
  record_status?: string
  current: Record<string, any>
  branches?: Record<string, any>[]
  organization_units?: Record<string, any>[]
  facilities?: Record<string, any>[]
}

export type BranchOpeningSubmitPayload = Record<string, any> & {
  client_request_id: string
  document_files: SlotDocument[]
  document_meta: Record<string, { document_date?: string | null; description?: string | null }>
}

const steps = ['Bilgiler', 'Belgeler', 'Ön İzleme/Onay']
const BRANCH_OPENING_INFO_VALIDATION_STEP = 4
const BRANCH_OPENING_FINAL_VALIDATION_STEP = 6

const documentSlots: DocumentSlot[] = [
  { id: 'branch_opening_resolution', title: 'Şube Açılış Kararı' },
  { id: 'trade_registry_gazette', title: 'Ticaret Sicil Gazetesi' },
  { id: 'registration_certificate', title: 'Tescil Belgesi' },
  { id: 'tax_office_notification', title: 'Vergi Dairesi Bildirimi' },
  { id: 'sgk_workplace_registration', title: 'SGK İşyeri Tescil Belgesi' },
  { id: 'lease_deed_usage_document', title: 'Kira Kontratı / Tapu / Kullanım Belgesi' },
  { id: 'signature_authorization', title: 'İmza Yetki Belgesi' },
  { id: 'other_documents', title: 'Diğer Belgeler' },
]

export function CompanyBranchOpeningWizard({
  companyName,
  context,
  saving,
  onClose,
  onComplete,
}: {
  companyName: string
  context: BranchOpeningPrecheckContext
  saving: boolean
  onClose: () => void
  onComplete: (payload: BranchOpeningSubmitPayload) => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Record<string, any>>(() => initialDraft(context))
  const [documents, setDocuments] = useState<SlotDocument[]>([])
  const [documentMeta, setDocumentMeta] = useState<Record<string, { document_date?: string | null; description?: string | null }>>({})
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [clientRequestId] = useState(() => `company-branch-opening:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`)
  const blockingReasons = context.blocking_reasons || (!context.ok && context.message ? [context.message] : [])
  const activeDocumentCount = documents.filter(isActiveDocument).length
  const activeBranches = context.branches?.filter(isActiveBranch) || []
  const duplicateName = activeBranches.some(branch => sameText(branch.branch_name, draft.branch_name))
  const organizationUnitOptions = (context.organization_units || []).map(unit => ({ value: unit.id, label: unit.name || unit.short_name || unit.id }))
  const summaryRows = useMemo(() => buildSummaryRows(draft, companyName, activeDocumentCount), [activeDocumentCount, companyName, draft])

  const setField = (field: string, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validate = (targetStep = step) => {
    if (!context.ok || blockingReasons.length) return blockingReasons[0] || 'Bu işlem şirketin mevcut durumunda başlatılamaz.'
    if (targetStep >= 1 && !trimmed(draft.branch_name)) return 'Şube adı boş olamaz.'
    if (targetStep >= 1 && duplicateName) return 'Aynı şirket altında aynı şube adıyla aktif şube tekrar açılamaz.'
    if (targetStep >= 2 && !trimmed(draft.address)) return 'Şube adresi boş olamaz.'
    if (targetStep >= 2 && isTurkey(draft.country) && (!trimmed(draft.city) || !trimmed(draft.district))) return 'Türkiye adreslerinde il ve ilçe seçilmelidir.'
    if (targetStep >= 3 && draft.is_official_branch && !draft.opening_decision_date) return 'Resmi şube için karar tarihi zorunludur.'
    if (targetStep >= 3 && draft.is_official_branch && !draft.opening_registration_date) return 'Resmi şube için tescil tarihi zorunludur.'
    if (targetStep >= 3 && draft.opening_registration_date && draft.opening_decision_date && new Date(draft.opening_registration_date) < new Date(draft.opening_decision_date)) return 'Tescil tarihi karar tarihinden önce olamaz.'
    if (targetStep >= BRANCH_OPENING_FINAL_VALIDATION_STEP && draft.is_official_branch && activeDocumentCount === 0) return 'Resmi şube açılışı için en az bir karar/tescil belgesi eklenmelidir.'
    return null
  }

  const nextStep = () => {
    const validationTarget = step === 0 ? BRANCH_OPENING_INFO_VALIDATION_STEP : step === 1 ? BRANCH_OPENING_FINAL_VALIDATION_STEP : step
    const validationError = validate(validationTarget)
    if (validationError) return setError(validationError)
    setError(null)
    setStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const complete = async () => {
    const validationError = validate(BRANCH_OPENING_FINAL_VALIDATION_STEP)
    if (validationError) return setError(validationError)
    setError(null)
    try {
      await onComplete({ ...draft, client_request_id: clientRequestId, document_files: documents, document_meta: documentMeta })
    } catch (caught: any) {
      setFieldErrors(caught?.details?.details?.fieldErrors || caught?.details?.fieldErrors || {})
      setError(caught?.message || 'Şube açılışı tamamlanamadı.')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <WizardHeader title="Şube Açılışı" subtitle={companyName} onClose={onClose} saving={saving} />
        <StepNav steps={steps} step={step} setStep={setStep} />
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {step === 0 && <Precheck context={context} blockingReasons={blockingReasons} />}
          {step === 0 && <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Şube Adı" value={draft.branch_name} onChange={value => setField('branch_name', value)} error={fieldErrors.branch_name || (duplicateName ? 'Bu isimle aktif şube var.' : undefined)} required />
            <TextField label="Şube Kısa Adı" value={draft.branch_short_name} onChange={value => setField('branch_short_name', value)} />
            <SelectField label="Şube Türü" value={draft.branch_type} onChange={value => setField('branch_type', value)} options={branchTypeOptions} />
            <CheckboxField label="Resmi şube" checked={!!draft.is_official_branch} onChange={value => setField('is_official_branch', value)} />
          </div>}
          {step === 0 && <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <TextField label="Ülke" value={draft.country} onChange={value => setField('country', value)} required />
              <TextField label="İl" value={draft.city} onChange={value => setField('city', value)} error={fieldErrors.city} required={isTurkey(draft.country)} />
              <TextField label="İlçe" value={draft.district} onChange={value => setField('district', value)} error={fieldErrors.district} required={isTurkey(draft.country)} />
              <TextField label="Mahalle / Semt" value={draft.neighborhood} onChange={value => setField('neighborhood', value)} />
              <TextField label="Posta Kodu" value={draft.postal_code} onChange={value => setField('postal_code', value)} />
              <TextField label="Telefon" value={draft.phone} onChange={value => setField('phone', value)} />
              <TextField label="E-posta" value={draft.email} onChange={value => setField('email', value)} error={fieldErrors.email} />
            </div>
            <TextareaField label="Açık Adres" value={draft.address} onChange={value => setField('address', value)} error={fieldErrors.address} required />
          </div>}
          {step === 0 && <div className="grid gap-4 md:grid-cols-2">
            <DateField label="Şube Açılış Karar Tarihi" value={draft.opening_decision_date} onChange={value => setField('opening_decision_date', value)} error={fieldErrors.opening_decision_date} />
            <DateField label="Tescil Tarihi" value={draft.opening_registration_date} onChange={value => setField('opening_registration_date', value)} error={fieldErrors.opening_registration_date} />
            <DateField label="Ticaret Sicil Gazetesi Tarihi" value={draft.trade_registry_gazette_date} onChange={value => setField('trade_registry_gazette_date', value)} />
            <TextField label="Ticaret Sicil Gazetesi Sayısı" value={draft.trade_registry_gazette_number} onChange={value => setField('trade_registry_gazette_number', value)} />
            <TextField label="Şube Ticaret Sicil No" value={draft.trade_registry_number} onChange={value => setField('trade_registry_number', value)} />
            <TextField label="Vergi Dairesi" value={draft.tax_office} onChange={value => setField('tax_office', value)} />
            <TextField label="SGK İşyeri Sicil No" value={draft.sgk_workplace_registry_no} onChange={value => setField('sgk_workplace_registry_no', value)} />
            <TextField label="Ticaret Sicil Müdürlüğü" value={draft.trade_registry_office} onChange={value => setField('trade_registry_office', value)} />
            <TextareaField label="Açıklama / Not" value={draft.notes} onChange={value => setField('notes', value)} />
          </div>}
          {step === 0 && <div className="grid gap-4 md:grid-cols-2">
            <CheckboxField label="Otomatik organizasyon birimi oluşturulsun" checked={!!draft.create_organization_unit} onChange={value => setField('create_organization_unit', value)} />
            <TextField label="Organizasyon Birimi Adı" value={draft.organization_unit_name} onChange={value => setField('organization_unit_name', value)} disabled={!draft.create_organization_unit} />
            <SelectField label="Üst Organizasyon Birimi" value={draft.parent_organization_unit_id} onChange={value => setField('parent_organization_unit_id', value)} options={[['', 'Şirket kök birimi'], ...organizationUnitOptions.map(option => [option.value, option.label] as [string, string])]} />
            <TextField label="Şube Müdürü / Sorumlu Kişi" value={draft.responsible_person_id} onChange={value => setField('responsible_person_id', value)} />
            <CheckboxField label="Otomatik lokasyon/tesis kaydı oluşturulsun" checked={!!draft.create_facility} onChange={value => setField('create_facility', value)} />
            <TextField label="Lokasyon / Tesis Adı" value={draft.facility_name} onChange={value => setField('facility_name', value)} disabled={!draft.create_facility} />
          </div>}
          {step === 1 && <Documents documents={documents} setDocuments={setDocuments} documentMeta={documentMeta} setDocumentMeta={setDocumentMeta} />}
          {step === 2 && <Summary rows={summaryRows} documents={documents} />}
        </div>
        {error && <ErrorBar message={error} />}
        <Footer step={step} stepsLength={steps.length} saving={saving} count={activeDocumentCount} onClose={onClose} onBack={() => setStep(prev => Math.max(0, prev - 1))} onNext={nextStep} onComplete={complete} />
      </div>
    </div>
  )
}

const branchTypeOptions: Array<[string, string]> = [
  ['official_branch', 'Resmi şube'],
  ['liaison_office', 'İrtibat ofisi'],
  ['operation_point', 'Operasyon noktası'],
  ['warehouse_facility', 'Depo / tesis'],
]

function initialDraft(context: BranchOpeningPrecheckContext) {
  const current = context.current || {}
  return {
    company_id: current.id || '',
    branch_name: '',
    branch_short_name: '',
    branch_type: 'official_branch',
    is_official_branch: true,
    country: current.country || 'Türkiye',
    city: current.city || '',
    district: current.district || '',
    neighborhood: '',
    address: '',
    postal_code: '',
    phone: '',
    email: '',
    opening_decision_date: '',
    opening_registration_date: '',
    trade_registry_gazette_date: '',
    trade_registry_gazette_number: '',
    trade_registry_number: '',
    trade_registry_office: current.trade_registry_office || '',
    tax_office: current.tax_office || '',
    sgk_workplace_registry_no: '',
    responsible_person_id: '',
    create_organization_unit: true,
    organization_unit_name: '',
    parent_organization_unit_id: '',
    create_facility: false,
    facility_name: '',
    notes: '',
  }
}

function buildSummaryRows(draft: Record<string, any>, companyName: string, activeDocumentCount: number): Array<[string, unknown, unknown]> {
  return [
    ['Bağlı Şirket', '-', companyName],
    ['Şube Adı', '-', draft.branch_name],
    ['Şube Türü', '-', branchTypeOptions.find(([value]) => value === draft.branch_type)?.[1] || draft.branch_type],
    ['Resmi Şube', '-', draft.is_official_branch ? 'Evet' : 'Hayır'],
    ['Adres', '-', [draft.address, draft.district, draft.city].filter(Boolean).join(' / ')],
    ['Açılış Karar Tarihi', '-', draft.opening_decision_date],
    ['Tescil Tarihi', '-', draft.opening_registration_date],
    ['Organizasyon Birimi', '-', draft.create_organization_unit ? (draft.organization_unit_name || draft.branch_name) : 'Oluşturulmayacak'],
    ['Tesis/Lokasyon', '-', draft.create_facility ? (draft.facility_name || draft.branch_name) : 'Şube adresinde tutulacak'],
    ['Belge', '-', activeDocumentCount],
  ]
}

function WizardHeader({ title, subtitle, onClose, saving }: { title: string; subtitle: string; onClose: () => void; saving: boolean }) {
  return <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800"><div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p></div><button type="button" aria-label={`${title} penceresini kapat`} onClick={onClose} disabled={saving} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"><X size={18} /></button></div>
}

function StepNav({ steps, step, setStep }: { steps: string[]; step: number; setStep: (step: number) => void }) {
  return <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800"><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>{steps.map((label, index) => <button key={label} type="button" onClick={() => index <= step && setStep(index)} className={cn('flex min-h-[48px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium', index === step ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400')}><span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs shadow-sm dark:bg-gray-900">{index + 1}</span><span className="min-w-0">{label}</span></button>)}</div></div>
}

function Precheck({ context, blockingReasons }: { context: BranchOpeningPrecheckContext; blockingReasons: string[] }) {
  return <div className="space-y-5"><div className="grid gap-3 md:grid-cols-3"><Metric label="Şirket Durumu" value={context.is_company_active ? 'Aktif' : (context.company_status || context.record_status || 'Kontrol edilemedi')} /><Metric label="İşlem Durumu" value={context.operation_enabled ? 'Başlatılabilir' : 'Kapalı'} /><Metric label="Mevcut Aktif Şube" value={String((context.branches || []).filter(isActiveBranch).length)} /></div>{blockingReasons.length ? <MessageList title="İşlem başlatılamaz" tone="red" messages={blockingReasons} /> : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">Ön kontrol tamamlandı. Şube bağlı şirket altında resmi/operasyonel birim olarak açılacak.</div>}{context.warnings?.length ? <MessageList title="Uyarılar" tone="amber" messages={context.warnings} /> : null}</div>
}

function Documents({ documents, setDocuments, documentMeta, setDocumentMeta }: { documents: SlotDocument[]; setDocuments: (documents: SlotDocument[]) => void; documentMeta: Record<string, { document_date?: string | null; description?: string | null }>; setDocumentMeta: (meta: Record<string, { document_date?: string | null; description?: string | null }>) => void }) {
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"><DocumentSlotUploader slots={documentSlots} documents={documents} onChange={setDocuments} allowExtraSlots mode="update" defaultTab="upload" /><div className="space-y-3">{documentSlots.map(slot => <div key={slot.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"><div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><FileText size={15} />{slot.title}</div><label className="mt-2 block text-xs font-medium text-gray-600 dark:text-gray-300">Belge Tarihi<input type="date" value={documentMeta[slot.id]?.document_date || ''} onChange={event => setDocumentMeta({ ...documentMeta, [slot.id]: { ...documentMeta[slot.id], document_date: event.target.value } })} className={formControlClass({ size: 'sm', className: 'mt-1' })} /></label><label className="mt-2 block text-xs font-medium text-gray-600 dark:text-gray-300">Açıklama<input value={documentMeta[slot.id]?.description || ''} onChange={event => setDocumentMeta({ ...documentMeta, [slot.id]: { ...documentMeta[slot.id], description: event.target.value } })} className={formControlClass({ size: 'sm', className: 'mt-1' })} /></label></div>)}</div></div>
}

function Summary({ rows, documents }: { rows: Array<[string, unknown, unknown]>; documents: SlotDocument[] }) {
  return <div className="space-y-5"><ChangeTable rows={rows} /><div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"><div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><CheckCircle2 size={16} />Belgeler</div><div className="mt-3 grid gap-2 md:grid-cols-2">{documentSlots.map(slot => { const doc = documents.find(item => item.slotId === slot.id && isActiveDocument(item)); return <div key={slot.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900"><span className="font-medium text-gray-900 dark:text-white">{slot.title}</span><span className="ml-2 text-gray-500 dark:text-gray-400">{doc?.name || '-'}</span></div> })}</div></div></div>
}

function Footer({ step, stepsLength, saving, count, onClose, onBack, onNext, onComplete }: { step: number; stepsLength: number; saving: boolean; count: number; onClose: () => void; onBack: () => void; onNext: () => void; onComplete: () => void }) {
  return <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800"><div className="text-xs text-gray-500 dark:text-gray-400">Belge: <span className="font-semibold text-gray-900 dark:text-white">{count}</span></div><div className="flex items-center gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Vazgeç</button>{step > 0 && <button type="button" onClick={onBack} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">Geri</button>}{step < stepsLength - 1 ? <button type="button" onClick={onNext} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">Devam</button> : <button type="button" onClick={onComplete} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">Tamamla</button>}</div></div>
}

function TextField({ label, value, onChange, error, required, disabled }: { label: string; value: any; onChange: (value: string) => void; error?: string; required?: boolean; disabled?: boolean }) {
  return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}{required ? <span className="text-red-500"> *</span> : null}<input value={value || ''} disabled={disabled} onChange={event => onChange(event.target.value)} className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'mt-1' })} />{error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}</label>
}
function DateField({ label, value, onChange, error }: { label: string; value: any; onChange: (value: string) => void; error?: string }) {
  return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}<input type="date" value={value || ''} onChange={event => onChange(event.target.value)} className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'mt-1' })} />{error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}</label>
}
function TextareaField({ label, value, onChange, error, required }: { label: string; value: any; onChange: (value: string) => void; error?: string; required?: boolean }) {
  return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}{required ? <span className="text-red-500"> *</span> : null}<textarea value={value || ''} onChange={event => onChange(event.target.value)} rows={3} className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'mt-1' })} />{error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}</label>
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}<select value={value || ''} onChange={event => onChange(event.target.value)} className={formControlClass({ className: 'mt-1' })}>{options.map(([optionValue, optionLabel]) => <option key={optionValue || optionLabel} value={optionValue}>{optionLabel}</option>)}</select></label>
}
function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-200"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300" />{label}</label>
}
function ChangeTable({ rows }: { rows: Array<[string, unknown, unknown]> }) {
  return <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"><table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800"><thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400"><tr><th className="px-3 py-2">Alan</th><th className="px-3 py-2">Eski Değer</th><th className="px-3 py-2">Yeni Değer</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{rows.map(([label, oldValue, newValue]) => <tr key={label}><td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{label}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatValue(oldValue)}</td><td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{formatValue(newValue)}</td></tr>)}</tbody></table></div>
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950"><div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div><div className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">{value || '-'}</div></div> }
function MessageList({ title, messages, tone }: { title: string; messages: string[]; tone: 'red' | 'amber' }) {
  const className = tone === 'red' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
  return <div className={`rounded-lg border p-4 text-sm ${className}`}><div className="font-semibold">{title}</div><ul className="mt-2 list-disc space-y-1 pl-5">{messages.map(message => <li key={message}>{message}</li>)}</ul></div>
}
function ErrorBar({ message }: { message: string }) { return <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"><div className="flex items-center gap-2"><AlertCircle size={16} />{message}</div></div> }
function isActiveDocument(document: SlotDocument) { return String(document.status || 'active') !== 'deleted' && !document.isDeleted }
function isActiveBranch(branch: Record<string, any>) { const values = [branch.record_status, branch.status].map(value => String(value || '').toLocaleLowerCase('tr-TR')); return !branch.is_deleted && values.some(value => value === 'active' || value === 'aktif') }
function isTurkey(value: unknown) { return ['türkiye', 'turkiye', 'turkey', 'tr'].includes(String(value || '').trim().toLocaleLowerCase('tr-TR')) }
function sameText(left: unknown, right: unknown) { return String(left || '').trim().toLocaleLowerCase('tr-TR') === String(right || '').trim().toLocaleLowerCase('tr-TR') }
function trimmed(value: unknown) { return String(value || '').trim() }
function formatValue(value: unknown) { if (value === null || value === undefined || value === '') return '-'; if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'; return String(value) }
