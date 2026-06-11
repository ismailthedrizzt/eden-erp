'use client'



import { appMuhasebeCariKartlarListContract } from '@/contracts/pages/generated/app-muhasebe-cari-kartlar.list.contract'
import { appMuhasebeCariKartlarFormContract } from '@/contracts/pages/generated/app-muhasebe-cari-kartlar.form.contract'

void appMuhasebeCariKartlarListContract
void appMuhasebeCariKartlarFormContract

import { appMuhasebeCariKartlarPageContract } from '@/contracts/pages/generated/app-muhasebe-cari-kartlar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appMuhasebeCariKartlarContractReady = requirePageContract(appMuhasebeCariKartlarPageContract)
void appMuhasebeCariKartlarContractReady

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AlertCircle, Building2, FileText, Plus, RefreshCw, WalletCards, X } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef, type SortConfig, type WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { useRegisterActionGuideContext } from '@/components/ai/ActionGuideContext'
import { usePermissions } from '@/lib/security/permissionStore'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { companyService } from '@/lib/services/companyService'
import { cariAccountsService, type CariAccount, type CariAccountSummary } from '@/lib/services/accounting'
import type { ListMeta } from '@/lib/api/listEndpoint'

type CompanyOption = { value: string; label: string }
type ToastState = { type: 'success' | 'error' | 'warning'; message: string; title?: string } | null

const ROLE_LABELS: Record<string, string> = {
  customer: 'Musteri',
  supplier: 'Tedarikci',
  both: 'Musteri + Tedarikci',
  employee: 'Personel',
  partner: 'Ortak',
  stakeholder: 'Paydas',
  public_institution: 'Kamu Kurumu',
  bank: 'Banka',
  miscellaneous: 'Muhtelif',
  related_company: 'Iliskili Sirket',
  other: 'Diger',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  passive: 'Pasif',
  draft: 'Taslak',
}

const columns: ColumnDef[] = [
  { key: 'account_code', label: 'Cari Kodu', type: 'text', width: 120, sortable: true, category: 'Kimlik' },
  { key: 'account_name', label: 'Cari Adi', type: 'text', width: 260, sortable: true, category: 'Kimlik' },
  { key: 'role_label', label: 'Tur / Rol', type: 'text', width: 160, category: 'Iliski' },
  { key: 'company_label', label: 'Bagli Sirket', type: 'text', width: 180, category: 'Iliski' },
  { key: 'masked_identity', label: 'VKN / TCKN', type: 'text', width: 140, category: 'Kimlik' },
  { key: 'tax_office', label: 'Vergi Dairesi', type: 'text', width: 150, category: 'Kimlik' },
  { key: 'phone', label: 'Telefon', type: 'text', width: 140, category: 'Iletisim' },
  { key: 'email', label: 'E-posta', type: 'text', width: 190, category: 'Iletisim' },
  { key: 'current_balance', label: 'Bakiye', type: 'number', width: 130, sortable: true, render: value => <Balance value={Number(value || 0)} /> },
  { key: 'currency', label: 'Para Birimi', type: 'text', width: 100, category: 'Bakiye' },
  { key: 'risk_limit', label: 'Risk Limiti', type: 'number', width: 130, category: 'Risk' },
  { key: 'status_label', label: 'Durum', type: 'text', width: 110, category: 'Durum' },
  { key: 'last_transaction_date', label: 'Son Hareket', type: 'date', width: 130, sortable: true, category: 'Hareket' },
]

