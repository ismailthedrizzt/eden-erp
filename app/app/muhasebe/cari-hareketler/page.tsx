'use client'



import { appMuhasebeCariHareketlerListContract } from '@/contracts/pages/generated/app-muhasebe-cari-hareketler.list.contract'
import { appMuhasebeCariHareketlerFormContract } from '@/contracts/pages/generated/app-muhasebe-cari-hareketler.form.contract'
import { appMuhasebeCariHareketlerWizardContract } from '@/contracts/pages/generated/app-muhasebe-cari-hareketler.wizard.contract'
import { appMuhasebeCariHareketlerLifecycleContract } from '@/contracts/pages/generated/app-muhasebe-cari-hareketler.lifecycle.contract'

void appMuhasebeCariHareketlerListContract
void appMuhasebeCariHareketlerFormContract
void appMuhasebeCariHareketlerWizardContract
void appMuhasebeCariHareketlerLifecycleContract

import { appMuhasebeCariHareketlerPageContract } from '@/contracts/pages/generated/app-muhasebe-cari-hareketler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appMuhasebeCariHareketlerContractReady = requirePageContract(appMuhasebeCariHareketlerPageContract)
void appMuhasebeCariHareketlerContractReady

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, FilePlus2, FileText, Plus, ReceiptText, X } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef, type SortConfig, type WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { useRegisterActionGuideContext } from '@/components/ai/ActionGuideContext'
import { usePermissions } from '@/lib/security/permissionStore'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import {
  cariAccountsService,
  cariTransactionsService,
  type CariAccount,
  type CariTransaction,
} from '@/lib/services/accounting'
import type { ListMeta } from '@/lib/api/listEndpoint'

type ToastState = { type: 'success' | 'error' | 'warning'; message: string; title?: string } | null

const TYPE_LABELS: Record<string, string> = {
  expense: 'Gider',
  income: 'Gelir',
  invoice: 'Fatura',
  payment: 'Odeme',
  collection: 'Tahsilat',
  bank_transaction: 'Banka Hareketi',
  card_transaction: 'Kart Hareketi',
  cash_transaction: 'Kasa Hareketi',
  capital_payment: 'Sermaye Odemesi',
  capital_collection: 'Sermaye Tahsilati',
  adjustment: 'Duzeltme',
  opening_balance: 'Acilis Bakiyesi',
  transfer: 'Transfer',
  refund: 'Iade',
  other: 'Diger',
}

const DOCUMENT_LABELS: Record<string, string> = {
  no_document: 'Belge yok',
  document_needed: 'Belge aranacak',
  document_uploaded: 'Belge yuklendi',
  e_invoice_pending: 'e-Fatura bekleniyor',
  e_archive_pending: 'e-Arsiv bekleniyor',
  invoice_matched: 'Fatura eslesti',
  rejected: 'Belge reddedildi',
}

const RECONCILIATION_LABELS: Record<string, string> = {
  unmatched: 'Eslesmedi',
  matched: 'Eslesti',
  partially_matched: 'Kismi eslesti',
  needs_review: 'Mutabakat bekliyor',
  ignored: 'Yok sayildi',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  confirmed: 'Onayli',
  cancelled: 'Iptal',
}

const DIRECTION_LABELS: Record<string, string> = {
  debit: 'Borc',
  credit: 'Alacak',
}

const columns: ColumnDef[] = [
  { key: 'transaction_date', label: 'Tarih', type: 'date', width: 120, sortable: true, category: 'Tarih' },
  { key: 'company_id', label: 'Bagli Sirket', type: 'text', width: 150, category: 'Iliski' },
  { key: 'account_name', label: 'Cari', type: 'text', width: 220, category: 'Iliski' },
  { key: 'type_label', label: 'Islem Turu', type: 'text', width: 150, category: 'Islem' },
  { key: 'direction_label', label: 'Borc / Alacak', type: 'text', width: 130, render: (_value, row) => <DirectionBadge direction={row.direction} /> },
  { key: 'amount', label: 'Tutar', type: 'number', width: 130, sortable: true, render: (value, row) => <Amount value={Number(value || 0)} currency={row.currency} direction={row.direction} /> },
  { key: 'currency', label: 'Para Birimi', type: 'text', width: 100, category: 'Tutar' },
  { key: 'document_label', label: 'Belge Durumu', type: 'text', width: 160, category: 'Belge' },
  { key: 'document_no', label: 'Belge No', type: 'text', width: 120, category: 'Belge' },
  { key: 'real_counterparty_name', label: 'Gercek Karsi Taraf', type: 'text', width: 190, category: 'Karsi taraf' },
  { key: 'category', label: 'Kategori', type: 'text', width: 150, category: 'Kategorizasyon' },
  { key: 'payment_method', label: 'Odeme Yontemi', type: 'text', width: 150, category: 'Odeme' },
  { key: 'paid_by_label', label: 'Odeyen', type: 'text', width: 140, category: 'Odeme' },
  { key: 'paid_to_label', label: 'Odenen', type: 'text', width: 140, category: 'Odeme' },
  { key: 'reconciliation_label', label: 'Eslesme Durumu', type: 'text', width: 160, category: 'Mutabakat' },
  { key: 'status_label', label: 'Durum', type: 'text', width: 110, category: 'Durum' },
]

