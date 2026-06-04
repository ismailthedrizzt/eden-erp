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
  warnings?: string[]
  blocking_reasons?: string[]
  is_company_active?: boolean
  company_status?: string
  record_status?: string
  has_full_share_distribution?: boolean
  total_share_ratio: number
  current_capital_amount: number
  paid_capital_amount: number
  unpaid_capital_amount: number
  active_partners: CapitalPartnerSnapshot[]
  draft_partners: CapitalPartnerSnapshot[]
  current_ownership_distribution?: CapitalPartnerSnapshot[]
}

type DistributionMethod = 'proportional' | 'manual'
type CapitalSource = 'Nakdi' | 'Ayni' | 'İç Kaynaklardan' | 'Ortak Alacağından'

type PartnerDistributionDraft = {
  partner_id: string
  new_committed_capital_amount: string
  new_share_ratio: string
  capital_source: CapitalSource | ''
  description: string
}

export type CapitalIncreaseSubmitPayload = {
  client_request_id: string
  increase_type: string
  transaction_date: string
  effective_date: string
  registration_date: string
  old_capital_amount: number
  increase_amount: number
  new_capital_amount: number
  currency: string
  increase_reason: string
  distribution_method: DistributionMethod
  participants: Array<{
    partner_id: string
    old_committed_capital_amount: number
    increase_amount: number
    new_committed_capital_amount: number
    old_share_ratio: number
    new_share_ratio: number
    old_voting_ratio: number
    new_voting_ratio: number
    old_profit_ratio: number
    new_profit_ratio: number
    capital_source: CapitalSource | null
    description: string | null
  }>
  notes?: string | null
  document_files: SlotDocument[]
  document_meta: Record<string, { document_date?: string | null; description?: string | null }>
}

const capitalIncreaseTypes = [
  'Nakdi sermaye taahhüdü ile artırım',
  'İç kaynaklardan sermaye artırımı',
  'Ortak alacağının sermayeye eklenmesi',
  'Ayni sermaye konulması',
  'Mevcut ortakların farklı oranlarda katılımıyla artırım',
  'Karma artırım',
]

const capitalIncreaseReasons = [
  'Büyüme ve yatırım finansmanı',
  'İşletme sermayesi ihtiyacı',
  'Ortak alacağının sermayeye eklenmesi',
  'İç kaynakların sermayeye eklenmesi',
  'Yasal / sözleşmesel zorunluluk',
  'Diğer',
]

const sourceOptions: CapitalSource[] = ['Nakdi', 'Ayni', 'İç Kaynaklardan', 'Ortak Alacağından']

const documentSlots: DocumentSlot[] = [
  { id: 'board_resolution', title: 'Kurul / Genel Kurul Kararı', required: false },
  { id: 'financial_advisor_document', title: 'Mali Müşavir / YMM Raporu', required: false },
  { id: 'registration_document', title: 'Tescil Belgesi', required: false },
  { id: 'trade_registry_gazette', title: 'Ticaret Sicili Gazetesi İlanı', required: false },
]

