'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, X } from 'lucide-react'
import { apiClient } from '@/lib/api/apiClient'
import { DocumentSlotUploader, type DocumentSlot, type SlotDocument } from './DocumentSlotUploader'
import { formControlClass } from './formControlStyles'
import { cn } from '@/lib/utils'

export type BranchClosingPrecheckContext = {
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
  selected_branch?: Record<string, any> | null
  impact?: Record<string, any> | null
  facilities?: Record<string, any>[]
}

export type BranchClosingSubmitPayload = Record<string, any> & {
  client_request_id: string
  document_files: SlotDocument[]
  document_meta: Record<string, { document_date?: string | null; description?: string | null }>
}

const steps = ['Ön Kontrol', 'Kapatılacak Şube', 'Etki Analizi', 'Kapanış Bilgileri', 'Belgeler', 'Özet ve Onay']
const documentSlots: DocumentSlot[] = [
  { id: 'branch_closing_resolution', title: 'Şube Kapanış Kararı' },
  { id: 'trade_registry_gazette', title: 'Ticaret Sicil Gazetesi' },
  { id: 'closing_certificate', title: 'Tescil/Kapanış Belgesi' },
  { id: 'tax_office_closing_notification', title: 'Vergi Dairesi Kapanış Bildirimi' },
  { id: 'sgk_closing_notification', title: 'SGK Kapanış Bildirimi' },
  { id: 'other_documents', title: 'Diğer Belgeler' },
]

