'use client'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Eye, History, Landmark, Pencil, Power, Star } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import Modal from '@/components/ui/Modal'
import { SmartDataTable, type ColumnDef, type SortConfig, type WidgetDef } from '@/components/ui/SmartDataTable'
import { AutomationBadge, type AutomationBadgeStatus } from '@/components/ui/AutomationBadge'
import { Toast } from '@/components/ui/Toast'
import { formControlClass } from '@/components/ui/formControlStyles'
import { usePermissions } from '@/lib/security/permissionStore'
import { getTurkishIbanBanks, resolveTurkishIban } from '@/lib/utils'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import {
  bankAccountsCardsService,
  type BankAccountCardPayload,
  type BankAccountCardRow,
} from '@/lib/modules/accounting/bank-integration/bankAccountsCards.service'
import { companyService } from '@/lib/services/companyService'
import type { ListMeta } from '@/lib/api/listEndpoint'

type PageState = 'list' | 'create' | 'edit' | 'view'
type RecordType = 'account' | 'card'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type Option = { value: string; label: string }

const ACCOUNT_TYPES = [
  ['vadesiz', 'Vadesiz'],
  ['vadeli', 'Vadeli'],
  ['doviz', 'Döviz'],
  ['kredi', 'Kredi'],
  ['pos', 'POS'],
  ['other', 'Diğer'],
]

const CARD_TYPES = [
  ['credit_card', 'Kredi Kartı'],
  ['debit_card', 'Banka Kartı'],
  ['virtual_card', 'Sanal Kart'],
  ['company_card', 'Şirket Kartı'],
  ['pos_card', 'POS Kartı'],
  ['other', 'Diğer'],
]

const CURRENCIES = [['TRY', 'TRY'], ['USD', 'USD'], ['EUR', 'EUR'], ['GBP', 'GBP']]
const STATUSES = [['active', 'Aktif'], ['passive', 'Pasif']]

const emptyForm: BankAccountCardPayload = {
  record_type: 'account',
  company_id: '',
  bank_name: '',
  branch_name: '',
  branch_code: '',
  status: 'active',
  currency: 'TRY',
  account_type: 'vadesiz',
  card_type: 'credit_card',
  is_default: false,
}