export default function CariAccountsPage() {
  const { can } = usePermissions()
  const [accounts, setAccounts] = useState<CariAccount[]>([])
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([])
  const [selected, setSelected] = useState<CariAccount | null>(null)
  const [summary, setSummary] = useState<CariAccountSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 50,
    search: '',
    sort: 'account_name',
    direction: 'asc' as 'asc' | 'desc',
    company_id: '',
    cari_role: '',
    record_status: '',
    balance_status: '',
    city: '',
  })
  const [meta, setMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })

  useRegisterActionGuideContext({
    currentPage: 'accounting.cariAccounts',
    selectedRecordType: selected ? 'accounting_cari_account' : null,
    selectedRecordId: selected?.id || null,
    selectedRecordStatus: selected?.record_status || null,
    companyId: selected?.company_id || filters.company_id || null,
    route: '/app/muhasebe/cari-kartlar',
    availableModules: ['accounting'],
  })

  const loadCompanies = useCallback(async () => {
    try {
      const response = await companyService.list({ pageSize: 100, statuses: ['active'], skipAuth: true })
      const rows = Array.isArray((response as any).data) ? (response as any).data : []
      setCompanyOptions(rows.map((row: any) => ({
        value: String(row.id),
        label: row.short_name || row.trade_name || row.company_name || String(row.id),
      })))
    } catch {
      setCompanyOptions([])
    }
  }, [])

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await cariAccountsService.list(filters)
      setAccounts(result.data)
      setMeta(result.meta)
    } catch (error) {
      setToast({ type: 'error', title: 'Cari kartlar yuklenemedi', message: error instanceof Error ? error.message : 'Lutfen tekrar deneyin.' })
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadSummary = useCallback(async (account: CariAccount | null) => {
    if (!account) {
      setSummary(null)
      return
    }
    setSummaryLoading(true)
    try {
      setSummary(await cariAccountsService.summary(account.id))
    } catch {
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  useEffect(() => {
    loadSummary(selected)
  }, [loadSummary, selected])

  const companyLabelById = useMemo(() => new Map(companyOptions.map(item => [item.value, item.label])), [companyOptions])
  const tableData = useMemo(() => accounts.map(account => ({
    ...account,
    role_label: ROLE_LABELS[account.cari_role] || account.cari_role,
    status_label: STATUS_LABELS[account.record_status] || account.record_status,
    company_label: companyLabelById.get(account.company_id) || 'Bagli sirket',
    masked_identity: maskIdentity(account.tax_number || account.identity_number),
  })), [accounts, companyLabelById])

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Cari Kart', render: () => meta.total || tableData.length },
    { key: 'suppliers', label: 'Tedarikci', render: () => tableData.filter(row => ['supplier', 'both', 'miscellaneous'].includes(row.cari_role)).length },
    { key: 'customers', label: 'Musteri', render: () => tableData.filter(row => ['customer', 'both'].includes(row.cari_role)).length },
    { key: 'risk', label: 'Risk Asimi', render: () => tableData.filter(row => Number(row.risk_limit || 0) > 0 && Math.abs(Number(row.current_balance || 0)) > Number(row.risk_limit || 0)).length },
  ], [meta.total, tableData])

  const handleSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setFilters(prev => ({ ...prev, page: 1, sort: sort?.key || 'account_name', direction: sort?.direction || 'asc' }))
  }

  const handleCreated = async (account: CariAccount) => {
    setCreateOpen(false)
    setToast({ type: 'success', title: 'Cari kart olusturuldu', message: `${account.account_name} kullanima hazir.` })
    await loadAccounts()
    setSelected(account)
  }

  return (
    <div className="relative">
      <PageBanner
        mode={selected ? 'form' : 'list'}
        title={selected ? selected.account_name : 'Cari Kartlar'}
        subtitle={selected ? 'Cari iliski, bakiye ve hareket ozeti' : 'Musteri, tedarikci, ortak, paydas ve muhtelif cari iliskileri tek yerden izleyin.'}
        icon={<WalletCards size={24} />}
        onBackClick={selected ? () => setSelected(null) : undefined}
        onAddClick={!selected && can(ACCOUNTING_PERMISSIONS.accountingEdit) ? () => setCreateOpen(true) : undefined}
        addButtonText="Cari Kart Ekle"
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {!selected ? (
        <>
          <FilterBar
            filters={filters}
            companyOptions={companyOptions}
            onChange={patch => setFilters(prev => ({ ...prev, ...patch, page: 1 }))}
          />
          <div className="mt-5">
            <SmartDataTable
              columns={columns}
              data={tableData}
              loading={loading}
              widgets={widgets}
              defaultView="list"
              storageKey="accounting-cari-accounts"
              emptyText={<EmptyAccounts onCreate={() => setCreateOpen(true)} canCreate={can(ACCOUNTING_PERMISSIONS.accountingEdit)} />}
              onRowClick={row => setSelected(row)}
              onRefresh={loadAccounts}
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
        <AccountDetail
          account={selected}
          summary={summary}
          summaryLoading={summaryLoading}
          companyLabel={companyLabelById.get(selected.company_id) || 'Bagli sirket'}
          onRefresh={() => loadSummary(selected)}
        />
      )}

      {createOpen && (
        <CreateAccountModal
          companyOptions={companyOptions}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
          onError={message => setToast({ type: 'error', title: 'Cari kart olusturulamadi', message })}
        />
      )}
    </div>
  )
}

