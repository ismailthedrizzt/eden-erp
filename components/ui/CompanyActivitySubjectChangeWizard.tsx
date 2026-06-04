'use client'

import { useMemo, useState } from 'react'
import type { DocumentSlot, SlotDocument } from './DocumentSlotUploader'
import {
  DocumentsStep,
  NaceSelectionEditor,
  PrecheckStep,
  ReadonlyGrid,
  SectionTitle,
  TextField,
  TextareaField,
  WizardError,
  WizardFooter,
  WizardShell,
  formatNaceRow,
  normalizeInitialNaceRows,
  toSubmitNaceRows,
  validateNaceRows,
  type CompanyNacePrecheckContext,
  type NaceWizardRow,
} from './CompanyNaceChangeWizard'

export type CompanyActivitySubjectPrecheckContext = CompanyNacePrecheckContext

export type CompanyActivitySubjectChangeSubmitPayload = Record<string, any> & {
  client_request_id: string
  document_files: SlotDocument[]
  document_meta: Record<string, { document_date?: string | null; description?: string | null }>
}

const steps = ['Bilgiler', 'Belgeler', 'Ön İzleme/Onay']

const documentSlots: DocumentSlot[] = [
  { id: 'general_assembly_resolution', title: 'Genel Kurul / Ortaklar Kurulu Kararı', required: false },
  { id: 'articles_amendment_text', title: 'Esas Sözleşme Tadil Metni', required: false },
  { id: 'trade_registry_gazette', title: 'Ticaret Sicil Gazetesi', required: false },
  { id: 'registration_certificate', title: 'Tescil Belgesi', required: false },
  { id: 'tax_certificate', title: 'Vergi Levhası', required: false },
  { id: 'sgk_notification', title: 'SGK Bildirim Belgesi', required: false },
  { id: 'other_documents', title: 'Diğer Belgeler', required: false },
]

