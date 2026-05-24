'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, Landmark, X } from 'lucide-react'
import { DocumentSlotUploader, type DocumentSlot, type SlotDocument } from './DocumentSlotUploader'
import { formControlClass } from './formControlStyles'
import { cn } from '@/lib/utils'

export type CapitalPartnerSnapshot = {
  id: string
  display_name: string
  owner_kind: string
  partner_type: string
  record_status: string
  status: string
  share_ratio: number
  voting_ratio: number
  profit_ratio: number
  committed_capital_amount: number
  paid_capital_amount: number
}

export type CapitalIncreasePrecheckContext = {
  ok: boolean
  message?: string
  reasons?: string[]
  total_share_ratio: number
  current_capital_amount: number
  paid_capital_amount: number
  unpaid_capital_amount: number
  active_partners: CapitalPartnerSnapshot[]
  draft_partners: CapitalPartnerSnapshot[]
}

type PartnerParticipationDraft = {
  partner_id: string
  increase_amount: string
  capital_source: CapitalSource | ''
  description: string
}

type NewPartnerDraft = {
  mode: 'existing_draft' | 'new_record'
  partner_id: string
  owner_kind: 'person' | 'organization'
  display_name: string
  identity_tax_number: string
}

type CapitalSource = 'Nakdi' | 'Ayni' | 'İç Kaynaklardan' | 'Ortak Alacağından'

export type CapitalIncreaseSubmitPayload = {
  increase_type: string
  transaction_date: string
  participants: Array<{
    partner_id: string
    increase_amount: number
    capital_source: CapitalSource | null
    description: string | null
  }>
  new_partner?: NewPartnerDraft | null
  new_partner_increase_amount?: number | null
  new_partner_capital_source?: CapitalSource | null
  notes?: string | null
  document_files: SlotDocument[]
  document_meta: Record<string, { document_date?: string | null; description?: string | null }>
}

const capitalIncreaseTypes = [
  'Nakdi sermaye taahhüdü ile artırım',
  'İç kaynaklardan sermaye artırımı',
  'Ortak alacağının sermayeye eklenmesi',
  'Ayni sermaye konulması',
  'Yeni ortak girişiyle sermaye artırımı',
  'Mevcut ortakların farklı oranlarda katılımıyla artırım',
  'Karma artırım',
  'Sermaye azaltımı ile eş zamanlı sermaye artırımı',
]

const sourceOptions: CapitalSource[] = ['Nakdi', 'Ayni', 'İç Kaynaklardan', 'Ortak Alacağından']

const documentSlots: DocumentSlot[] = [
  { id: 'board_resolution', title: 'Kurul Kararı', required: true },
  { id: 'financial_advisor_document', title: 'Mali Müşavir Belgesi', required: true },
  { id: 'registration_document', title: 'Tescil Belgesi', required: true },
  { id: 'trade_registry_gazette', title: 'Ticaret Sicili Gazetesi İlanı', required: true },
]

const stepLabels = ['Sermaye Artırım Türü', 'Ortak / Katılım Bilgileri', 'Belgeler', 'Önizleme ve Tamamlama']