function FilterBar({ filters, companyOptions, onChange }: {
  filters: Record<string, string | number>
  companyOptions: CompanyOption[]
  onChange: (patch: Record<string, string>) => void
}) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-5">
      <Select label="Bagli Sirket" value={String(filters.company_id || '')} onChange={value => onChange({ company_id: value })}>
        <option value="">Tum sirketler</option>
        {companyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Select label="Cari Rol" value={String(filters.cari_role || '')} onChange={value => onChange({ cari_role: value })}>
        <option value="">Tum roller</option>
        {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      <Select label="Durum" value={String(filters.record_status || '')} onChange={value => onChange({ record_status: value })}>
        <option value="">Tum durumlar</option>
        <option value="active">Aktif</option>
        <option value="draft">Taslak</option>
        <option value="passive">Pasif</option>
      </Select>
      <Select label="Bakiye" value={String(filters.balance_status || '')} onChange={value => onChange({ balance_status: value })}>
        <option value="">Tum bakiyeler</option>
        <option value="debit">Borclu</option>
        <option value="credit">Alacakli</option>
        <option value="zero">Sifir</option>
        <option value="risk">Risk asimi</option>
      </Select>
      <TextInput label="Sehir" value={String(filters.city || '')} onChange={value => onChange({ city: value })} />
    </div>
  )
}

