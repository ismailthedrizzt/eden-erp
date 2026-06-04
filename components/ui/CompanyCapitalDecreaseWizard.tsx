'use client'

import { useState } from 'react'
import { AlertCircle, FileText, Landmark, ShieldAlert, X } from 'lucide-react'
import { formControlClass } from './formControlStyles'
import { cn } from '@/lib/utils'

export type CapitalDecreasePrecheckContext = {
  ok: boolean
  operation_enabled: boolean
  message: string
  reasons: string[]
  warnings: string[]
  is_company_active: boolean
  company_status?: string
  record_status?: string
  current_capital_amount: number
  paid_capital_amount: number
  partner_count: number
  required_fields: string[]
  current_ownership_distribution: Array<Record<string, any>>
}

const stepLabels = ['Bilgiler', 'Belgeler', 'Ön İzleme/Onay']

export function CompanyCapitalDecreaseWizard({
  companyName,
  context,
  onClose,
}: {
  companyName: string
  context: CapitalDecreasePrecheckContext
  onClose: () => void
}) {
  const [step, setStep] = useState(0)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sermaye Azaltımı</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{companyName}</p>
          </div>
          <button type="button" aria-label="Sermaye azaltımı penceresini kapat" onClick={onClose} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <div className="grid gap-2 md:grid-cols-3">
            {stepLabels.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  'flex min-h-[48px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium',
                  index === step
                    ? 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
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
          {step === 0 && <PrecheckStep context={context} />}
          {step === 0 && <CapitalFieldsStep context={context} />}
          {step === 0 && <OwnershipImpactStep rows={context.current_ownership_distribution || []} />}
          {step === 1 && <DocumentPlanStep requiredFields={context.required_fields || []} />}
          {step === 2 && <SummaryStep context={context} />}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-200">
            <ShieldAlert size={15} />
            Bu MVP ekranı ön kontrol içindir; veri değişikliği yapmaz.
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(prev => Math.max(0, prev - 1))} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
                Geri
              </button>
            )}
            {step < stepLabels.length - 1 ? (
              <button type="button" onClick={() => setStep(prev => Math.min(prev + 1, stepLabels.length - 1))} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Devam
              </button>
            ) : (
              <button type="button" onClick={onClose} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">
                Kapat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PrecheckStep({ context }: { context: CapitalDecreasePrecheckContext }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Şirket Durumu" value={context.is_company_active ? 'Aktif' : (context.company_status || context.record_status || 'Kontrol edilemedi')} />
        <Metric label="Mevcut Sermaye" value={formatCurrency(context.current_capital_amount)} />
        <Metric label="Ödenmiş Sermaye" value={formatCurrency(context.paid_capital_amount)} />
        <Metric label="Ortak Sayısı" value={String(context.partner_count || 0)} />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-center gap-2 font-semibold"><AlertCircle size={16} />Hazırlık Aşamasında</div>
        <p className="mt-2">{context.message}</p>
      </div>

      {context.reasons?.length ? (
        <MessageList title="Başlatma engelleri" tone="red" messages={context.reasons} />
      ) : null}
      {context.warnings?.length ? (
        <MessageList title="Notlar" tone="amber" messages={context.warnings} />
      ) : null}
    </div>
  )
}

function CapitalFieldsStep({ context }: { context: CapitalDecreasePrecheckContext }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Eski Sermaye
          <input readOnly value={formatPlainNumber(context.current_capital_amount)} className={formControlClass({ className: 'mt-1 bg-gray-50 dark:bg-gray-900' })} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Azaltılacak Tutar
          <input readOnly value="" placeholder="Operasyon açıldığında girilecek" className={formControlClass({ className: 'mt-1 bg-gray-50 dark:bg-gray-900' })} />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Yeni Sermaye
          <input readOnly value="" placeholder="Otomatik hesaplanacak" className={formControlClass({ className: 'mt-1 bg-gray-50 dark:bg-gray-900' })} />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Azaltım Nedeni
          <select disabled className={formControlClass({ className: 'mt-1 bg-gray-50 dark:bg-gray-900' })}>
            <option>Hazırlanıyor</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          İade / Mahsup / Zarar Kapama Tipi
          <select disabled className={formControlClass({ className: 'mt-1 bg-gray-50 dark:bg-gray-900' })}>
            <option>Hazırlanıyor</option>
          </select>
        </label>
      </div>
    </div>
  )
}

function OwnershipImpactStep({ rows }: { rows: Array<Record<string, any>> }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
        Sermaye azaltımı ileride ortaklık/pay kayıtlarını doğrudan değil, ownership transaction üzerinden etkileyecek.
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2">Ortak</th>
              <th className="px-3 py-2">Mevcut Pay</th>
              <th className="px-3 py-2">Mevcut Sermaye</th>
              <th className="px-3 py-2">Planlanan Etki</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map(row => (
              <tr key={String(row.partner_id)}>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{String(row.display_name || 'Ortak')}</td>
                <td className="px-3 py-2">%{formatPlainNumber(row.current_share_ratio)}</td>
                <td className="px-3 py-2">{formatCurrency(row.current_capital_amount)}</td>
                <td className="px-3 py-2 text-amber-700 dark:text-amber-200">Hazırlanıyor</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">Güncel ortaklık dağılımı bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DocumentPlanStep({ requiredFields }: { requiredFields: string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {requiredFields.map(field => (
        <div key={field} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
          <FileText size={15} />
          {field}
        </div>
      ))}
    </div>
  )
}

function SummaryStep({ context }: { context: CapitalDecreasePrecheckContext }) {
  return (
    <div className="space-y-4">
      <Metric label="Operasyon Durumu" value={context.operation_enabled ? 'Açık' : 'Hazırlanıyor'} />
      <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200">
        <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><Landmark size={16} />Sonraki Mimari Adım</div>
        <p className="mt-2">
          Belge ve onay akışı tamamlandığında sermaye azaltımı, şirket kartını doğrudan düzenlemeden ownership transaction ve lifecycle history üzerinden çalışacaktır.
        </p>
      </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}

function formatCurrency(value: unknown, currency = 'TRY') {
  return toNumber(value).toLocaleString('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 })
}

function formatPlainNumber(value: unknown) {
  return toNumber(value).toLocaleString('tr-TR', { maximumFractionDigits: 4 })
}

function toNumber(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return 0
  const direct = Number(text)
  if (Number.isFinite(direct)) return direct
  const localized = Number(text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(localized) ? localized : 0
}
