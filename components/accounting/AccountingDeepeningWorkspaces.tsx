'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeftRight, FileWarning, Landmark, ReceiptText, Scale } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { Toast } from '@/components/ui/Toast'
import {
  bankAccountsService,
  bankTransactionsService,
  capitalReconciliationService,
  eDocumentsService,
  reconciliationService,
  type BankAccount,
  type BankTransaction,
  type CapitalReconciliation,
  type EDocument,
  type ReconciliationSuggestion,
} from '@/lib/services/accounting'

type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string } | null

const STATUS_LABELS: Record<string, string> = {
  unmatched: 'Eslesmedi',
  matched: 'Eslesti',
  partially_matched: 'Kismi eslesti',
  needs_review: 'Inceleme bekliyor',
  ignored: 'Yok sayildi',
  rejected: 'Reddedildi',
  cancelled: 'Iptal',
  received: 'Alindi',
  issued: 'Kesildi',
  accepted: 'Kabul edildi',
}

export function BankAccountsWorkspace() {
  const [rows, setRows] = useState<BankAccount[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await bankAccountsService.list({ pageSize: 50 })
      setRows(result.data)
    } catch (error) {
      setToast(errorToast('Banka hesaplari yuklenemedi', error))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <Shell
      title="Banka Hesaplari"
      subtitle="Sirket banka hesaplarini, maskeli IBAN bilgisini ve son ekstre import durumunu izleyin."
      icon={<Landmark size={24} />}
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <SummaryGrid items={[
        ['Hesap', rows.length],
        ['Aktif', rows.filter(row => row.is_active).length],
        ['Bagli', rows.filter(row => row.integration_status === 'connected').length],
        ['Manuel', rows.filter(row => row.integration_status === 'manual').length],
      ]} />
      <DataTable
        loading={loading}
        empty="Banka hesabi bulunamadi."
        columns={['Banka', 'Hesap', 'IBAN', 'Tip', 'Bakiye', 'Son Import']}
        rows={rows.map(row => [
          row.bank_name,
          row.account_name,
          row.iban_masked || '-',
          row.account_type,
          money(row.current_balance, row.currency),
          dateText(row.last_import_at),
        ])}
      />
    </Shell>
  )
}