export function CompanyActivitySubjectChangeWizard({
  companyName,
  context,
  saving,
  candidateNaceRows,
  onClose,
  onComplete,
}: {
  companyName: string
  context: CompanyActivitySubjectPrecheckContext
  saving: boolean
  candidateNaceRows?: NaceWizardRow[]
  onClose: () => void
  onComplete: (payload: CompanyActivitySubjectChangeSubmitPayload) => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({
    new_activity_subject: '',
    change_reason: '',
    nace_codes: normalizeInitialNaceRows(candidateNaceRows?.length ? candidateNaceRows : context.nace_codes || []),
    decision_date: '',
    registration_date: '',
    trade_registry_gazette_date: '',
    trade_registry_gazette_number: '',
    mersis_impact: '',
    tax_office_impact: '',
    sgk_hazard_class_impact: '',
    notes: '',
  })
  const [documents, setDocuments] = useState<SlotDocument[]>([])
  const [documentMeta, setDocumentMeta] = useState<Record<string, { document_date?: string | null; description?: string | null }>>({})
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [clientRequestId] = useState(() => `company-activity-subject-change:${randomId()}`)
  const blockingReasons = context.blocking_reasons || (!context.ok && context.message ? [context.message] : [])
  const warnings = Array.from(new Set([...(context.warnings || []), ...(context.reasons || [])]))
  const currentActivitySubject = String(context.activity_subject || context.current?.activity_subject || '')
  const naceChangeRows = useMemo(() => buildNaceSummary(context.nace_codes || [], draft.nace_codes), [context.nace_codes, draft.nace_codes])
  const activeDocumentCount = documents.filter(document => String(document.status || 'active') !== 'deleted').length

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
    if (targetStep >= 0) {
      if (!draft.new_activity_subject.trim()) return 'Yeni faaliyet konusu boş olamaz.'
      if (currentActivitySubject.trim().toLocaleLowerCase('tr-TR') === draft.new_activity_subject.trim().toLocaleLowerCase('tr-TR')) return 'Yeni faaliyet konusu mevcut faaliyet konusu ile aynı olamaz.'
    }
    if (targetStep >= 0) {
      const selectionError = validateNaceRows(draft.nace_codes)
      if (selectionError) return selectionError
    }
    if (targetStep >= 0) {
      if (!draft.decision_date) return 'Karar tarihi boş olamaz.'
      if (!draft.registration_date) return 'Tescil tarihi boş olamaz.'
      if (draft.registration_date && draft.decision_date && new Date(draft.registration_date) < new Date(draft.decision_date)) return 'Tescil tarihi karar tarihinden önce olamaz.'
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
      await onComplete({
        new_activity_subject: draft.new_activity_subject.trim(),
        change_reason: draft.change_reason || null,
        nace_codes: toSubmitNaceRows(draft.nace_codes),
        decision_date: draft.decision_date,
        registration_date: draft.registration_date,
        trade_registry_gazette_date: draft.trade_registry_gazette_date || null,
        trade_registry_gazette_number: draft.trade_registry_gazette_number || null,
        mersis_impact: draft.mersis_impact || null,
        tax_office_impact: draft.tax_office_impact || null,
        sgk_hazard_class_impact: draft.sgk_hazard_class_impact || null,
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
    <WizardShell title="Faaliyet Konusu Değişikliği" companyName={companyName} steps={steps} step={step} setStep={setStep} saving={saving} onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
        {step === 0 && <PrecheckStep context={context} warnings={warnings} blockingReasons={blockingReasons} />}
        {step === 0 && (
          <ReadonlyGrid title="Mevcut faaliyet konusu" fields={[
            ['Faaliyet Konusu Özeti', currentActivitySubject],
            ['Birincil NACE', formatNaceRow((context.nace_codes || []).find(row => row.is_primary))],
            ['SGK Tehlike Sınıfı', context.public_sgk?.risk_class || context.current?.risk_class],
          ]} />
        )}
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <TextareaField label="Yeni Faaliyet Konusu Metni" value={draft.new_activity_subject} onChange={value => setField('new_activity_subject', value)} error={fieldErrors.new_activity_subject} />
            <TextareaField label="Değişiklik Gerekçesi" value={draft.change_reason} onChange={value => setField('change_reason', value)} />
          </div>
        )}
        {step === 0 && (
          <div className="space-y-4">
            <SectionTitle title="NACE etkileri" description="Faaliyet konusu değişikliği tamamlandığında yeni NACE seti de resmi işlem kapsamında güncellenir." />
            <NaceSelectionEditor rows={draft.nace_codes} onChange={rows => setField('nace_codes', rows)} error={fieldErrors.nace_codes} />
          </div>
        )}
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Karar Tarihi" type="date" value={draft.decision_date} onChange={value => setField('decision_date', value)} error={fieldErrors.decision_date} required />
            <TextField label="Tescil Tarihi" type="date" value={draft.registration_date} onChange={value => setField('registration_date', value)} error={fieldErrors.registration_date} required />
            <TextField label="Ticaret Sicil Gazetesi Tarihi" type="date" value={draft.trade_registry_gazette_date} onChange={value => setField('trade_registry_gazette_date', value)} />
            <TextField label="Ticaret Sicil Gazetesi Sayısı" value={draft.trade_registry_gazette_number} onChange={value => setField('trade_registry_gazette_number', value)} />
            <TextareaField label="MERSİS Etkisi" value={draft.mersis_impact} onChange={value => setField('mersis_impact', value)} />
            <TextareaField label="Vergi Dairesi Etkisi" value={draft.tax_office_impact} onChange={value => setField('tax_office_impact', value)} />
            <TextareaField label="SGK Tehlike Sınıfı Etkisi" value={draft.sgk_hazard_class_impact} onChange={value => setField('sgk_hazard_class_impact', value)} />
            <TextareaField label="Açıklama / Not" value={draft.notes} onChange={value => setField('notes', value)} />
          </div>
        )}
        {step === 1 && (
          <DocumentsStep
            slots={documentSlots}
            documents={documents}
            setDocuments={setDocuments}
            documentMeta={documentMeta}
            setDocumentMeta={setDocumentMeta}
          />
        )}
        {step === 2 && (
          <div className="space-y-5">
            <ReadonlyGrid title="Değişiklik özeti" fields={[
              ['Faaliyet Konusu', `${currentActivitySubject || '-'} -> ${draft.new_activity_subject || '-'}`],
              ...naceChangeRows.map(row => [row.label, `${row.oldValue || '-'} -> ${row.newValue || '-'}`] as [string, string]),
            ]} />
            <ReadonlyGrid title="Karar ve tescil" fields={[
              ['Karar Tarihi', draft.decision_date],
              ['Tescil Tarihi', draft.registration_date],
              ['Ticaret Sicil Gazetesi', [draft.trade_registry_gazette_date, draft.trade_registry_gazette_number].filter(Boolean).join(' / ')],
              ['Belge Sayısı', String(activeDocumentCount)],
            ]} />
          </div>
        )}
      </div>
      {error && <WizardError message={error} />}
      <WizardFooter step={step} steps={steps} saving={saving} onClose={onClose} onBack={() => setStep(prev => Math.max(0, prev - 1))} onNext={nextStep} onComplete={complete} />
    </WizardShell>
  )
}

function buildNaceSummary(currentRows: NaceWizardRow[], nextRows: NaceWizardRow[]) {
  const current = normalizeInitialNaceRows(currentRows)
  const next = normalizeInitialNaceRows(nextRows)
  const currentPrimary = current.find(row => row.is_primary)
  const nextPrimary = next.find(row => row.is_primary)
  const currentSecondary = current.filter(row => !row.is_primary).map(row => String(row.nace_code || '')).sort().join(', ')
  const nextSecondary = next.filter(row => !row.is_primary).map(row => String(row.nace_code || '')).sort().join(', ')
  const rows: Array<{ label: string; oldValue: string; newValue: string }> = []
  if (formatNaceRow(currentPrimary) !== formatNaceRow(nextPrimary)) rows.push({ label: 'Birincil NACE', oldValue: formatNaceRow(currentPrimary), newValue: formatNaceRow(nextPrimary) })
  if (currentSecondary !== nextSecondary) rows.push({ label: 'İkincil NACE Kodları', oldValue: currentSecondary || '-', newValue: nextSecondary || '-' })
  return rows
}

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