function AccountDetail({ account, summary, summaryLoading, companyLabel, onRefresh }: {
  account: CariAccount
  summary: CariAccountSummary | null
  summaryLoading: boolean
  companyLabel: string
  onRefresh: () => void
}) {
  const [tab, setTab] = useState('general')
  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Metric label="Bakiye" value={formatMoney(summary?.balance ?? account.current_balance, account.currency)} tone={Number(summary?.balance ?? account.current_balance) >= 0 ? 'debit' : 'credit'} />
        <Metric label="Toplam Borc" value={formatMoney(summary?.total_debit || 0, account.currency)} />
        <Metric label="Toplam Alacak" value={formatMoney(summary?.total_credit || 0, account.currency)} />
        <Metric label="Eslesmeyen" value={summaryLoading ? '...' : String(summary?.unmatched_count ?? 0)} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
        {[
          ['general', 'Genel Bilgiler'],
          ['contact', 'Iletisim'],
          ['linked', 'Bagli Kayit'],
          ['movements', 'Hareketler'],
          ['balance', 'Bakiye / Ozet'],
          ['documents', 'Belgeler'],
          ['audit', 'Denetim'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-3 py-2 text-sm font-medium ${tab === key ? 'border-b-2 border-blue-600 text-blue-700 dark:text-blue-300' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <InfoGrid items={[
          ['Cari Kodu', account.account_code],
          ['Cari Adi', account.account_name],
          ['Rol', ROLE_LABELS[account.cari_role] || account.cari_role],
          ['Bagli Sirket', companyLabel],
          ['Vergi No', maskIdentity(account.tax_number || account.identity_number)],
          ['Vergi Dairesi', account.tax_office || '-'],
          ['Para Birimi', account.currency],
          ['Durum', STATUS_LABELS[account.record_status] || account.record_status],
        ]} />
      )}
      {tab === 'contact' && <InfoGrid items={[['Telefon', account.phone || '-'], ['E-posta', account.email || '-'], ['Sehir', account.city || '-'], ['Ilce', account.district || '-'], ['Adres', account.address || '-'], ['IBAN', account.iban || '-']]} />}
      {tab === 'linked' && <InfoGrid items={[['Bagli Kayit Tipi', account.linked_entity_type || 'Serbest / muhtelif'], ['Bagli Kayit', account.linked_entity_id || '-'], ['Not', account.notes || '-']]} />}
      {tab === 'movements' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Bu cari karta ait hareketleri Cari Hareketler ekraninda filtreli olarak goruntuleyebilirsiniz.</p>
          <Link className="btn btn-primary mt-3 inline-flex" href={`/app/muhasebe/cari-hareketler?account_id=${account.id}`}>Hareketleri Ac</Link>
        </div>
      )}
      {tab === 'balance' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Bakiye Ozeti</h2>
            <button className="btn" onClick={onRefresh}><RefreshCw size={16} />Yenile</button>
          </div>
          <InfoGrid items={[
            ['Acilis Bakiyesi', formatMoney(summary?.opening_balance || account.opening_balance, account.currency)],
            ['Toplam Borc', formatMoney(summary?.total_debit || 0, account.currency)],
            ['Toplam Alacak', formatMoney(summary?.total_credit || 0, account.currency)],
            ['Guncel Bakiye', formatMoney(summary?.balance ?? account.current_balance, account.currency)],
            ['Son Hareket', summary?.last_transaction_date || account.last_transaction_date || '-'],
            ['Vadesi Gecen', String(summary?.overdue_count ?? 0)],
          ]} />
        </div>
      )}
      {tab === 'documents' && <Notice text="Belgeler bu fazda cari hareket uzerindeki belge/fatura referanslariyla izlenir." />}
      {tab === 'audit' && <Notice text="Cari kart ve hareket denetim izi yetkili kullanicilar icin Audit modulunde izlenecek." />}
    </div>
  )
}