export default function CariTransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600 dark:text-slate-300">Cari hareketler yukleniyor...</div>}>
      <CariTransactionsContent />
    </Suspense>
  )
}

function CariTransactionsContent() {
  const searchParams = useSearchParams()
  const { can } = usePermissions()
  const initialAccountId = searchParams.get('account_id') || ''
  const [transactions, setTransactions] = useState<CariTransaction[]>([])
  const [accounts, setAccounts] = useState<CariAccount[]>([])
  const [selected, setSelected] = useState<CariTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 50,
    search: '',
    sort: 'transaction_date',
    sortDirection: 'desc' as 'asc' | 'desc',
    company_id: '',
    account_id: initialAccountId,
    transaction_type: '',
    direction: '',
    dateFrom: '',
    dateTo: '',
    document_status: '',
    payment_method: '',
    category: '',
    reconciliation_status: '',
    status: '',
  })
  const [meta, setMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })

  useRegisterActionGuideContext({
    currentPage: 'accounting.cariTransactions',
    selectedRecordType: selected ? 'accounting_cari_transaction' : null,
    selectedRecordId: selected?.id || null,
    selectedRecordStatus: selected?.status || null,
    companyId: selected?.company_id || filters.company_id || null,
    route: '/app/muhasebe/cari-hareketler',
    context: { accountId: filters.account_id || selected?.account_id || null },
    availableModules: ['accounting'],
  })

  const loadAccounts = useCallback(async () => {
    try {
      const result = await cariAccountsService.list({ pageSize: 200, sort: 'account_name', direction: 'asc' })
      setAccounts(result.data)
    } catch {
      setAccounts([])
    }
  }, [])

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await cariTransactionsService.list(filters)
      setTransactions(result.data)
      setMeta(result.meta)
    } catch (error) {
      setToast({ type: 'error', title: 'Cari hareketler yuklenemedi', message: error instanceof Error ? error.message : 'Lutfen tekrar deneyin.' })
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const accountLabelById = useMemo(() => new Map(accounts.map(account => [account.id, account.account_name])), [accounts])
  const tableData = useMemo(() => transactions.map(transaction => ({
    ...transaction,
    account_name: transaction.account_name || accountLabelById.get(transaction.account_id) || 'Cari',
    type_label: TYPE_LABELS[transaction.transaction_type] || transaction.transaction_type,
    direction_label: DIRECTION_LABELS[transaction.direction] || transaction.direction,
    document_label: DOCUMENT_LABELS[transaction.document_status] || transaction.document_status,
    reconciliation_label: RECONCILIATION_LABELS[transaction.reconciliation_status] || transaction.reconciliation_status,
    status_label: STATUS_LABELS[transaction.status] || transaction.status,
    paid_by_label: entityLabel(transaction.paid_by_entity_type, transaction.paid_by_entity_id),
    paid_to_label: entityLabel(transaction.paid_to_entity_type, transaction.paid_to_entity_id),
  })), [accountLabelById, transactions])

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Hareket', render: () => meta.total || tableData.length },
    { key: 'debit', label: 'Borc', render: () => tableData.filter(row => row.direction === 'debit').length },
    { key: 'credit', label: 'Alacak', render: () => tableData.filter(row => row.direction === 'credit').length },
    { key: 'unmatched', label: 'Eslesmeyen', render: () => tableData.filter(row => ['unmatched', 'needs_review'].includes(row.reconciliation_status)).length },
  ], [meta.total, tableData])

  const handleSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setFilters(prev => ({ ...prev, page: 1, sort: sort?.key || 'transaction_date', sortDirection: sort?.direction || 'desc' }))
  }

  const handleCreated = async (transaction: CariTransaction) => {
    setCreateOpen(false)
    setToast({ type: 'success', title: 'Cari hareket olusturuldu', message: TYPE_LABELS[transaction.transaction_type] || 'Hareket kaydedildi.' })
    await loadTransactions()
    await loadAccounts()
    setSelected(transaction)
  }

  const cancelTransaction = async () => {
    if (!selected) return
    try {
      const updated = await cariTransactionsService.update(selected.id, { status: 'cancelled', base_version: selected.version })
      setSelected(updated)
      setToast({ type: 'success', title: 'Hareket iptal edildi', message: 'Bakiye ozeti yeniden hesaplanacak.' })
      await loadTransactions()
    } catch (error) {
      setToast({ type: 'error', title: 'Iptal edilemedi', message: error instanceof Error ? error.message : 'Lutfen tekrar deneyin.' })
    }
  }

  return (
    <div className="relative">
      <PageBanner
        mode={selected ? 'form' : 'list'}
        title={selected ? selected.description : 'Cari Hareketler'}
        subtitle={selected ? 'Cari hareket detayi ve mutabakat baglantilari' : 'Odeme, tahsilat, gider, gelir, belge ve mutabakat durumlarini cari kartlarla iliskilendirin.'}
        icon={<ReceiptText size={24} />}
        onBackClick={selected ? () => setSelected(null) : undefined}
        onAddClick={!selected && can(ACCOUNTING_PERMISSIONS.transactionCreate) ? () => setCreateOpen(true) : undefined}
        addButtonText="Cari Hareket Ekle"
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {!selected ? (
        <>
          <FormHelper />
          <FilterBar
            filters={filters}
            accounts={accounts}
            onChange={patch => setFilters(prev => ({ ...prev, ...patch, page: 1 }))}
          />
          <div className="mt-5">
            <SmartDataTable
              columns={columns}
              data={tableData}
              loading={loading}
              widgets={widgets}
              defaultView="list"
              storageKey="accounting-cari-transactions"
              emptyText={<EmptyTransactions canCreate={can(ACCOUNTING_PERMISSIONS.transactionCreate)} onCreate={() => setCreateOpen(true)} />}
              onRowClick={row => setSelected(row)}
              onRefresh={loadTransactions}
              defaultPageSize={filters.pageSize}
              pagination={{
                mode: 'server',
                page: meta.page,
                pageSize: meta.pageSize,
                total: meta.total,
                onPageChange: page => setFilters(prev => ({ ...prev, page })),
                onPageSizeChange: pageSize => setFilters(prev => ({ ...prev, page: 1, pageSize })),
                onSearchChange: search => setFilters(prev => ({ ...prev, page: 1, search })),
                onSortChange: handleSortChange,
              }}
            />
          </div>
        </>
      ) : (
        <TransactionDetail transaction={selected} onCancel={cancelTransaction} canCancel={can(ACCOUNTING_PERMISSIONS.accountingEdit)} />
      )}

      {createOpen && (
        <CreateTransactionModal
          accounts={accounts}
          initialAccountId={filters.account_id}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
          onError={message => setToast({ type: 'error', title: 'Cari hareket olusturulamadi', message })}
        />
      )}
    </div>
  )
}