export function CompanyBranchClosingWizard({
  companyId,
  companyName,
  context,
  saving,
  onClose,
  onComplete,
}: {
  companyId: string
  companyName: string
  context: BranchClosingPrecheckContext
  saving: boolean
  onClose: () => void
  onComplete: (payload: BranchClosingSubmitPayload) => Promise<void>
}) {
  const initialBranchId = context.selected_branch?.id || (context.branches || []).find(isActiveBranch)?.id || ''
  const [step, setStep] = useState(0)
  const [precheck, setPrecheck] = useState(context)
  const [impactLoading, setImpactLoading] = useState(false)
  const [draft, setDraft] = useState<Record<string, any>>({
    branch_id: initialBranchId,
    closing_reason: '',
    closing_decision_date: '',
    closing_registration_date: '',
    trade_registry_gazette_date: '',
    trade_registry_gazette_number: '',
    sgk_closing_notification: false,
    tax_office_notification: false,
    organization_unit_action: 'keep_open',
    target_organization_unit_id: '',
    facility_action: 'keep_open',
    notes: '',
  })
  const [documents, setDocuments] = useState<SlotDocument[]>([])
  const [documentMeta, setDocumentMeta] = useState<Record<string, { document_date?: string | null; description?: string | null }>>({})
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [clientRequestId] = useState(() => `company-branch-closing:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`)
  const branches = precheck.branches || []
  const activeBranches = branches.filter(isActiveBranch)
  const selectedBranch = branches.find(branch => branch.id === draft.branch_id) || precheck.selected_branch || null
  const impact = precheck.selected_branch?.id === draft.branch_id ? precheck.impact : null
  const impactRelationCount = Number(impact?.open_relation_count || 0)
  const blockingReasons = precheck.blocking_reasons || (!precheck.ok && precheck.message ? [precheck.message] : [])
  const activeDocumentCount = documents.filter(isActiveDocument).length
  const organizationUnitOptions = (precheck.organization_units || []).filter(unit => unit.id !== selectedBranch?.organization_unit_id).map(unit => ({ value: unit.id, label: unit.name || unit.short_name || unit.id }))
  const summaryRows = useMemo(() => buildSummaryRows(selectedBranch, draft, activeDocumentCount), [activeDocumentCount, draft, selectedBranch])

  useEffect(() => {
    if (!draft.branch_id || precheck.selected_branch?.id === draft.branch_id) return
    let cancelled = false
    setImpactLoading(true)
    apiClient.get<{ data: BranchClosingPrecheckContext }>(`/api/companies/${companyId}/official-changes/branch-closing/precheck`, {
      useCache: false,
      query: { branch_id: draft.branch_id },
    }).then(result => {
      if (!cancelled) setPrecheck(result.data)
    }).catch(() => {
      if (!cancelled) setError('Şube etki analizi yenilenemedi. Kapanış sırasında tekrar kontrol edilecek.')
    }).finally(() => {
      if (!cancelled) setImpactLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [companyId, draft.branch_id, precheck.selected_branch?.id])

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
    if (!precheck.ok && !draft.branch_id) return blockingReasons[0] || precheck.message || 'Bu işlem şirketin mevcut durumunda başlatılamaz.'
    if (targetStep >= 1 && !draft.branch_id) return 'Kapatılacak şube seçilmelidir.'
    if (targetStep >= 1 && selectedBranch && !isActiveBranch(selectedBranch)) return 'Kapalı veya pasif şube tekrar kapatılamaz.'
    if (targetStep >= 3 && !trimmed(draft.closing_reason)) return 'Kapanış nedeni zorunludur.'
    if (targetStep >= 3 && !draft.closing_decision_date) return 'Karar tarihi zorunludur.'
    if (targetStep >= 3 && draft.closing_registration_date && new Date(draft.closing_registration_date) < new Date(draft.closing_decision_date)) return 'Kapanış tarihi karar tarihinden önce olamaz.'
    if (targetStep >= 2 && impactRelationCount > 0 && !draft.organization_unit_action) return 'Etki analizi için organizasyon birimi aksiyonu seçilmelidir.'
    if (targetStep >= 2 && impactRelationCount > 0 && !draft.facility_action) return 'Etki analizi için lokasyon/tesis aksiyonu seçilmelidir.'
    if (targetStep >= 3 && draft.organization_unit_action === 'reassign' && !draft.target_organization_unit_id) return 'Organizasyon birimi başka birime bağlanacaksa hedef birim seçilmelidir.'
    return null
  }

  const nextStep = () => {
    const validationError = validate(step)
    if (validationError) return setError(validationError)
    setError(null)
    setStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const complete = async () => {
    const validationError = validate(steps.length - 1)
    if (validationError) return setError(validationError)
    setError(null)
    try {
      await onComplete({
        ...draft,
        client_request_id: clientRequestId,
        base_branch_version: selectedBranch?.version || null,
        base_branch_updated_at: selectedBranch?.updated_at || null,
        document_files: documents,
        document_meta: documentMeta,
      })
    } catch (caught: any) {
      setFieldErrors(caught?.details?.details?.fieldErrors || caught?.details?.fieldErrors || {})
      setError(caught?.message || 'Şube kapanışı tamamlanamadı.')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <WizardHeader title="Şube Kapanışı" subtitle={companyName} onClose={onClose} saving={saving} />
        <StepNav steps={steps} step={step} setStep={setStep} />
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {step === 0 && <Precheck context={precheck} blockingReasons={blockingReasons} activeBranchCount={activeBranches.length} />}
          {step === 1 && <div className="space-y-4">
            <SelectField label="Kapatılacak Şube" value={draft.branch_id} onChange={value => setField('branch_id', value)} options={[['', 'Şube seçin'], ...activeBranches.map(branch => [branch.id, branch.branch_name || branch.branch_short_name || branch.id] as [string, string])]} error={fieldErrors.branch_id} />
            {selectedBranch ? <ReadonlyGrid title="Seçilen şube" fields={[['Şube Adı', selectedBranch.branch_name], ['Durum', selectedBranch.record_status || selectedBranch.status], ['Adres', [selectedBranch.address, selectedBranch.district, selectedBranch.city].filter(Boolean).join(' / ')], ['Açılış Tarihi', selectedBranch.opening_registration_date || selectedBranch.start_date]]} /> : null}
          </div>}
          {step === 2 && <div className="space-y-5">
            {impactLoading ? <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">Etki analizi yenileniyor...</div> : null}
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Organizasyon Birimi" value={selectedBranch?.organization_unit_id ? 'Bağlı' : 'Yok'} />
              <Metric label="Lokasyon/Tesis" value={selectedBranch?.facility_id ? 'Bağlı' : 'Yok'} />
              <Metric label="Aktif Kadro" value={String(impact?.active_position_count ?? impact?.position_count ?? 0)} />
              <Metric label="Personel" value={String(impact?.employee_count || 0)} />
              <Metric label="Açık Görev" value={String(impact?.open_task_count || 0)} />
              <Metric label="Açık Proje" value={String(impact?.open_project_count || 0)} />
              <Metric label="Depo/Stok Lokasyonu" value={String(impact?.open_inventory_location_count || 0)} />
              <Metric label="Servis/Saha Kaydı" value={String(impact?.open_service_record_count || 0)} />
            </div>
            {impactRelationCount > 0 ? <MessageList title="Etki analizi uyarısı" tone="amber" messages={['Şubeye bağlı aktif ilişki görünüyor. Kapanış tamamlanmadan organizasyon birimi ve lokasyon/tesis için aksiyon seçilmelidir.']} /> : null}
            {Array.isArray(impact?.warnings) && impact.warnings.length ? <MessageList title="Altyapı Notları" tone="amber" messages={impact.warnings} /> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Bağlı organizasyon birimi ne olacak?" value={draft.organization_unit_action} onChange={value => setField('organization_unit_action', value)} options={[['deactivate', 'Pasife al'], ['reassign', 'Başka birime bağla'], ['keep_open', 'Sadece şube kaydını kapat, birimi açık bırak']]} />
              <SelectField label="Hedef organizasyon birimi" value={draft.target_organization_unit_id} onChange={value => setField('target_organization_unit_id', value)} disabled={draft.organization_unit_action !== 'reassign'} options={[['', 'Hedef birim seçin'], ...organizationUnitOptions.map(option => [option.value, option.label] as [string, string])]} error={fieldErrors.target_organization_unit_id} />
              <SelectField label="Bağlı lokasyon/tesis ne olacak?" value={draft.facility_action} onChange={value => setField('facility_action', value)} options={[['deactivate', 'Pasife al'], ['keep_open', 'Açık bırak'], ['reuse', 'Başka amaçla kullan']]} />
            </div>
          </div>}
          {step === 3 && <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Kapanış Nedeni" value={draft.closing_reason} onChange={value => setField('closing_reason', value)} error={fieldErrors.closing_reason} required />
              <DateField label="Karar Tarihi" value={draft.closing_decision_date} onChange={value => setField('closing_decision_date', value)} error={fieldErrors.closing_decision_date} />
              <DateField label="Tescil / Kapanış Tarihi" value={draft.closing_registration_date} onChange={value => setField('closing_registration_date', value)} error={fieldErrors.closing_registration_date} />
              <DateField label="Ticaret Sicil Gazetesi Tarihi" value={draft.trade_registry_gazette_date} onChange={value => setField('trade_registry_gazette_date', value)} />
              <TextField label="Ticaret Sicil Gazetesi Sayısı" value={draft.trade_registry_gazette_number} onChange={value => setField('trade_registry_gazette_number', value)} />
              <CheckboxField label="SGK kapanış bildirimi var" checked={!!draft.sgk_closing_notification} onChange={value => setField('sgk_closing_notification', value)} />
              <CheckboxField label="Vergi dairesi bildirimi var" checked={!!draft.tax_office_notification} onChange={value => setField('tax_office_notification', value)} />
            </div>
            <TextareaField label="Açıklama / Not" value={draft.notes} onChange={value => setField('notes', value)} />
          </div>}
          {step === 4 && <Documents documents={documents} setDocuments={setDocuments} documentMeta={documentMeta} setDocumentMeta={setDocumentMeta} />}
          {step === 5 && <Summary rows={summaryRows} documents={documents} />}
        </div>
        {error && <ErrorBar message={error} />}
        <Footer step={step} stepsLength={steps.length} saving={saving} count={activeDocumentCount} onClose={onClose} onBack={() => setStep(prev => Math.max(0, prev - 1))} onNext={nextStep} onComplete={complete} />
      </div>
    </div>
  )
}

function buildSummaryRows(branch: Record<string, any> | null, draft: Record<string, any>, activeDocumentCount: number): Array<[string, unknown, unknown]> {
  return [
    ['Şube', branch?.branch_name || '-', 'Kapalı'],
    ['Durum', branch?.record_status || branch?.status, 'closed'],
    ['Kapanış Nedeni', '-', draft.closing_reason],
    ['Karar Tarihi', '-', draft.closing_decision_date],
    ['Tescil / Kapanış Tarihi', '-', draft.closing_registration_date],
    ['Organizasyon Aksiyonu', '-', organizationActionLabel(draft.organization_unit_action)],
    ['Lokasyon/Tesis Aksiyonu', '-', facilityActionLabel(draft.facility_action)],
    ['Belge', '-', activeDocumentCount],
  ]
}
function organizationActionLabel(value: string) { if (value === 'deactivate') return 'Pasife al'; if (value === 'reassign') return 'Başka birime bağla'; return 'Açık bırak' }
function facilityActionLabel(value: string) { if (value === 'deactivate') return 'Pasife al'; if (value === 'reuse') return 'Başka amaçla kullan'; return 'Açık bırak' }

function WizardHeader({ title, subtitle, onClose, saving }: { title: string; subtitle: string; onClose: () => void; saving: boolean }) {
  return <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800"><div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p></div><button type="button" aria-label={`${title} penceresini kapat`} onClick={onClose} disabled={saving} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"><X size={18} /></button></div>
}
function StepNav({ steps, step, setStep }: { steps: string[]; step: number; setStep: (step: number) => void }) {
  return <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800"><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>{steps.map((label, index) => <button key={label} type="button" onClick={() => index <= step && setStep(index)} className={cn('flex min-h-[48px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium', index === step ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400')}><span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs shadow-sm dark:bg-gray-900">{index + 1}</span><span className="min-w-0">{label}</span></button>)}</div></div>
}
function Precheck({ context, blockingReasons, activeBranchCount }: { context: BranchClosingPrecheckContext; blockingReasons: string[]; activeBranchCount: number }) {
  return <div className="space-y-5"><div className="grid gap-3 md:grid-cols-3"><Metric label="Şirket Durumu" value={context.is_company_active ? 'Aktif' : (context.company_status || context.record_status || 'Kontrol edilemedi')} /><Metric label="İşlem Durumu" value={context.operation_enabled ? 'Başlatılabilir' : 'Kapalı'} /><Metric label="Aktif Şube" value={String(activeBranchCount)} /></div>{blockingReasons.length ? <MessageList title="İşlem başlatılamaz" tone="red" messages={blockingReasons} /> : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">Ön kontrol tamamlandı. Kapanış sonunda şube kapalı duruma alınacak.</div>}{context.warnings?.length ? <MessageList title="Uyarılar" tone="amber" messages={context.warnings} /> : null}</div>
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
function ReadonlyGrid({ title, fields }: { title: string; fields: Array<[string, unknown]> }) { return <div className="space-y-4"><div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div><div className="grid gap-3 md:grid-cols-2">{fields.map(([label, value]) => <Metric key={label} label={label} value={formatValue(value)} />)}</div></div> }
function TextField({ label, value, onChange, error, required }: { label: string; value: any; onChange: (value: string) => void; error?: string; required?: boolean }) { return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}{required ? <span className="text-red-500"> *</span> : null}<input value={value || ''} onChange={event => onChange(event.target.value)} className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'mt-1' })} />{error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}</label> }
function DateField({ label, value, onChange, error }: { label: string; value: any; onChange: (value: string) => void; error?: string }) { return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}<input type="date" value={value || ''} onChange={event => onChange(event.target.value)} className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'mt-1' })} />{error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}</label> }
function TextareaField({ label, value, onChange }: { label: string; value: any; onChange: (value: string) => void }) { return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}<textarea value={value || ''} onChange={event => onChange(event.target.value)} rows={3} className={formControlClass({ className: 'mt-1' })} /></label> }
function SelectField({ label, value, onChange, options, error, disabled }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; error?: string; disabled?: boolean }) { return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}<select value={value || ''} disabled={disabled} onChange={event => onChange(event.target.value)} className={formControlClass({ state: error ? 'invalid' : 'neutral', className: 'mt-1' })}>{options.map(([optionValue, optionLabel]) => <option key={optionValue || optionLabel} value={optionValue}>{optionLabel}</option>)}</select>{error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}</label> }
function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-200"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300" />{label}</label> }
function ChangeTable({ rows }: { rows: Array<[string, unknown, unknown]> }) { return <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"><table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800"><thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400"><tr><th className="px-3 py-2">Alan</th><th className="px-3 py-2">Eski Değer</th><th className="px-3 py-2">Yeni Değer</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{rows.map(([label, oldValue, newValue]) => <tr key={label}><td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{label}</td><td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatValue(oldValue)}</td><td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{formatValue(newValue)}</td></tr>)}</tbody></table></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950"><div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div><div className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">{value || '-'}</div></div> }
function MessageList({ title, messages, tone }: { title: string; messages: string[]; tone: 'red' | 'amber' }) { const className = tone === 'red' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'; return <div className={`rounded-lg border p-4 text-sm ${className}`}><div className="font-semibold">{title}</div><ul className="mt-2 list-disc space-y-1 pl-5">{messages.map(message => <li key={message}>{message}</li>)}</ul></div> }
function ErrorBar({ message }: { message: string }) { return <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"><div className="flex items-center gap-2"><AlertCircle size={16} />{message}</div></div> }
function isActiveDocument(document: SlotDocument) { return String(document.status || 'active') !== 'deleted' && !document.isDeleted }
function isActiveBranch(branch: Record<string, any>) { const values = [branch.record_status, branch.status].map(value => String(value || '').toLocaleLowerCase('tr-TR')); return !branch.is_deleted && values.some(value => value === 'active' || value === 'aktif') }
function trimmed(value: unknown) { return String(value || '').trim() }
function formatValue(value: unknown) { if (value === null || value === undefined || value === '') return '-'; if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'; return String(value) }