const stepLabels = ['Bilgiler', 'Belgeler', 'Ön İzleme/Onay']

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
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [registrationDate, setRegistrationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [oldCapitalAmount, setOldCapitalAmount] = useState(String(context.current_capital_amount || 0))
  const [increaseAmount, setIncreaseAmount] = useState('')
  const [newCapitalAmount, setNewCapitalAmount] = useState(String(context.current_capital_amount || 0))
  const [currency, setCurrency] = useState('TRY')
  const [increaseReason, setIncreaseReason] = useState(capitalIncreaseReasons[0])
  const [distributionMethod, setDistributionMethod] = useState<DistributionMethod>('proportional')
  const [rows, setRows] = useState<PartnerDistributionDraft[]>([])
  const [notes, setNotes] = useState('')
  const [documents, setDocuments] = useState<SlotDocument[]>([])
  const [documentMeta, setDocumentMeta] = useState<Record<string, { document_date?: string; description?: string }>>({})
  const [error, setError] = useState<string | null>(null)
  const [clientRequestId] = useState(() => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    return `capital-increase:${randomId}`
  })

  const partners = context.current_ownership_distribution?.length
    ? context.current_ownership_distribution
    : context.active_partners
  const oldCapital = toNumber(oldCapitalAmount)
  const increase = toNumber(increaseAmount)
  const newCapital = toNumber(newCapitalAmount)
  const precheckWarnings = Array.from(new Set([...(context.warnings || []), ...(context.reasons || [])]))
  const blockingReasons = context.blocking_reasons || (!context.ok && context.message ? [context.message] : [])

  useEffect(() => {
    const nextCapital = roundMoney(toNumber(oldCapitalAmount) + toNumber(increaseAmount))
    setNewCapitalAmount(nextCapital > 0 ? String(nextCapital) : '')
  }, [increaseAmount, oldCapitalAmount])

  useEffect(() => {
    setRows(buildDistributionDraftRows(partners, toNumber(oldCapitalAmount), toNumber(newCapitalAmount), distributionMethod, rows))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distributionMethod, newCapitalAmount, oldCapitalAmount, partners])

  const calculations = useMemo(() => {
    const participantRows = partners.map(partner => {
      const draft = rows.find(row => row.partner_id === partner.id)
      const oldCommitted = roundMoney(partner.committed_capital_amount || (oldCapital * partner.share_ratio / 100))
      const newCommitted = roundMoney(toNumber(draft?.new_committed_capital_amount))
      const newShare = newCapital > 0 ? roundRatio((newCommitted / newCapital) * 100) : toNumber(draft?.new_share_ratio)
      const oldShare = roundRatio(partner.share_ratio || (oldCapital > 0 ? (oldCommitted / oldCapital) * 100 : 0))
      const increaseForPartner = roundMoney(newCommitted - oldCommitted)

      return {
        partner,
        draft,
        old_committed_capital_amount: oldCommitted,
        increase_amount: increaseForPartner,
        new_committed_capital_amount: newCommitted,
        old_share_ratio: oldShare,
        new_share_ratio: newShare,
        old_voting_ratio: roundRatio(partner.voting_ratio || oldShare),
        new_voting_ratio: newShare,
        old_profit_ratio: roundRatio(partner.profit_ratio || oldShare),
        new_profit_ratio: newShare,
      }
    })

    return {
      participants: participantRows,
      totalNewCommitted: roundMoney(participantRows.reduce((sum, row) => sum + row.new_committed_capital_amount, 0)),
      totalIncrease: roundMoney(participantRows.reduce((sum, row) => sum + row.increase_amount, 0)),
      totalShare: roundRatio(participantRows.reduce((sum, row) => sum + row.new_share_ratio, 0)),
    }
  }, [newCapital, oldCapital, partners, rows])

  const validateCurrentStep = (targetStep = step) => {
    if (targetStep >= 0 && (!context.ok || blockingReasons.length)) {
      return blockingReasons[0] || 'Sermaye artırımı bu şirket için başlatılamaz.'
    }
    if (targetStep >= 1) {
      if (!transactionDate) return 'İşlem tarihi zorunludur.'
      if (!effectiveDate) return 'Yürürlük / tescil tarihi zorunludur.'
      if (oldCapital <= 0) return 'Eski sermaye 0’dan büyük olmalıdır.'
      if (increase <= 0) return 'Artırılacak tutar 0’dan büyük olmalıdır.'
      if (newCapital <= oldCapital) return 'Yeni sermaye eski sermayeden büyük olmalıdır.'
      if (Math.abs(newCapital - (oldCapital + increase)) > 0.05) return 'Yeni sermaye, eski sermaye ve artırılacak tutar ile uyumlu olmalıdır.'
      if (!currency) return 'Para birimi seçilmelidir.'
      if (!increaseReason) return 'Artırım nedeni seçilmelidir.'
    }
    if (targetStep >= 2) {
      if (!partners.length) return 'Sermaye dağıtımı yapılacak aktif ortak bulunamadı.'
      if (Math.abs(calculations.totalNewCommitted - newCapital) > 0.05) return 'Manuel dağıtımda toplam sermaye yeni sermayeye eşit olmalıdır.'
      if (Math.abs(calculations.totalShare - 100) > 0.05) return 'Manuel dağıtımda toplam pay oranı %100 olmalıdır.'
      const negative = calculations.participants.find(row => row.new_committed_capital_amount < row.old_committed_capital_amount)
      if (negative) return 'Sermaye artırımı mevcut ortak sermayesini azaltamaz. Azaltım ayrı operasyonla yapılmalıdır.'
      const missingSource = rows.some(row => {
        const participant = calculations.participants.find(item => item.partner.id === row.partner_id)
        return participant && participant.increase_amount > 0 && !row.capital_source
      })
      if (missingSource) return 'Artırım yapılan her ortak için kaynak seçilmelidir.'
    }
    return null
  }

  const nextStep = () => {
    const validationTarget = step === 0 ? 2 : step === 1 ? 3 : step
    const validationError = validateCurrentStep(validationTarget)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setStep(prev => Math.min(prev + 1, stepLabels.length - 1))
  }

  const complete = async () => {
    const validationError = validateCurrentStep(4)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    await onComplete({
      client_request_id: clientRequestId,
      increase_type: increaseType,
      transaction_date: transactionDate,
      effective_date: effectiveDate,
      registration_date: registrationDate || effectiveDate,
      old_capital_amount: oldCapital,
      increase_amount: increase,
      new_capital_amount: newCapital,
      currency,
      increase_reason: increaseReason,
      distribution_method: distributionMethod,
      participants: calculations.participants.map(row => ({
        partner_id: row.partner.id,
        old_committed_capital_amount: row.old_committed_capital_amount,
        increase_amount: row.increase_amount,
        new_committed_capital_amount: row.new_committed_capital_amount,
        old_share_ratio: row.old_share_ratio,
        new_share_ratio: row.new_share_ratio,
        old_voting_ratio: row.old_voting_ratio,
        new_voting_ratio: row.new_voting_ratio,
        old_profit_ratio: row.old_profit_ratio,
        new_profit_ratio: row.new_profit_ratio,
        capital_source: row.draft?.capital_source || null,
        description: row.draft?.description || null,
      })),
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
          <div className="grid gap-2 md:grid-cols-3">
            {stepLabels.map((label, index) => (
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

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {step === 0 && (
            <PrecheckStep context={context} warnings={precheckWarnings} blockingReasons={blockingReasons} />
          )}

          {step === 0 && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  İşlem Tarihi
                  <input type="date" value={transactionDate} onChange={event => setTransactionDate(event.target.value)} className={formControlClass({ className: 'mt-1' })} />
                </label>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Yürürlük / Tescil Tarihi
                  <input type="date" value={effectiveDate} onChange={event => {
                    setEffectiveDate(event.target.value)
                    setRegistrationDate(event.target.value)
                  }} className={formControlClass({ className: 'mt-1' })} />
                </label>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Ticaret Sicili Tescil Tarihi
                  <input type="date" value={registrationDate} onChange={event => setRegistrationDate(event.target.value)} className={formControlClass({ className: 'mt-1' })} />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Eski Sermaye
                  <input type="number" min="0" step="0.01" value={oldCapitalAmount} readOnly className={formControlClass({ className: 'mt-1 bg-gray-50 dark:bg-gray-900' })} />
                </label>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Artırılacak Tutar
                  <input type="number" min="0" step="0.01" value={increaseAmount} onChange={event => setIncreaseAmount(event.target.value)} className={formControlClass({ className: 'mt-1' })} />
                </label>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Yeni Sermaye
                  <input type="number" min="0" step="0.01" value={newCapitalAmount} onChange={event => setNewCapitalAmount(event.target.value)} className={formControlClass({ className: 'mt-1' })} />
                </label>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Para Birimi
                  <select value={currency} onChange={event => setCurrency(event.target.value)} className={formControlClass({ className: 'mt-1' })}>
                    {['TRY', 'USD', 'EUR', 'GBP'].map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Artırım Türü
                  <select value={increaseType} onChange={event => setIncreaseType(event.target.value)} className={formControlClass({ className: 'mt-1' })}>
                    {capitalIncreaseTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Artırım Nedeni
                  <select value={increaseReason} onChange={event => setIncreaseReason(event.target.value)} className={formControlClass({ className: 'mt-1' })}>
                    {capitalIncreaseReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Açıklama / Not
                <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} className={formControlClass({ className: 'mt-1' })} />
              </label>
            </div>
          )}

          {step === 0 && (
            <DistributionStep
              partners={partners}
              rows={rows}
              setRows={setRows}
              calculations={calculations}
              distributionMethod={distributionMethod}
              setDistributionMethod={setDistributionMethod}
              currency={currency}
            />
          )}

          {step === 1 && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <DocumentSlotUploader
                slots={documentSlots}
                documents={documents}
                onChange={setDocuments}
                allowExtraSlots
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

          {step === 2 && (
            <PreviewStep
              increaseType={increaseType}
              oldCapital={oldCapital}
              increase={increase}
              newCapital={newCapital}
              currency={currency}
              calculations={calculations}
              documents={documents}
              distributionMethod={distributionMethod}
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
            Toplam yeni sermaye: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(calculations.totalNewCommitted, currency)}</span>
            <span className="mx-2">-</span>
            Toplam pay: <span className="font-semibold text-gray-900 dark:text-white">%{formatNumber(calculations.totalShare)}</span>
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
            {step < stepLabels.length - 1 ? (
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

function PrecheckStep({
  context,
  warnings,
  blockingReasons,
}: {
  context: CapitalIncreasePrecheckContext
  warnings: string[]
  blockingReasons: string[]
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <CapitalMetric label="Şirket Durumu" value={context.is_company_active ? 'Aktif' : (context.company_status || context.record_status || 'Kontrol edilemedi')} />
        <CapitalMetric label="Taahhüt Edilen Sermaye" value={formatCurrency(context.current_capital_amount)} />
        <CapitalMetric label="Ödenmiş Sermaye" value={formatCurrency(context.paid_capital_amount)} />
        <CapitalMetric label="Pay Toplamı" value={`%${formatNumber(context.total_share_ratio)}`} />
      </div>

      {blockingReasons.length ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          <div className="font-semibold">İşlem başlatılamaz</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {blockingReasons.map(reason => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          Ön kontrol tamamlandı. Sermaye artırımı aktif şirket kartı üzerinden resmi operasyon olarak başlatılabilir.
        </div>
      )}

      {warnings.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="font-semibold">Dikkat edilmesi gerekenler</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map(warning => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2">Ortak</th>
              <th className="px-3 py-2">Pay</th>
              <th className="px-3 py-2">Taahhüt</th>
              <th className="px-3 py-2">Ödenen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {context.active_partners.map(partner => (
              <tr key={partner.id}>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{partner.display_name}</td>
                <td className="px-3 py-2">%{formatNumber(partner.share_ratio)}</td>
                <td className="px-3 py-2">{formatCurrency(partner.committed_capital_amount)}</td>
                <td className="px-3 py-2">{formatCurrency(partner.paid_capital_amount)}</td>
              </tr>
            ))}
            {!context.active_partners.length && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">Aktif ortak bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DistributionStep({
  partners,
  rows,
  setRows,
  calculations,
  distributionMethod,
  setDistributionMethod,
  currency,
}: {
  partners: CapitalPartnerSnapshot[]
  rows: PartnerDistributionDraft[]
  setRows: (rows: PartnerDistributionDraft[]) => void
  calculations: ReturnType<typeof calculateShape>
  distributionMethod: DistributionMethod
  setDistributionMethod: (value: DistributionMethod) => void
  currency: string
}) {
  const updateRow = (partnerId: string, patch: Partial<PartnerDistributionDraft>) => {
    setRows(rows.map(row => row.partner_id === partnerId ? { ...row, ...patch } : row))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setDistributionMethod('proportional')} className={toggleClass(distributionMethod === 'proportional')}>
          Mevcut oranlara göre otomatik dağıt
        </button>
        <button type="button" onClick={() => setDistributionMethod('manual')} className={toggleClass(distributionMethod === 'manual')}>
          Manuel ortak bazlı dağıtım
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="max-h-[430px] overflow-auto">
          <table className="min-w-[1120px] divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2">Ortak</th>
                <th className="px-3 py-2">Mevcut Sermaye</th>
                <th className="px-3 py-2">Mevcut Pay</th>
                <th className="px-3 py-2">Yeni Sermaye</th>
                <th className="px-3 py-2">Artış</th>
                <th className="px-3 py-2">Yeni Pay</th>
                <th className="px-3 py-2">Kaynak</th>
                <th className="px-3 py-2">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {partners.map(partner => {
                const row = rows.find(item => item.partner_id === partner.id)
                const calculated = calculations.participants.find(item => item.partner.id === partner.id)
                return (
                  <tr key={partner.id}>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{partner.display_name}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatCurrency(calculated?.old_committed_capital_amount || partner.committed_capital_amount, currency)}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">%{formatNumber(calculated?.old_share_ratio || partner.share_ratio)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row?.new_committed_capital_amount || ''}
                        readOnly={distributionMethod === 'proportional'}
                        onChange={event => updateRow(partner.id, { new_committed_capital_amount: event.target.value })}
                        className={formControlClass({ size: 'sm', className: 'min-w-[130px]' })}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{formatCurrency(calculated?.increase_amount || 0, currency)}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">%{formatNumber(calculated?.new_share_ratio || 0)}</td>
                    <td className="px-3 py-2">
                      <select value={row?.capital_source || ''} onChange={event => updateRow(partner.id, { capital_source: event.target.value as CapitalSource | '' })} className={formControlClass({ size: 'sm', className: 'min-w-[150px]' })}>
                        <option value="">Seçiniz</option>
                        {sourceOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input value={row?.description || ''} onChange={event => updateRow(partner.id, { description: event.target.value })} className={formControlClass({ size: 'sm', className: 'min-w-[180px]' })} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <CapitalMetric label="Dağıtılan Yeni Sermaye" value={formatCurrency(calculations.totalNewCommitted, currency)} />
        <CapitalMetric label="Toplam Pay" value={`%${formatNumber(calculations.totalShare)}`} />
        <CapitalMetric label="Toplam Artış" value={formatCurrency(calculations.totalIncrease, currency)} />
      </div>
    </div>
  )
}

function PreviewStep({
  increaseType,
  oldCapital,
  increase,
  newCapital,
  currency,
  calculations,
  documents,
  distributionMethod,
}: {
  increaseType: string
  oldCapital: number
  increase: number
  newCapital: number
  currency: string
  calculations: ReturnType<typeof calculateShape>
  documents: SlotDocument[]
  distributionMethod: DistributionMethod
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <CapitalMetric label="Eski Sermaye" value={formatCurrency(oldCapital, currency)} />
        <CapitalMetric label="Artırılacak Tutar" value={formatCurrency(increase, currency)} />
        <CapitalMetric label="Yeni Sermaye" value={formatCurrency(newCapital, currency)} />
        <CapitalMetric label="Dağıtım" value={distributionMethod === 'proportional' ? 'Mevcut oranlara göre' : 'Manuel dağıtım'} />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        Bu işlem tamamlandığında şirketin taahhüt edilen sermayesi güncellenir ve ortaklık dağılımı ownership transaction kayıtları üzerinden yeniden hesaplanır.
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2">Ortak</th>
              <th className="px-3 py-2">Eski Sermaye</th>
              <th className="px-3 py-2">Artış</th>
              <th className="px-3 py-2">Yeni Sermaye</th>
              <th className="px-3 py-2">Eski Pay</th>
              <th className="px-3 py-2">Yeni Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {calculations.participants.map(row => (
              <tr key={row.partner.id}>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.partner.display_name}</td>
                <td className="px-3 py-2">{formatCurrency(row.old_committed_capital_amount, currency)}</td>
                <td className="px-3 py-2">{formatCurrency(row.increase_amount, currency)}</td>
                <td className="px-3 py-2">{formatCurrency(row.new_committed_capital_amount, currency)}</td>
                <td className="px-3 py-2">%{formatNumber(row.old_share_ratio)}</td>
                <td className="px-3 py-2 font-semibold">%{formatNumber(row.new_share_ratio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <CheckCircle2 size={16} />
          Yüklenecek Belgeler
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

      <CapitalMetric label="Artırım Türü" value={increaseType} />
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

function calculateShape() {
  return {
    participants: [] as Array<{
      partner: CapitalPartnerSnapshot
      draft?: PartnerDistributionDraft
      old_committed_capital_amount: number
      increase_amount: number
      new_committed_capital_amount: number
      old_share_ratio: number
      new_share_ratio: number
      old_voting_ratio: number
      new_voting_ratio: number
      old_profit_ratio: number
      new_profit_ratio: number
    }>,
    totalNewCommitted: 0,
    totalIncrease: 0,
    totalShare: 0,
  }
}

function buildDistributionDraftRows(
  partners: CapitalPartnerSnapshot[],
  oldCapital: number,
  newCapital: number,
  method: DistributionMethod,
  previousRows: PartnerDistributionDraft[]
) {
  return partners.map(partner => {
    const previous = previousRows.find(row => row.partner_id === partner.id)
    const oldCommitted = roundMoney(partner.committed_capital_amount || (oldCapital * partner.share_ratio / 100))
    const nextCommitted = method === 'proportional'
      ? roundMoney(oldCommitted + Math.max(0, newCapital - oldCapital) * (partner.share_ratio / 100))
      : toNumber(previous?.new_committed_capital_amount) > 0
        ? toNumber(previous?.new_committed_capital_amount)
        : oldCommitted
    const nextShare = newCapital > 0 ? roundRatio((nextCommitted / newCapital) * 100) : 0

    return {
      partner_id: partner.id,
      new_committed_capital_amount: String(nextCommitted),
      new_share_ratio: String(nextShare),
      capital_source: previous?.capital_source || defaultSourceForType(method === 'proportional' ? 'Nakdi sermaye taahhüdü ile artırım' : ''),
      description: previous?.description || '',
    }
  })
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
    'rounded-lg border px-3 py-2 text-sm font-medium transition',
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
  const direct = Number(text)
  if (Number.isFinite(direct)) return direct
  const localized = Number(text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(localized) ? localized : 0
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function roundRatio(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000
}

function formatCurrency(value: unknown, currency = 'TRY') {
  return toNumber(value).toLocaleString('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 })
}

function formatNumber(value: unknown) {
  return toNumber(value).toLocaleString('tr-TR', { maximumFractionDigits: 4 })
}