export function CompanyCapitalIncreaseWizard({
  companyName,
  context,
  saving,
  onClose,
  onComplete,
}: {
  companyName: string
  context: CapitalIncreasePrecheckContext
  saving: boolean
  onClose: () => void
  onComplete: (payload: CapitalIncreaseSubmitPayload) => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [increaseType, setIncreaseType] = useState(capitalIncreaseTypes[0])
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<PartnerParticipationDraft[]>([])
  const [newPartner, setNewPartner] = useState<NewPartnerDraft>({
    mode: context.draft_partners.length ? 'existing_draft' : 'new_record',
    partner_id: '',
    owner_kind: 'person',
    display_name: '',
    identity_tax_number: '',
  })
  const [newPartnerAmount, setNewPartnerAmount] = useState('')
  const [newPartnerSource, setNewPartnerSource] = useState<CapitalSource | ''>('')
  const [notes, setNotes] = useState('')
  const [documents, setDocuments] = useState<SlotDocument[]>([])
  const [documentMeta, setDocumentMeta] = useState<Record<string, { document_date?: string; description?: string }>>({})
  const [error, setError] = useState<string | null>(null)

  const isNewPartnerIncrease = increaseType === 'Yeni ortak girişiyle sermaye artırımı'
  const currentCapital = context.current_capital_amount || 0

  useEffect(() => {
    setRows(context.active_partners.map(partner => ({
      partner_id: partner.id,
      increase_amount: '',
      capital_source: defaultSourceForType(increaseType),
      description: '',
    })))
  }, [context.active_partners, increaseType])

  const calculations = useMemo(() => {
    const activeRows = context.active_partners.map(partner => {
      const draft = rows.find(row => row.partner_id === partner.id)
      const increase = isNewPartnerIncrease ? 0 : toNumber(draft?.increase_amount)
      return {
        partner,
        draft,
        increase_amount: increase,
        new_committed_capital_amount: roundMoney(partner.committed_capital_amount + increase),
      }
    })
    const newPartnerIncrease = isNewPartnerIncrease ? toNumber(newPartnerAmount) : 0
    const totalIncrease = roundMoney(activeRows.reduce((sum, row) => sum + row.increase_amount, 0) + newPartnerIncrease)
    const newCapital = roundMoney(currentCapital + totalIncrease)
    const participants = activeRows.map(row => ({
      ...row,
      old_share_ratio: row.partner.share_ratio,
      new_share_ratio: newCapital > 0 ? roundRatio((row.new_committed_capital_amount / newCapital) * 100) : 0,
    }))
    const newPartnerPreview = isNewPartnerIncrease && newPartnerIncrease > 0
      ? {
          display_name: selectedNewPartnerName(context.draft_partners, newPartner) || 'Yeni ortak',
          increase_amount: newPartnerIncrease,
          new_committed_capital_amount: newPartnerIncrease,
          old_share_ratio: 0,
          new_share_ratio: newCapital > 0 ? roundRatio((newPartnerIncrease / newCapital) * 100) : 0,
          capital_source: newPartnerSource || null,
        }
      : null
    const totalShare = roundRatio(participants.reduce((sum, row) => sum + row.new_share_ratio, 0) + (newPartnerPreview?.new_share_ratio || 0))

    return {
      participants,
      newPartnerPreview,
      totalIncrease,
      newCapital,
      totalShare,
    }
  }, [context.active_partners, context.draft_partners, currentCapital, isNewPartnerIncrease, newPartner, newPartnerAmount, newPartnerSource, rows])

  const requiredDocumentsReady = documentSlots.every(slot => !slot.required || documents.some(document => document.slotId === slot.id && isActiveDocument(document)))

  const validateCurrentStep = (targetStep = step) => {
    if (targetStep >= 0 && !increaseType) return 'Sermaye artırım türü seçilmelidir.'
    if (targetStep >= 1) {
      if (calculations.totalIncrease <= 0) return 'Sermaye artırım tutarı 0’dan büyük olmalıdır.'
      if (isNewPartnerIncrease) {
        if (newPartner.mode === 'existing_draft' && !newPartner.partner_id) return 'Eklenecek taslak ortak seçilmelidir.'
        if (newPartner.mode === 'new_record' && !newPartner.display_name.trim()) return 'Yeni ortak adı / ünvanı girilmelidir.'
        if (!newPartnerSource) return 'Artırım kaynağı seçilmelidir.'
      } else {
        const missingSource = rows.some(row => toNumber(row.increase_amount) > 0 && !row.capital_source)
        if (missingSource) return 'Artırım tutarı girilen her ortak için artırım kaynağı seçilmelidir.'
      }
      if (Math.abs(calculations.totalShare - 100) > 0.05) return 'Yeni hisse oranları toplamı %100 olmalıdır.'
    }
    if (targetStep >= 2 && !requiredDocumentsReady) return 'Zorunlu belgeler yüklenmeden işlem tamamlanamaz.'
    return null
  }

  const nextStep = () => {
    const validationError = validateCurrentStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setStep(prev => Math.min(prev + 1, stepLabels.length - 1))
  }

  const complete = async () => {
    const validationError = validateCurrentStep(3)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    await onComplete({
      increase_type: increaseType,
      transaction_date: transactionDate,
      participants: rows.map(row => ({
        partner_id: row.partner_id,
        increase_amount: toNumber(row.increase_amount),
        capital_source: row.capital_source || null,
        description: row.description || null,
      })),
      new_partner: isNewPartnerIncrease ? newPartner : null,
      new_partner_increase_amount: isNewPartnerIncrease ? toNumber(newPartnerAmount) : null,
      new_partner_capital_source: isNewPartnerIncrease ? newPartnerSource || null : null,
      notes: notes || null,
      document_files: documents,
      document_meta: documentMeta,
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sermaye Artırımı</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{companyName}</p>
          </div>
          <button type="button" aria-label="Sermaye artırımı penceresini kapat" onClick={onClose} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <div className="grid gap-2 md:grid-cols-4">
            {stepLabels.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => index <= step && setStep(index)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium',
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

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {step === 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {capitalIncreaseTypes.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setIncreaseType(type)
                    setError(null)
                  }}
                  className={cn(
                    'rounded-lg border p-4 text-left transition',
                    increaseType === type
                      ? 'border-blue-400 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Landmark size={16} />
                    <span className="font-semibold">{type}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                Bu işlem ödeme kaydı oluşturmaz. Ortakların taahhüt edilen sermaye tutarları güncellenir. Ödemeler daha sonra Muhasebe sekmesinden işlenecektir.
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  İşlem Tarihi
                  <input type="date" value={transactionDate} onChange={event => setTransactionDate(event.target.value)} className={formControlClass({ className: 'mt-1' })} />
                </label>
                <CapitalMetric label="Mevcut Sermaye" value={formatCurrency(currentCapital)} />
                <CapitalMetric label="Yeni Sermaye" value={formatCurrency(calculations.newCapital)} />
              </div>

              {isNewPartnerIncrease ? (
                <NewPartnerStep
                  draftPartners={context.draft_partners}
                  newPartner={newPartner}
                  setNewPartner={setNewPartner}
                  amount={newPartnerAmount}
                  setAmount={setNewPartnerAmount}
                  source={newPartnerSource}
                  setSource={setNewPartnerSource}
                  notes={notes}
                  setNotes={setNotes}
                />
              ) : (
                <ExistingPartnersStep
                  partners={context.active_partners}
                  rows={rows}
                  setRows={setRows}
                  calculations={calculations}
                />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <DocumentSlotUploader
                slots={documentSlots}
                documents={documents}
                onChange={setDocuments}
                allowExtraSlots={false}
                mode="update"
                defaultTab="upload"
              />
              <div className="space-y-3">
                {documentSlots.map(slot => (
                  <div key={slot.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      <FileText size={15} />
                      {slot.title}
                    </div>
                    <label className="mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Belge Tarihi
                      <input
                        type="date"
                        value={documentMeta[slot.id]?.document_date || ''}
                        onChange={event => setDocumentMeta(prev => ({ ...prev, [slot.id]: { ...prev[slot.id], document_date: event.target.value } }))}
                        className={formControlClass({ size: 'sm', className: 'mt-1' })}
                      />
                    </label>
                    <label className="mt-2 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Açıklama
                      <input
                        value={documentMeta[slot.id]?.description || ''}
                        onChange={event => setDocumentMeta(prev => ({ ...prev, [slot.id]: { ...prev[slot.id], description: event.target.value } }))}
                        className={formControlClass({ size: 'sm', className: 'mt-1' })}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <PreviewStep
              increaseType={increaseType}
              currentCapital={currentCapital}
              calculations={calculations}
              documents={documents}
              newPartnerName={selectedNewPartnerName(context.draft_partners, newPartner)}
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
            Toplam artırım: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(calculations.totalIncrease)}</span>
            <span className="mx-2">•</span>
            Yeni hisse toplamı: <span className="font-semibold text-gray-900 dark:text-white">%{formatNumber(calculations.totalShare)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
              Vazgeç
            </button>
            {step > 0 && (
              <button type="button" onClick={() => setStep(prev => Math.max(0, prev - 1))} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
                Geri
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={nextStep} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
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

function NewPartnerStep({
  draftPartners,
  newPartner,
  setNewPartner,
  amount,
  setAmount,
  source,
  setSource,
  notes,
  setNotes,
}: {
  draftPartners: CapitalPartnerSnapshot[]
  newPartner: NewPartnerDraft
  setNewPartner: (value: NewPartnerDraft) => void
  amount: string
  setAmount: (value: string) => void
  source: CapitalSource | ''
  setSource: (value: CapitalSource | '') => void
  notes: string
  setNotes: (value: string) => void
}) {
  const update = (patch: Partial<NewPartnerDraft>) => setNewPartner({ ...newPartner, ...patch })

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800 lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => update({ mode: 'existing_draft' })} disabled={!draftPartners.length} className={toggleClass(newPartner.mode === 'existing_draft')}>
            Mevcut Taslak Ortak
          </button>
          <button type="button" onClick={() => update({ mode: 'new_record', partner_id: '' })} className={toggleClass(newPartner.mode === 'new_record')}>
            Yeni Kayıt
          </button>
        </div>

        {newPartner.mode === 'existing_draft' ? (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Eklenecek Ortak
            <select value={newPartner.partner_id} onChange={event => update({ partner_id: event.target.value })} className={formControlClass({ className: 'mt-1' })}>
              <option value="">Seçiniz</option>
              {draftPartners.map(partner => (
                <option key={partner.id} value={partner.id}>{partner.display_name}</option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Gerçek / Tüzel Kişi
              <select value={newPartner.owner_kind} onChange={event => update({ owner_kind: event.target.value as NewPartnerDraft['owner_kind'] })} className={formControlClass({ className: 'mt-1' })}>
                <option value="person">Gerçek Kişi</option>
                <option value="organization">Tüzel Kişi</option>
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Ortak Adı / Ünvanı
              <input value={newPartner.display_name} onChange={event => update({ display_name: event.target.value })} className={formControlClass({ className: 'mt-1' })} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200 sm:col-span-2">
              TCKN / VKN
              <input value={newPartner.identity_tax_number} onChange={event => update({ identity_tax_number: event.target.value })} className={formControlClass({ className: 'mt-1' })} />
            </label>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Artırılacak Sermaye Tutarı
            <input type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className={formControlClass({ className: 'mt-1' })} />
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Artırım Kaynağı
            <select value={source} onChange={event => setSource(event.target.value as CapitalSource | '')} className={formControlClass({ className: 'mt-1' })}>
              <option value="">Seçiniz</option>
              {sourceOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Açıklama
          <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} className={formControlClass({ className: 'mt-1' })} />
        </label>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
        <div className="font-semibold text-gray-900 dark:text-white">Ortak Kayıt Durumu</div>
        <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {newPartner.mode === 'existing_draft' ? 'Taslak ortak tamamla aşamasında aktifleşir.' : 'Yeni ortak tamamla aşamasında oluşturulur.'}
        </div>
      </div>
    </div>
  )
}

function ExistingPartnersStep({
  partners,
  rows,
  setRows,
  calculations,
}: {
  partners: CapitalPartnerSnapshot[]
  rows: PartnerParticipationDraft[]
  setRows: (rows: PartnerParticipationDraft[]) => void
  calculations: ReturnType<typeof capitalCalculationShape>
}) {
  const updateRow = (partnerId: string, patch: Partial<PartnerParticipationDraft>) => {
    setRows(rows.map(row => row.partner_id === partnerId ? { ...row, ...patch } : row))
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="max-h-[430px] overflow-auto">
        <table className="min-w-[1120px] divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2">Ortak adı</th>
              <th className="px-3 py-2">Ortak tipi</th>
              <th className="px-3 py-2">Mevcut taahhüt</th>
              <th className="px-3 py-2">Mevcut ödenen</th>
              <th className="px-3 py-2">Mevcut hisse</th>
              <th className="px-3 py-2">Katılacağı tutar</th>
              <th className="px-3 py-2">Artırım kaynağı</th>
              <th className="px-3 py-2">Yeni taahhüt</th>
              <th className="px-3 py-2">Yeni hisse</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {partners.map(partner => {
              const row = rows.find(item => item.partner_id === partner.id)
              const calculated = calculations.participants.find(item => item.partner.id === partner.id)
              return (
                <tr key={partner.id}>
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{partner.display_name}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{partner.owner_kind === 'organization' ? 'Tüzel Kişi' : 'Gerçek Kişi'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatCurrency(partner.committed_capital_amount)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatCurrency(partner.paid_capital_amount)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">%{formatNumber(partner.share_ratio)}</td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="0.01" value={row?.increase_amount || ''} onChange={event => updateRow(partner.id, { increase_amount: event.target.value })} className={formControlClass({ size: 'sm', className: 'min-w-[130px]' })} />
                  </td>
                  <td className="px-3 py-2">
                    <select value={row?.capital_source || ''} onChange={event => updateRow(partner.id, { capital_source: event.target.value as CapitalSource | '' })} className={formControlClass({ size: 'sm', className: 'min-w-[150px]' })}>
                      <option value="">Seçiniz</option>
                      {sourceOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{formatCurrency(calculated?.new_committed_capital_amount || partner.committed_capital_amount)}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">%{formatNumber(calculated?.new_share_ratio || 0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PreviewStep({
  increaseType,
  currentCapital,
  calculations,
  documents,
  newPartnerName,
}: {
  increaseType: string
  currentCapital: number
  calculations: ReturnType<typeof capitalCalculationShape>
  documents: SlotDocument[]
  newPartnerName: string
}) {
  const rows = [
    ...calculations.participants.map(row => ({
      key: row.partner.id,
      name: row.partner.display_name,
      oldCommitted: row.partner.committed_capital_amount,
      increase: row.increase_amount,
      newCommitted: row.new_committed_capital_amount,
      oldShare: row.old_share_ratio,
      newShare: row.new_share_ratio,
    })),
    ...(calculations.newPartnerPreview ? [{
      key: 'new_partner',
      name: calculations.newPartnerPreview.display_name || newPartnerName || 'Yeni ortak',
      oldCommitted: 0,
      increase: calculations.newPartnerPreview.increase_amount,
      newCommitted: calculations.newPartnerPreview.new_committed_capital_amount,
      oldShare: 0,
      newShare: calculations.newPartnerPreview.new_share_ratio,
    }] : []),
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <CapitalMetric label="Mevcut Sermaye" value={formatCurrency(currentCapital)} />
        <CapitalMetric label="Artırım Tutarı" value={formatCurrency(calculations.totalIncrease)} />
        <CapitalMetric label="Yeni Sermaye" value={formatCurrency(calculations.newCapital)} />
        <CapitalMetric label="Artırım Türü" value={increaseType} />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        Bu işlem tamamlandığında şirketin sermaye tutarı ve ortakların taahhüt edilen sermaye bilgileri güncellenecek, eski ortaklık yapısı geçmişe alınacaktır. Ödenen sermaye bilgileri bu işlemle değiştirilmeyecektir.
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2">Ortak</th>
              <th className="px-3 py-2">Eski taahhüt</th>
              <th className="px-3 py-2">Katılım</th>
              <th className="px-3 py-2">Yeni taahhüt</th>
              <th className="px-3 py-2">Eski hisse</th>
              <th className="px-3 py-2">Yeni hisse</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map(row => (
              <tr key={row.key}>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.name}</td>
                <td className="px-3 py-2">{formatCurrency(row.oldCommitted)}</td>
                <td className="px-3 py-2">{formatCurrency(row.increase)}</td>
                <td className="px-3 py-2">{formatCurrency(row.newCommitted)}</td>
                <td className="px-3 py-2">%{formatNumber(row.oldShare)}</td>
                <td className="px-3 py-2 font-semibold">%{formatNumber(row.newShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <CheckCircle2 size={16} />
          Yüklenen Belgeler
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
    </div>
  )
}

function CapitalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}

function capitalCalculationShape() {
  return {
    participants: [] as Array<{
      partner: CapitalPartnerSnapshot
      draft?: PartnerParticipationDraft
      increase_amount: number
      new_committed_capital_amount: number
      old_share_ratio: number
      new_share_ratio: number
    }>,
    newPartnerPreview: null as null | {
      display_name: string
      increase_amount: number
      new_committed_capital_amount: number
      old_share_ratio: number
      new_share_ratio: number
      capital_source: CapitalSource | null
    },
    totalIncrease: 0,
    newCapital: 0,
    totalShare: 0,
  }
}

function selectedNewPartnerName(draftPartners: CapitalPartnerSnapshot[], newPartner: NewPartnerDraft) {
  if (newPartner.mode === 'existing_draft') {
    return draftPartners.find(partner => partner.id === newPartner.partner_id)?.display_name || ''
  }
  return newPartner.display_name.trim()
}

function defaultSourceForType(type: string): CapitalSource | '' {
  if (type.startsWith('Nakdi')) return 'Nakdi'
  if (type.startsWith('İç kaynak')) return 'İç Kaynaklardan'
  if (type.startsWith('Ortak alacağı')) return 'Ortak Alacağından'
  if (type.startsWith('Ayni')) return 'Ayni'
  return ''
}

function toggleClass(active: boolean) {
  return cn(
    'rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
    active
      ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900'
  )
}

function isActiveDocument(document: SlotDocument) {
  return document.status !== 'deleted' && document.status !== 'archived' && Boolean(document.storagePath || document.documentId || document.url || document.previewUrl)
}

function toNumber(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return 0
  const number = Number(text)
  return Number.isFinite(number) ? number : 0
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundRatio(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000
}

function formatCurrency(value: unknown) {
  return toNumber(value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 })
}

function formatNumber(value: unknown) {
  return toNumber(value).toLocaleString('tr-TR', { maximumFractionDigits: 4 })
}