function FormHelper() {
  return (
    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
      Cari hareket, bir cari kartla iliskili finansal hareket kaydidir. Ortaklik hakki veya sirket resmi durumu bu kayitla olusmaz; ilgili modullerle mutabakat kurulur.
    </div>
  )
}

function FilterBar({ filters, accounts, onChange }: {
  filters: Record<string, string | number>
  accounts: CariAccount[]
  onChange: (patch: Record<string, string>) => void
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-5">
      <Select label="Cari" value={String(filters.account_id || '')} onChange={value => onChange({ account_id: value })}>
        <option value="">Tum cariler</option>
        {accounts.map(account => <option key={account.id} value={account.id}>{account.account_name}</option>)}
      </Select>
      <Select label="Islem Turu" value={String(filters.transaction_type || '')} onChange={value => onChange({ transaction_type: value })}>
        <option value="">Tum islem turleri</option>
        {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      <Select label="Borc / Alacak" value={String(filters.direction || '')} onChange={value => onChange({ direction: value })}>
        <option value="">Tumu</option>
        <option value="debit">Borc</option>
        <option value="credit">Alacak</option>
      </Select>
      <Select label="Belge" value={String(filters.document_status || '')} onChange={value => onChange({ document_status: value })}>
        <option value="">Tum belgeler</option>
        {Object.entries(DOCUMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      <Select label="Mutabakat" value={String(filters.reconciliation_status || '')} onChange={value => onChange({ reconciliation_status: value })}>
        <option value="">Tum durumlar</option>
        {Object.entries(RECONCILIATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      <TextInput label="Baslangic" type="date" value={String(filters.dateFrom || '')} onChange={value => onChange({ dateFrom: value })} />
      <TextInput label="Bitis" type="date" value={String(filters.dateTo || '')} onChange={value => onChange({ dateTo: value })} />
      <TextInput label="Kategori" value={String(filters.category || '')} onChange={value => onChange({ category: value })} />
      <TextInput label="Odeme Yontemi" value={String(filters.payment_method || '')} onChange={value => onChange({ payment_method: value })} />
      <Select label="Durum" value={String(filters.status || '')} onChange={value => onChange({ status: value })}>
        <option value="">Tum durumlar</option>
        <option value="draft">Taslak</option>
        <option value="confirmed">Onayli</option>
        <option value="cancelled">Iptal</option>
      </Select>
    </div>
  )
}

function TransactionDetail({ transaction, canCancel, onCancel }: {
  transaction: CariTransaction
  canCancel: boolean
  onCancel: () => void
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Metric label="Tutar" value={formatMoney(transaction.amount, transaction.currency)} />
        <Metric label="Borc / Alacak" value={DIRECTION_LABELS[transaction.direction] || transaction.direction} />
        <Metric label="Belge" value={DOCUMENT_LABELS[transaction.document_status] || transaction.document_status} />
        <Metric label="Mutabakat" value={RECONCILIATION_LABELS[transaction.reconciliation_status] || transaction.reconciliation_status} />
      </div>
      <InfoGrid items={[
        ['Tarih', transaction.transaction_date],
        ['Cari', transaction.account_name || transaction.account_id],
        ['Islem Turu', TYPE_LABELS[transaction.transaction_type] || transaction.transaction_type],
        ['Durum', STATUS_LABELS[transaction.status] || transaction.status],
        ['Aciklama', transaction.description],
        ['Gercek Karsi Taraf', transaction.real_counterparty_name || '-'],
        ['Kategori', transaction.category || '-'],
        ['Odeme Yontemi', transaction.payment_method || '-'],
        ['Odeyen', entityLabel(transaction.paid_by_entity_type, transaction.paid_by_entity_id)],
        ['Odenen', entityLabel(transaction.paid_to_entity_type, transaction.paid_to_entity_id)],
        ['Belge No', transaction.document_no || '-'],
        ['Ilgili Modul / Kayit', [transaction.related_module, transaction.related_entity_type, transaction.related_entity_id].filter(Boolean).join(' / ') || '-'],
      ]} />
      {transaction.related_module === 'capital' || transaction.related_module === 'ownership' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Sermaye artirimi ortaklik/sirket domaininde olusur. Bu hareket yalnizca sermaye odemesi veya tahsilati icin muhasebe mutabakati saglar.
        </div>
      ) : null}
      {canCancel && transaction.status !== 'cancelled' && (
        <button className="btn" onClick={onCancel}>Hareketi Iptal Et</button>
      )}
    </div>
  )
}

function CreateTransactionModal({ accounts, initialAccountId, onClose, onCreated, onError }: {
  accounts: CariAccount[]
  initialAccountId: string
  onClose: () => void
  onCreated: (transaction: CariTransaction) => void
  onError: (message: string) => void
}) {
  const firstAccount = accounts.find(account => account.id === initialAccountId) || accounts[0]
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    account_id: firstAccount?.id || '',
    transaction_date: new Date().toISOString().slice(0, 10),
    transaction_type: 'expense',
    direction: 'debit',
    amount: '0',
    currency: firstAccount?.currency || 'TRY',
    description: '',
    document_status: 'no_document',
    document_no: '',
    real_counterparty_name: '',
    category: '',
    payment_method: '',
    paid_by_entity_type: '',
    paid_by_entity_id: '',
    paid_to_entity_type: '',
    paid_to_entity_id: '',
    related_module: '',
    related_entity_type: '',
    related_entity_id: '',
    reconciliation_status: 'unmatched',
    status: 'draft',
  })

  const selectedAccount = accounts.find(account => account.id === form.account_id)

  const applyFoundationExpense = () => {
    const miscellaneous = accounts.find(account => account.cari_role === 'miscellaneous') || selectedAccount || accounts[0]
    setForm(prev => ({
      ...prev,
      account_id: miscellaneous?.id || prev.account_id,
      transaction_type: 'expense',
      direction: 'debit',
      amount: '500',
      currency: miscellaneous?.currency || 'TRY',
      description: 'Sirket kurulus gideri - fotografci',
      real_counterparty_name: 'Fotografci - bulunacak',
      category: 'Kurulus gideri',
      payment_method: 'personal_payment',
      paid_by_entity_type: 'person',
      paid_by_entity_id: 'Ismail',
      paid_to_entity_type: 'miscellaneous',
      document_status: 'document_needed',
      reconciliation_status: 'unmatched',
      status: 'confirmed',
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedAccount) {
      onError('Cari kart secilmelidir.')
      return
    }
    setSaving(true)
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))
      const transaction = await cariTransactionsService.create({
        ...payload,
        company_id: selectedAccount.company_id,
        amount: Number(form.amount || 0),
      })
      onCreated(transaction)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Lutfen bilgileri kontrol edin.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-gray-950">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cari Hareket Ekle</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Belge, odeme, gercek karsi taraf ve mutabakat bilgilerini ayni kayitta izleyin.</p>
          </div>
          <button type="button" className="btn" onClick={onClose}><X size={16} />Kapat</button>
        </div>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle size={16} className="mr-2 inline" />
          Sermaye odemesi cari hareket olarak kaydedilir; ortaklik hakki bu kayittan dogmaz.
          <button type="button" className="ml-3 font-semibold underline" onClick={applyFoundationExpense}>Kurulus gideri ornegini doldur</button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Select label="Cari Kart" value={form.account_id} onChange={value => setForm(prev => ({ ...prev, account_id: value, currency: accounts.find(account => account.id === value)?.currency || prev.currency }))} required>
            <option value="">Cari secin</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.account_name}</option>)}
          </Select>
          <TextInput label="Tarih" type="date" value={form.transaction_date} onChange={value => setForm(prev => ({ ...prev, transaction_date: value }))} required />
          <Select label="Islem Turu" value={form.transaction_type} onChange={value => setForm(prev => ({ ...prev, transaction_type: value }))}>
            {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select label="Borc / Alacak" value={form.direction} onChange={value => setForm(prev => ({ ...prev, direction: value }))}>
            <option value="debit">Borc</option>
            <option value="credit">Alacak</option>
          </Select>
          <TextInput label="Tutar" type="number" value={form.amount} onChange={value => setForm(prev => ({ ...prev, amount: value }))} required />
          <TextInput label="Para Birimi" value={form.currency} onChange={value => setForm(prev => ({ ...prev, currency: value.toUpperCase() }))} />
          <Select label="Belge Durumu" value={form.document_status} onChange={value => setForm(prev => ({ ...prev, document_status: value }))}>
            {Object.entries(DOCUMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <TextInput label="Belge No" value={form.document_no} onChange={value => setForm(prev => ({ ...prev, document_no: value }))} />
          <TextInput label="Gercek Karsi Taraf" value={form.real_counterparty_name} onChange={value => setForm(prev => ({ ...prev, real_counterparty_name: value }))} />
          <TextInput label="Kategori" value={form.category} onChange={value => setForm(prev => ({ ...prev, category: value }))} />
          <TextInput label="Odeme Yontemi" value={form.payment_method} onChange={value => setForm(prev => ({ ...prev, payment_method: value }))} />
          <Select label="Durum" value={form.status} onChange={value => setForm(prev => ({ ...prev, status: value }))}>
            <option value="draft">Taslak</option>
            <option value="confirmed">Onayli</option>
            <option value="cancelled">Iptal</option>
          </Select>
          <Select label="Odeyen Tipi" value={form.paid_by_entity_type} onChange={value => setForm(prev => ({ ...prev, paid_by_entity_type: value }))}>
            <EntityTypeOptions />
          </Select>
          <TextInput label="Odeyen" value={form.paid_by_entity_id} onChange={value => setForm(prev => ({ ...prev, paid_by_entity_id: value }))} />
          <Select label="Odenen Tipi" value={form.paid_to_entity_type} onChange={value => setForm(prev => ({ ...prev, paid_to_entity_type: value }))}>
            <EntityTypeOptions />
          </Select>
          <TextInput label="Odenen" value={form.paid_to_entity_id} onChange={value => setForm(prev => ({ ...prev, paid_to_entity_id: value }))} />
          <Select label="Ilgili Modul" value={form.related_module} onChange={value => setForm(prev => ({ ...prev, related_module: value }))}>
            <option value="">Yok</option>
            <option value="accounting">Muhasebe</option>
            <option value="company">Sirket</option>
            <option value="partner">Ortak</option>
            <option value="ownership">Ortaklik</option>
            <option value="capital">Sermaye</option>
            <option value="representative">Temsilci</option>
            <option value="branch">Sube</option>
          </Select>
          <TextInput label="Ilgili Kayit Tipi" value={form.related_entity_type} onChange={value => setForm(prev => ({ ...prev, related_entity_type: value }))} />
          <TextInput label="Ilgili Kayit" value={form.related_entity_id} onChange={value => setForm(prev => ({ ...prev, related_entity_id: value }))} />
          <Select label="Mutabakat" value={form.reconciliation_status} onChange={value => setForm(prev => ({ ...prev, reconciliation_status: value }))}>
            {Object.entries(RECONCILIATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <label className="space-y-1 text-sm md:col-span-4">
            <span className="font-medium text-gray-700 dark:text-gray-200">Aciklama</span>
            <textarea required value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} className="min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Vazgec</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !selectedAccount || !form.description || Number(form.amount || 0) <= 0}>
            {saving ? 'Kaydediliyor...' : 'Cari Hareket Olustur'}
          </button>
        </div>
      </form>
    </div>
  )
}

function EntityTypeOptions() {
  return (
    <>
      <option value="">Secilmedi</option>
      <option value="company">Sirket</option>
      <option value="person">Kisi</option>
      <option value="organization">Kurum</option>
      <option value="partner">Ortak</option>
      <option value="representative">Temsilci</option>
      <option value="stakeholder">Paydas</option>
      <option value="employee">Personel</option>
      <option value="bank">Banka</option>
      <option value="public_institution">Kamu kurumu</option>
      <option value="miscellaneous">Muhtelif</option>
    </>
  )
}

function EmptyTransactions({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <FilePlus2 size={28} className="text-gray-400" />
      <div>
        <p className="font-medium text-gray-900 dark:text-white">Cari hareket bulunamadi</p>
        <p className="mt-1 text-sm text-gray-500">Odeme, tahsilat, gider veya belge hareketi olusturarak baslayin.</p>
      </div>
      {canCreate && <button className="btn btn-primary" onClick={onCreate}><Plus size={16} />Cari Hareket Ekle</button>}
    </div>
  )
}

function Select({ label, value, onChange, children, required }: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <select required={required} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
        {children}
      </select>
    </label>
  )
}

function TextInput({ label, value, onChange, type = 'text', required }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
    </label>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

function InfoGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{value || '-'}</div>
        </div>
      ))}
    </div>
  )
}

function DirectionBadge({ direction }: { direction: string }) {
  const className = direction === 'debit'
    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{DIRECTION_LABELS[direction] || direction}</span>
}

function Amount({ value, currency, direction }: { value: number; currency: string; direction: string }) {
  const className = direction === 'debit' ? 'text-blue-700 dark:text-blue-300' : 'text-emerald-700 dark:text-emerald-300'
  return <span className={`font-semibold ${className}`}>{formatMoney(value, currency)}</span>
}

function formatMoney(value: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value || 0))
}

function entityLabel(type?: string | null, id?: string | null) {
  if (!type && !id) return '-'
  const typeLabel: Record<string, string> = {
    person: 'Kisi',
    organization: 'Kurum',
    company: 'Sirket',
    partner: 'Ortak',
    representative: 'Temsilci',
    stakeholder: 'Paydas',
    employee: 'Personel',
    bank: 'Banka',
    public_institution: 'Kamu',
    miscellaneous: 'Muhtelif',
  }
  return [type ? typeLabel[type] || type : null, id].filter(Boolean).join(': ')
}