function CreateAccountModal({ companyOptions, onClose, onCreated, onError }: {
  companyOptions: CompanyOption[]
  onClose: () => void
  onCreated: (account: CariAccount) => void
  onError: (message: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company_id: companyOptions[0]?.value || '',
    account_name: '',
    account_code: '',
    account_type: 'supplier',
    cari_role: 'supplier',
    linked_entity_type: '',
    linked_entity_id: '',
    tax_number: '',
    tax_office: '',
    city: '',
    phone: '',
    email: '',
    currency: 'TRY',
    opening_balance: '0',
    risk_limit: '',
    payment_terms: '',
    notes: '',
  })

  const setMiscellaneousSupplier = () => {
    setForm(prev => ({
      ...prev,
      account_name: 'Muhtelif Tedarikciler',
      account_type: 'miscellaneous',
      cari_role: 'miscellaneous',
      linked_entity_type: 'miscellaneous',
      linked_entity_id: '',
      tax_number: '',
      tax_office: '',
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))
      const account = await cariAccountsService.create({
        ...payload,
        opening_balance: Number(form.opening_balance || 0),
        risk_limit: form.risk_limit ? Number(form.risk_limit) : undefined,
      })
      onCreated(account)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Lutfen bilgileri kontrol edin.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-gray-950">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cari Kart Ekle</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Ayni kisi/kurum icin yeni kart acmak yerine master kayda bagli cari kart kullanin.</p>
          </div>
          <button type="button" className="btn" onClick={onClose}><X size={16} />Kapat</button>
        </div>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle size={16} className="mr-2 inline" />
          Muhtelif Tedarikciler kucuk ve tek seferlik giderlerde kullanilabilir; bilinen kisi/kurumlar master kayda baglanmalidir.
          <button type="button" className="ml-3 font-semibold underline" onClick={setMiscellaneousSupplier}>Muhtelif Tedarikciler sablonunu kullan</button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select label="Bagli Sirket" value={form.company_id} onChange={value => setForm(prev => ({ ...prev, company_id: value }))} required>
            <option value="">Sirket secin</option>
            {companyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <TextInput label="Cari Adi" value={form.account_name} onChange={value => setForm(prev => ({ ...prev, account_name: value }))} required />
          <TextInput label="Cari Kodu" value={form.account_code} onChange={value => setForm(prev => ({ ...prev, account_code: value }))} placeholder="Otomatik uretilebilir" />
          <Select label="Cari Rol" value={form.cari_role} onChange={value => setForm(prev => ({ ...prev, cari_role: value, account_type: value === 'both' ? 'customer_supplier' : value }))}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select label="Bagli Kayit Tipi" value={form.linked_entity_type} onChange={value => setForm(prev => ({ ...prev, linked_entity_type: value }))}>
            <option value="">Serbest cari</option>
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
          </Select>
          <TextInput label="Bagli Kayit Referansi" value={form.linked_entity_id} onChange={value => setForm(prev => ({ ...prev, linked_entity_id: value }))} />
          <TextInput label="VKN / TCKN" value={form.tax_number} onChange={value => setForm(prev => ({ ...prev, tax_number: value }))} />
          <TextInput label="Vergi Dairesi" value={form.tax_office} onChange={value => setForm(prev => ({ ...prev, tax_office: value }))} />
          <TextInput label="Sehir" value={form.city} onChange={value => setForm(prev => ({ ...prev, city: value }))} />
          <TextInput label="Telefon" value={form.phone} onChange={value => setForm(prev => ({ ...prev, phone: value }))} />
          <TextInput label="E-posta" value={form.email} onChange={value => setForm(prev => ({ ...prev, email: value }))} />
          <TextInput label="Para Birimi" value={form.currency} onChange={value => setForm(prev => ({ ...prev, currency: value.toUpperCase() }))} />
          <TextInput label="Acilis Bakiyesi" type="number" value={form.opening_balance} onChange={value => setForm(prev => ({ ...prev, opening_balance: value }))} />
          <TextInput label="Risk Limiti" type="number" value={form.risk_limit} onChange={value => setForm(prev => ({ ...prev, risk_limit: value }))} />
          <TextInput label="Odeme Kosullari" value={form.payment_terms} onChange={value => setForm(prev => ({ ...prev, payment_terms: value }))} />
          <label className="space-y-1 text-sm md:col-span-3">
            <span className="font-medium text-gray-700 dark:text-gray-200">Notlar</span>
            <textarea value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} className="min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Vazgec</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.company_id || !form.account_name}>
            {saving ? 'Kaydediliyor...' : 'Cari Kart Olustur'}
          </button>
        </div>
      </form>
    </div>
  )
}

function EmptyAccounts({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Building2 size={28} className="text-gray-400" />
      <div>
        <p className="font-medium text-gray-900 dark:text-white">Cari kart bulunamadi</p>
        <p className="mt-1 text-sm text-gray-500">Musteri, tedarikci veya muhtelif cari kart olusturarak baslayin.</p>
      </div>
      {canCreate && <button className="btn btn-primary" onClick={onCreate}><Plus size={16} />Cari Kart Ekle</button>}
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

function TextInput({ label, value, onChange, type = 'text', placeholder, required }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <input required={required} type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900" />
    </label>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'debit' | 'credit' }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${tone === 'credit' ? 'text-emerald-700 dark:text-emerald-300' : tone === 'debit' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{value}</p>
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

function Notice({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"><FileText size={16} className="mr-2 inline" />{text}</div>
}

function Balance({ value }: { value: number }) {
  const className = value > 0 ? 'text-blue-700 dark:text-blue-300' : value < 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300'
  return <span className={`font-semibold ${className}`}>{formatMoney(value)}</span>
}

function formatMoney(value: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value || 0))
}

function maskIdentity(value?: string | null) {
  if (!value) return '-'
  const clean = String(value)
  if (clean.length <= 4) return clean
  return `${clean.slice(0, 2)}${'*'.repeat(Math.max(2, clean.length - 4))}${clean.slice(-2)}`
}