export default function BankAccountsCardsPage() {
  const { can } = usePermissions()
  const [pageState, setPageState] = useState<PageState>('list')
  const [rows, setRows] = useState<BankAccountCardRow[]>([])
  const [accountOptions, setAccountOptions] = useState<Option[]>([])
  const [companies, setCompanies] = useState<Option[]>([])
  const [companiesLoaded, setCompaniesLoaded] = useState(false)
  const [selected, setSelected] = useState<BankAccountCardRow | null>(null)
  const [form, setForm] = useState<BankAccountCardPayload>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [includePassive, setIncludePassive] = useState(false)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'bank_name', direction: 'asc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [showPassivateConfirm, setShowPassivateConfirm] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const canView = can(ACCOUNTING_PERMISSIONS.bankAccountsCardsView) || can(ACCOUNTING_PERMISSIONS.bankAccountsView) || can(ACCOUNTING_PERMISSIONS.bankCardsView)
  const canInsert = can(ACCOUNTING_PERMISSIONS.bankAccountsCardsInsert) || can(ACCOUNTING_PERMISSIONS.bankAccountsInsert) || can(ACCOUNTING_PERMISSIONS.bankCardsInsert)
  const canEditRecord = can(ACCOUNTING_PERMISSIONS.bankAccountsCardsEdit) || can(ACCOUNTING_PERMISSIONS.bankAccountsEdit) || can(ACCOUNTING_PERMISSIONS.bankCardsEdit)

  const loadRows = async () => {
    setLoading(true)
    try {
      const payload = await bankAccountsCardsService.getUnifiedRecords({ includePassive, ...listQuery })
      setRows(payload.data || [])
      setListMeta(payload.meta ?? { page: listQuery.page, pageSize: listQuery.pageSize, total: payload.data?.length ?? 0, totalPages: 1 })
      setAccountOptions((payload.accountOptions || []).map(option => ({ value: option.value, label: option.label })))
    } catch (error) {
      setToast({ type: 'error', title: 'Hata', message: error instanceof Error ? error.message : 'Hesap ve kartlar yüklenemedi.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [includePassive, listQuery])

  const loadCompanyOptions = async () => {
    if (companiesLoaded) return
    const options = await loadCompanies()
    setCompanies(options)
    setCompaniesLoaded(true)
    if (options.length === 1) setForm(prev => ({ ...prev, company_id: prev.company_id || options[0].value }))
  }

  useEffect(() => {
    if (pageState !== 'list') {
      loadCompanyOptions().catch(() => {
        setCompanies([])
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageState])

  const columns: ColumnDef[] = [
    { key: 'record_type_label', label: 'Kayıt Tipi', type: 'text', width: 90 },
    { key: 'company_name', label: 'Şirket', type: 'text', width: 140 },
    { key: 'bank_name', label: 'Banka', type: 'text', width: 130 },
    { key: 'branch_display', label: 'Şube', type: 'text', width: 130 },
    { key: 'identity_display', label: 'IBAN / Son 4 Hane', type: 'text', width: 190 },
    { key: 'name', label: 'Hesap / Kart Adı', type: 'text', width: 170 },
    { key: 'currency', label: 'Para Birimi', type: 'text', width: 90 },
    { key: 'type_label', label: 'Hesap / Kart Tipi', type: 'text', width: 130 },
    { key: 'is_default_label', label: 'Varsayılan mı?', type: 'text', width: 110 },
    { key: 'balance_limit_display', label: 'Son Bakiye / Limit', type: 'text', width: 140 },
    { key: 'status', label: 'Durum', type: 'text', width: 80 },
    { key: 'actions', label: 'İşlemler', type: 'text', width: 330, fixedWidth: true, render: (_value, row) => <RowActions row={row} onAction={handleRowAction} /> },
  ]

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Tanımlı Kayıt', render: () => rows.length },
    { key: 'accounts', label: 'Hesap', render: () => rows.filter(row => row.record_type === 'account').length },
    { key: 'cards', label: 'Kart', render: () => rows.filter(row => row.record_type === 'card').length },
    { key: 'defaults', label: 'Varsayılan', render: () => rows.filter(row => row.is_default).length },
  ], [rows])
  const bankOptions = useMemo(() => getTurkishIbanBanks().map(bank => [bank.bankName, bank.bankName]), [])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'bank_name', direction: sort?.direction || 'asc' }))
  }

  const openCreate = () => {
    setSelected(null)
    setForm({ ...emptyForm, company_id: companies.length === 1 ? companies[0].value : '' })
    setPageState('create')
  }

  const openRow = (row: BankAccountCardRow, mode: PageState) => {
    setSelected(row)
    setForm(rowToForm(row))
    setPageState(mode)
  }

  async function handleRowAction(action: string, row: BankAccountCardRow) {
    if (action === 'view' || action === 'edit') return openRow(row, action)
    try {
      if (action === 'default') await bankAccountsCardsService.setDefaultUnifiedRecord(row.id)
      if (action === 'passivate') await bankAccountsCardsService.passivateUnifiedRecord(row.id)
      if (action === 'history') {
        setToast({ type: 'warning', title: 'Geçmiş', message: 'Geçmiş görünümü audit altyapısına bağlanmak üzere hazır.' })
        return
      }
      setToast({ type: 'success', title: 'İşlem tamamlandı', message: 'Kayıt güncellendi.' })
      await loadRows()
    } catch (error) {
      setToast({ type: 'error', title: 'İşlem tamamlanamadı', message: error instanceof Error ? error.message : 'Kayıt güncellenemedi.' })
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = normalizeForm(form)
      if (pageState === 'edit' && selected) {
        await bankAccountsCardsService.updateUnifiedRecord(selected.id, payload)
      } else {
        await bankAccountsCardsService.createUnifiedRecord(payload)
      }
      setToast({ type: 'success', title: 'Kaydedildi', message: 'Banka hesap/kart kaydı oluşturuldu.' })
      await loadRows()
      setPageState('list')
      setSelected(null)
    } catch (error) {
      setToast({ type: 'error', title: 'Kaydedilemedi', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
    } finally {
      setSaving(false)
    }
  }

  const passivateSelected = async () => {
    if (!selected) return

    try {
      await bankAccountsCardsService.passivateUnifiedRecord(selected.id)
      setToast({ type: 'success', title: 'Kayit pasife alindi', message: 'Banka hesap/kart kaydi pasife cekildi.' })
      await loadRows()
      setPageState('list')
      setSelected(null)
      setShowPassivateConfirm(false)
    } catch (error) {
      setToast({ type: 'error', title: 'Islem tamamlanamadi', message: error instanceof Error ? error.message : 'Kayit pasife alinamadi.' })
    }
  }

  if (!canView) {
    return <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">Bu sayfayı görüntüleme yetkiniz yok.</div>
  }

  return (
    <div className="relative">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        title="Banka Hesapları ve Kartları"
        subtitle="Şirketlerin banka hesaplarını ve kartlarını tanımlayın."
        icon={<Landmark size={24} />}
        onAddClick={pageState === 'list' && canInsert ? openCreate : undefined}
        onBackClick={pageState === 'list' ? undefined : () => { setPageState('list'); setSelected(null) }}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <Modal
        open={showPassivateConfirm}
        onClose={() => setShowPassivateConfirm(false)}
        title="Kaydi Pasife Al"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowPassivateConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Vazgec
            </button>
            <button
              type="button"
              onClick={passivateSelected}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Pasife Al
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>Bu kayit silinmeyecek, sadece pasife alinacaktir.</p>
          <p>Kayitla iliskili hesap hareketleri veya master kart verileri olabilecegi icin gecmis veri korunur.</p>
        </div>
      </Modal>

      {pageState === 'list' ? (
        <SmartDataTable
          columns={columns}
          data={rows}
          loading={loading}
          widgets={widgets}
          defaultView="list"
          storageKey="bank-accounts-cards-unified"
          emptyText="Tanımlı banka hesabı veya kart bulunamadı"
          onRefresh={loadRows}
          onRowClick={(row: any) => openRow(row, 'view')}
          defaultPageSize={listQuery.pageSize}
          pagination={{
            mode: 'server',
            page: listMeta.page,
            pageSize: listMeta.pageSize,
            total: listMeta.total,
            onPageChange: page => setListQuery(prev => ({ ...prev, page })),
            onPageSizeChange: pageSize => setListQuery(prev => ({ ...prev, page: 1, pageSize })),
            onSearchChange: search => setListQuery(prev => ({ ...prev, page: 1, search })),
            onSortChange: handleListSortChange,
          }}
          showPassiveToggle
          includePassive={includePassive}
          onIncludePassiveChange={(next) => {
            setIncludePassive(next)
            setListQuery(prev => ({ ...prev, page: 1 }))
          }}
        />
      ) : (
        <RecordForm
          form={form}
          readOnly={pageState === 'view'}
          saving={saving}
          isCreate={pageState === 'create'}
          companies={companies}
          accountOptions={accountOptions}
          bankOptions={bankOptions}
          onChange={patch => setForm(prev => ({ ...prev, ...patch }))}
          onSave={save}
          onEdit={() => setPageState('edit')}
          onDelete={() => setShowPassivateConfirm(true)}
          canEdit={canEditRecord}
        />
      )}
    </div>
  )
}

function RecordForm({
  form,
  readOnly,
  saving,
  isCreate,
  companies,
  accountOptions,
  bankOptions,
  onChange,
  onSave,
  onEdit,
  onDelete,
  canEdit,
}: {
  form: BankAccountCardPayload
  readOnly: boolean
  saving: boolean
  isCreate: boolean
  companies: Option[]
  accountOptions: Option[]
  bankOptions: string[][]
  onChange: (patch: Partial<BankAccountCardPayload>) => void
  onSave: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const isAccount = form.record_type === 'account'
  const hasCompany = !!form.company_id
  const canEditRecordType = !readOnly && hasCompany
  const canEditAccountFields = !readOnly && hasCompany && form.record_type === 'account'
  const canEditCardFields = !readOnly && hasCompany && form.record_type === 'card' && !isCreate
  const resolvedIban = isAccount ? resolveTurkishIban(form.iban || '') : null
  const ibanAutomationStatus = getBankAccountIbanAutomationStatus(form.iban, resolvedIban)
  const canSaveRecord = !saving && hasCompany && (!isCreate || (isAccount && !!resolvedIban))
  const handleIbanChange = (value: string) => {
    const normalizedIban = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const details = resolveTurkishIban(normalizedIban)
    onChange({
      iban: normalizedIban,
      ...(details ? {
        bank_name: details.bankName,
        account_no: details.accountNo,
        branch_code: details.branchCode,
        branch_name: details.branchName,
      } : {}),
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500">Banka kaydı</div>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{isAccount ? form.account_name || 'Yeni Hesap' : form.card_name || 'Yeni Kart'}</h2>
          </div>
          <div className="flex gap-2">
            {readOnly && canEdit && !isCreate && <button className="btn border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30" onClick={onDelete}>Pasife Al</button>}
            {readOnly && canEdit && <button className="btn" onClick={onEdit}>Düzenle</button>}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SelectField label="Şirket" value={form.company_id || ''} options={[['', 'Şirket seçiniz'], ...companies.map(company => [company.value, company.label])]} disabled={readOnly} onChange={value => onChange({ company_id: value || null })} />
          <SelectField label="Kayıt Tipi" value={form.record_type} options={[['account', 'Hesap'], ['card', 'Kart']]} disabled={!canEditRecordType} onChange={value => onChange({ record_type: value as RecordType })} />
          {isAccount && (
            <TextField
              label="IBAN"
              value={formatIbanInput(form.iban)}
              disabled={!canEditAccountFields}
              onChange={handleIbanChange}
              automationBadge={(
                <AutomationBadge
                  status={ibanAutomationStatus}
                  title="IBAN girilince banka, hesap ve şube alanları otomatik doldurulur."
                  workingLabel="Çözülüyor"
                />
              )}
            />
          )}
          <SelectField label="Durum" value={form.status || 'active'} options={STATUSES} disabled={readOnly} onChange={value => onChange({ status: value })} />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{isAccount ? 'Çözümlenen Hesap Bilgileri' : 'Kart Bilgileri'}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {isAccount ? (
            <>
              <SelectField label="Banka" value={form.bank_name || ''} options={[['', 'IBAN ile doldurulur'], ...bankOptions]} disabled onChange={value => onChange({ bank_name: value })} />
              <TextField label="Hesap No" value={form.account_no} readOnly onChange={value => onChange({ account_no: value })} />
              <TextField label="Şube Adı" value={form.branch_name} readOnly onChange={value => onChange({ branch_name: value })} />
              <TextField label="Şube Kodu" value={form.branch_code} readOnly onChange={value => onChange({ branch_code: value.replace(/\D/g, '') })} />
              <TextField label="Hesap Adı" value={form.account_name} disabled={!canEditAccountFields} onChange={value => onChange({ account_name: value })} />
              <SelectField label="Para Birimi" value={form.currency || 'TRY'} options={CURRENCIES} disabled={!canEditAccountFields} onChange={value => onChange({ currency: value })} />
              <SelectField label="Hesap Tipi" value={form.account_type || 'vadesiz'} options={ACCOUNT_TYPES} disabled={!canEditAccountFields} onChange={value => onChange({ account_type: value })} />
              <TextField label="Açılış Tarihi" type="date" value={form.opening_date} disabled={!canEditAccountFields} onChange={value => onChange({ opening_date: value })} />
              <CheckboxField label="Varsayılan Hesap mı?" checked={!!form.is_default} disabled={!canEditAccountFields} onChange={value => onChange({ is_default: value })} />
            </>
          ) : (
            <>
              <TextField label="Kart Adı" value={form.card_name} disabled={!canEditCardFields} onChange={value => onChange({ card_name: value })} />
              <SelectField label="Kart Tipi" value={form.card_type || 'credit_card'} options={CARD_TYPES} disabled={!canEditCardFields} onChange={value => onChange({ card_type: value })} />
              <TextField label="Son 4 Hane" value={form.last_four_digits} disabled={!canEditCardFields} onChange={value => onChange({ last_four_digits: value.replace(/\D/g, '').slice(0, 4) })} />
              <SelectField label="Bağlı Hesap" value={form.linked_bank_account_id || ''} options={[['', 'Opsiyonel'], ...accountOptions.map(option => [option.value, option.label])]} disabled={!canEditCardFields} onChange={value => onChange({ linked_bank_account_id: value || null })} />
              <SelectField label="Para Birimi" value={form.currency || 'TRY'} options={CURRENCIES} disabled={!canEditCardFields} onChange={value => onChange({ currency: value })} />
              <TextField label="Limit" type="number" value={form.limit_amount} disabled={!canEditCardFields} onChange={value => onChange({ limit_amount: value })} />
              <TextField label="Kullanılabilir Limit" type="number" value={form.available_limit} disabled={!canEditCardFields} onChange={value => onChange({ available_limit: value })} />
              <TextField label="Ekstre Kesim Günü" type="number" value={form.statement_day} disabled={!canEditCardFields} onChange={value => onChange({ statement_day: value })} />
              <TextField label="Son Ödeme Günü" type="number" value={form.payment_due_day} disabled={!canEditCardFields} onChange={value => onChange({ payment_due_day: value })} />
              <CheckboxField label="Varsayılan Kart mı?" checked={!!form.is_default} disabled={!canEditCardFields} onChange={value => onChange({ is_default: value })} />
            </>
          )}
        </div>
        {!isAccount && <p className="mt-3 text-xs text-gray-500">Kart numarasının tamamı saklanmaz; yalnızca son 4 hane tutulur.</p>}
      </section>
      {!readOnly && (
        <div className="flex justify-end">
          <button disabled={!canSaveRecord} className="btn btn-primary disabled:opacity-50" onClick={onSave}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
      )}
    </div>
  )
}

function RowActions({ row, onAction }: { row: BankAccountCardRow; onAction: (action: string, row: BankAccountCardRow) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <ActionButton onClick={() => onAction('view', row)} icon={<Eye size={11} />}>Görüntüle</ActionButton>
      <ActionButton onClick={() => onAction('edit', row)} icon={<Pencil size={11} />}>Düzenle</ActionButton>
      <ActionButton onClick={() => onAction('default', row)} icon={<Star size={11} />}>Varsayılan Yap</ActionButton>
      <ActionButton onClick={() => onAction('passivate', row)} icon={<Power size={11} />}>Pasifleştir</ActionButton>
      <ActionButton onClick={() => onAction('history', row)} icon={<History size={11} />}>Geçmiş</ActionButton>
      <Link href={`/app/muhasebe/hesap-ve-kart-hareketleri?${row.record_type === 'account' ? 'accountId' : 'cardId'}=${row.raw_id}`} onClick={event => event.stopPropagation()} className="rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300">Hareketler</Link>
    </div>
  )
}

function ActionButton({ children, icon, onClick }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return <button className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200" onClick={(event) => { event.stopPropagation(); onClick() }}>{icon}{children}</button>
}

function TextField({ label, value, onChange, readOnly, disabled, type = 'text', automationBadge }: { label: string; value: any; onChange: (value: string) => void; readOnly?: boolean; disabled?: boolean; type?: string; automationBadge?: ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
        {label}
        {automationBadge}
      </span>
      <input type={type} value={value ?? ''} readOnly={readOnly} disabled={disabled} onChange={event => onChange(event.target.value)} className={formControlClass({ rounded: 'md', className: 'mt-1 h-10' })} />
    </label>
  )
}

function getBankAccountIbanAutomationStatus(value: any, resolvedIban: ReturnType<typeof resolveTurkishIban>): AutomationBadgeStatus {
  const clean = String(value || '').replace(/\s/g, '').toUpperCase()
  if (!clean) return 'idle'
  if (resolvedIban) return 'done'
  if (clean.length < 10) return 'working'
  return 'no_data'
}

function SelectField({ label, value, options, onChange, disabled }: { label: string; value: any; options: string[][]; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <select value={value ?? ''} disabled={disabled} onChange={event => onChange(event.target.value)} className={formControlClass({ rounded: 'md', className: 'mt-1 h-10' })}>
        {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
      </select>
    </label>
  )
}

function CheckboxField({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="mt-6 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
      {label}
    </label>
  )
}

function formatIbanInput(value?: string | null) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function rowToForm(row: BankAccountCardRow): BankAccountCardPayload {
  const raw = row.raw || {}
  return {
    record_type: row.record_type,
    company_id: row.company_id || '',
    bank_name: row.bank_name,
    branch_name: row.branch_name || raw.branch_name || '',
    branch_code: row.branch_code || raw.branch_code || '',
    status: row.status || 'active',
    currency: row.currency || 'TRY',
    is_default: !!row.is_default,
    iban: raw.iban || '',
    account_no: raw.account_no || '',
    account_name: raw.account_name || '',
    account_type: raw.account_type || 'vadesiz',
    opening_date: raw.opening_date || '',
    linked_bank_account_id: raw.linked_bank_account_id || '',
    card_name: raw.card_name || '',
    card_type: raw.card_type || 'credit_card',
    last_four_digits: raw.last_four_digits || '',
    limit_amount: raw.limit_amount ?? '',
    available_limit: raw.available_limit ?? '',
    statement_day: raw.statement_day ?? '',
    payment_due_day: raw.payment_due_day ?? '',
  }
}

function normalizeForm(form: BankAccountCardPayload): BankAccountCardPayload {
  const base = {
    record_type: form.record_type,
    company_id: form.company_id || null,
    bank_name: form.bank_name,
    branch_name: form.branch_name || null,
    branch_code: form.branch_code || null,
    currency: form.currency || 'TRY',
    is_default: !!form.is_default,
    status: form.status || 'active',
  }
  if (form.record_type === 'account') {
    return {
      ...base,
      iban: form.iban || null,
      account_no: form.account_no || null,
      account_name: form.account_name || form.iban || form.account_no || null,
      account_type: form.account_type || 'vadesiz',
      opening_date: form.opening_date || null,
    }
  }
  return {
    ...base,
    card_name: form.card_name || form.last_four_digits || null,
    card_type: form.card_type || 'credit_card',
    last_four_digits: form.last_four_digits || null,
    linked_bank_account_id: form.linked_bank_account_id || null,
    limit_amount: form.limit_amount ?? null,
    available_limit: form.available_limit ?? null,
    statement_day: form.statement_day ?? null,
    payment_due_day: form.payment_due_day ?? null,
  }
}

async function loadCompanies(): Promise<Option[]> {
  const payload = await companyService.list()
  return (payload.data || []).map((company: any) => ({
    value: company.id,
    label: company.short_name || company.trade_name || 'Şirket',
  }))
}