export function BankTransactionsWorkspace() {
  const [rows, setRows] = useState<BankTransaction[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await bankTransactionsService.list({ pageSize: 50, sortDirection: 'desc' })
      setRows(result.data)
    } catch (error) {
      setToast(errorToast('Banka hareketleri yuklenemedi', error))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const markIgnored = async (id: string) => {
    try {
      await bankTransactionsService.ignore(id)
      setToast({ type: 'success', title: 'Hareket yok sayildi', message: 'Bu hareket mutabakat kuyrugundan cikarildi.' })
      await load()
    } catch (error) {
      setToast(errorToast('Hareket yok sayilamadi', error))
    }
  }

  return (
    <Shell
      title="Banka Hareketleri"
      subtitle="Ekstrelerden gelen banka hareketlerini cari hareket ve e-belgelerle eslestirmeye hazirlayin."
      icon={<ArrowLeftRight size={24} />}
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <SummaryGrid items={[
        ['Hareket', rows.length],
        ['Eslesmeyen', rows.filter(row => row.reconciliation_status === 'unmatched').length],
        ['Inceleme', rows.filter(row => row.reconciliation_status === 'needs_review').length],
        ['Eslesti', rows.filter(row => row.reconciliation_status === 'matched').length],
      ]} />
      <DataTable
        loading={loading}
        empty="Banka hareketi bulunamadi."
        columns={['Tarih', 'Aciklama', 'Karsi Taraf', 'Yon', 'Tutar', 'Durum', 'Aksiyon']}
        rows={rows.map(row => [
          dateText(row.transaction_date),
          row.description,
          row.counterparty_name || '-',
          row.direction === 'credit' ? 'Alacak' : 'Borc',
          money(row.amount, row.currency),
          badge(row.reconciliation_status),
          row.reconciliation_status === 'unmatched'
            ? <button key={`ignore-${row.id}`} className="btn" onClick={() => markIgnored(row.id)}>Yok Say</button>
            : '-',
        ])}
      />
    </Shell>
  )
}

export function EDocumentsWorkspace() {
  const [rows, setRows] = useState<EDocument[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await eDocumentsService.list({ pageSize: 50, sortDirection: 'desc' })
      setRows(result.data)
    } catch (error) {
      setToast(errorToast('E-belgeler yuklenemedi', error))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const reject = async (id: string) => {
    try {
      await eDocumentsService.reject(id, 'Kullanici incelemesiyle reddedildi.')
      setToast({ type: 'warning', title: 'E-belge reddedildi', message: 'Cari hareket inceleme durumuna alinabilir.' })
      await load()
    } catch (error) {
      setToast(errorToast('E-belge reddedilemedi', error))
    }
  }

  return (
    <Shell
      title="e-Fatura / e-Arsiv"
      subtitle="Gelen/giden e-belge kayitlarini, PDF/XML iliskilerini ve mutabakat durumlarini izleyin."
      icon={<ReceiptText size={24} />}
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <SummaryGrid items={[
        ['Belge', rows.length],
        ['Gelen', rows.filter(row => row.direction === 'incoming').length],
        ['Reddedilen', rows.filter(row => row.status === 'rejected').length],
        ['Eslesmeyen', rows.filter(row => row.reconciliation_status === 'unmatched').length],
      ]} />
      <DataTable
        loading={loading}
        empty="E-belge bulunamadi."
        columns={['Tarih', 'No', 'Tur', 'Taraf', 'Tutar', 'Durum', 'Mutabakat', 'Aksiyon']}
        rows={rows.map(row => [
          dateText(row.issue_date),
          row.invoice_no,
          row.document_kind,
          row.direction === 'incoming' ? row.sender_name || '-' : row.receiver_name || '-',
          money(row.payable_amount, row.currency),
          badge(row.status),
          badge(row.reconciliation_status),
          row.status !== 'rejected'
            ? <button key={`reject-${row.id}`} className="btn" onClick={() => reject(row.id)}>Reddet</button>
            : '-',
        ])}
      />
    </Shell>
  )
}

export function ReconciliationWorkspace() {
  const [suggestions, setSuggestions] = useState<ReconciliationSuggestion[]>([])
  const [summary, setSummary] = useState<Record<string, any> | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [suggestionResult, summaryResult] = await Promise.all([
        reconciliationService.suggestions({ pageSize: 30, minConfidence: 50 }),
        reconciliationService.summary(),
      ])
      setSuggestions(suggestionResult.data)
      setSummary(summaryResult)
    } catch (error) {
      setToast(errorToast('Mutabakat verisi yuklenemedi', error))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const accept = async (suggestion: ReconciliationSuggestion) => {
    try {
      await reconciliationService.match({
        company_id: suggestion.company_id,
        source_type: suggestion.source_type,
        source_id: suggestion.source_id,
        target_type: suggestion.target_type,
        target_id: suggestion.target_id,
        match_type: 'manual',
        confidence_score: suggestion.confidence_score,
      })
      setToast({ type: 'success', title: 'Eslestirme kaydedildi', message: 'Mutabakat baglantisi auditlenebilir sekilde olusturuldu.' })
      await load()
    } catch (error) {
      setToast(errorToast('Eslestirme yapilamadi', error))
    }
  }

  const counts = summary?.summary || {}
  return (
    <Shell
      title="Mutabakat"
      subtitle="Banka hareketleri, cari hareketler ve e-belgeler icin eslestirme onerilerini yonetin."
      icon={<FileWarning size={24} />}
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <SummaryGrid items={[
        ['Eslesmeyen banka', Number(counts.unmatched_bank_transactions || 0)],
        ['Eslesmeyen e-belge', Number(counts.unmatched_e_documents || 0)],
        ['Belge aranacak', Number(counts.missing_documents || 0)],
        ['Aktif eslesme', Number(counts.active_links || 0)],
      ]} />
      <DataTable
        loading={loading}
        empty="Mutabakat onerisi bulunamadi."
        columns={['Kaynak', 'Hedef', 'Guven', 'Neden', 'Aksiyon']}
        rows={suggestions.map(row => [
          `${row.source_type}: ${String(row.source_id).slice(0, 8)}`,
          `${row.target_type}: ${String(row.target_id).slice(0, 8)}`,
          `%${Number(row.confidence_score || 0).toFixed(0)}`,
          row.reasons.map(reason => reason.label).join(', ') || '-',
          <button key={`accept-${row.id}`} className="btn btn-primary" onClick={() => accept(row)}>Eslestir</button>,
        ])}
      />
    </Shell>
  )
}

export function CapitalReconciliationWorkspace() {
  const [rows, setRows] = useState<CapitalReconciliation[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await capitalReconciliationService.list({ pageSize: 50 })
      setRows(result.data)
    } catch (error) {
      setToast(errorToast('Sermaye mutabakati yuklenemedi', error))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const totals = useMemo(() => ({
    expected: rows.reduce((sum, row) => sum + Number(row.expected_amount || 0), 0),
    paid: rows.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0),
    outstanding: rows.reduce((sum, row) => sum + Number(row.outstanding_amount || 0), 0),
  }), [rows])

  return (
    <Shell
      title="Sermaye Mutabakati"
      subtitle="Sermaye artirimi ve ortak odeme hareketlerini muhasebe kayitlariyla iliskilendirin."
      icon={<Scale size={24} />}
      toast={toast}
      onToastClose={() => setToast(null)}
    >
      <SummaryGrid items={[
        ['Beklenen', money(totals.expected)],
        ['Odenen', money(totals.paid)],
        ['Kalan', money(totals.outstanding)],
        ['Kayit', rows.length],
      ]} />
      <DataTable
        loading={loading}
        empty="Sermaye mutabakati kaydi bulunamadi."
        columns={['Islem', 'Ortak', 'Beklenen', 'Odenen', 'Kalan', 'Durum']}
        rows={rows.map(row => [
          row.capital_transaction_id,
          row.partner_id,
          money(row.expected_amount, row.currency),
          money(row.paid_amount, row.currency),
          money(row.outstanding_amount, row.currency),
          badge(row.reconciliation_status),
        ])}
      />
    </Shell>
  )
}

function Shell({ title, subtitle, icon, children, toast, onToastClose }: {
  title: string
  subtitle: string
  icon: ReactNode
  children: ReactNode
  toast: ToastState
  onToastClose: () => void
}) {
  return (
    <div className="relative">
      <PageBanner mode="list" title={title} subtitle={subtitle} icon={icon} />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={onToastClose} />}
      <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        Muhasebe kayitlari resmi lifecycle veya ortaklik hakki dogurmaz; banka, belge ve sermaye odemeleri ilgili domain kayitlariyla mutabakat kurar.
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  )
}

function SummaryGrid({ items }: { items: Array<[string, string | number]> }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
          <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      ))}
    </div>
  )
}

function DataTable({ columns, rows, loading, empty }: {
  columns: string[]
  rows: Array<Array<ReactNode>>
  loading: boolean
  empty: string
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-950">
            <tr>{columns.map(column => <th key={column} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={columns.length}>Yukleniyor...</td></tr>
            ) : rows.length ? rows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-950/60">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-gray-800 dark:text-gray-100">{cell}</td>)}
              </tr>
            )) : (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={columns.length}>{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function badge(value: string) {
  const label = STATUS_LABELS[value] || value
  const className = value === 'matched' || value === 'accepted'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : value === 'rejected' || value === 'needs_review'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>
}

function money(value: unknown, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value || 0))
}

function dateText(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('tr-TR').format(new Date(value))
}

function errorToast(title: string, error: unknown): ToastState {
  return { type: 'error', title, message: error instanceof Error ? error.message : 'Lutfen tekrar deneyin.' }
}
