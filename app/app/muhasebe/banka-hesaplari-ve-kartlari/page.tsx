'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, CreditCard, DatabaseZap, FileText, History, KeyRound, Landmark, Plus, RefreshCw, Settings2, TestTube2 } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef, type WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { usePermissions } from '@/lib/security/permissionStore'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import {
  bankAccountsCardsService,
  type BankAutomationPreviewPayload,
  type BankAccountRow,
  type BankCardRow,
  type BankConnectionRow,
} from '@/lib/modules/accounting/bank-integration/bankAccountsCards.service'

type PageState = 'list' | 'view' | 'create' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type TabKey = 'genel' | 'hesaplar' | 'kartlar' | 'entegrasyon' | 'belgeler' | 'gecmis'
type CompanyOption = { value: string; label: string }
type AutomationDraft = {
  clientId: string
  clientSecret: string
  tokenEndpoint: string
  consentId: string
  unitNum: string
  accountNum: string
  IBAN: string
  tokenAuthMethod: string
}

const BANK_AUTOMATIONS: Record<string, { label: string; baseUrl: string; tokenEndpoint: string }> = {
  garanti: {
    label: 'Garanti BBVA Account Information',
    baseUrl: 'https://apis.garantibbva.com.tr:443',
    tokenEndpoint: 'https://apis.garantibbva.com.tr:443/oauth2/token',
  },
}

const PROVIDERS = [
  ['garanti', 'Garanti BBVA'],
  ['isbankasi', 'İş Bankası'],
  ['akbank', 'Akbank'],
  ['yapikredi', 'Yapı Kredi'],
  ['qnb', 'QNB'],
  ['ziraat', 'Ziraat'],
  ['manual', 'Manuel'],
  ['other', 'Diğer'],
]

const INTEGRATION_TYPES = [
  ['api', 'API'],
  ['manual', 'Manuel'],
  ['csv_excel', 'CSV / Excel'],
  ['mt940', 'MT940'],
  ['other', 'Diğer'],
]

const CONNECTION_STATUSES = [
  ['connected', 'Bağlı'],
  ['not_connected', 'Bağlı Değil'],
  ['pending_test', 'Test Bekliyor'],
  ['error', 'Hata'],
  ['expired', 'Yetki Süresi Doldu'],
  ['passive', 'Pasif'],
]

const connectionColumns: ColumnDef[] = [
  { key: 'bank_name', label: 'Banka', type: 'text', width: 150, sortable: true },
  { key: 'company_name', label: 'Şirket', type: 'text', width: 140 },
  { key: 'provider_label', label: 'Provider', type: 'text', width: 120 },
  { key: 'integration_label', label: 'Entegrasyon Tipi', type: 'text', width: 130 },
  { key: 'account_count', label: 'Hesap Sayısı', type: 'number', width: 100 },
  { key: 'card_count', label: 'Kart Sayısı', type: 'number', width: 90 },
  { key: 'connection_status_label', label: 'Bağlantı Durumu', type: 'text', width: 140 },
  { key: 'last_sync_at', label: 'Son Senkronizasyon', type: 'date', width: 150 },
  { key: 'status_label', label: 'Durum', type: 'text', width: 90 },
  { key: 'actions', label: 'İşlemler', type: 'text', width: 290, fixedWidth: true, render: (_value, row) => <ConnectionActions row={row} /> },
]

export default function BankAccountsCardsPage() {
  const { can } = usePermissions()
  const [pageState, setPageState] = useState<PageState>('list')
  const [rows, setRows] = useState<BankConnectionRow[]>([])
  const [selected, setSelected] = useState<(BankConnectionRow & { accounts?: BankAccountRow[]; cards?: BankCardRow[] }) | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('genel')
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const loadRows = async () => {
    setLoading(true)
    try {
      const payload = await bankAccountsCardsService.getConnections()
      setRows(payload.data || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Hata', message: error instanceof Error ? error.message : 'Banka bağlantıları yüklenemedi.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
    loadCompanies().then(setCompanies).catch(() => setCompanies([]))
  }, [])

  const tableData = rows.map(row => ({
    ...row,
    provider_label: providerLabel(row.provider_code),
    integration_label: integrationLabel(row.integration_type),
    connection_status_label: connectionStatusLabel(row.connection_status),
    status_label: row.status === 'active' ? 'Aktif' : 'Pasif',
  }))

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'connections', label: 'Toplam Banka Bağlantısı', render: () => rows.length },
    { key: 'accounts', label: 'Aktif Hesap Sayısı', render: () => rows.reduce((sum, row) => sum + Number(row.account_count || 0), 0) },
    { key: 'cards', label: 'Aktif Kart Sayısı', render: () => rows.reduce((sum, row) => sum + Number(row.card_count || 0), 0) },
    { key: 'lastSync', label: 'Son Senkronizasyon Durumu', render: () => latestSyncText(rows) },
    { key: 'unmatched', label: 'Eşleşmeyen Hareket Sayısı', render: () => 'Hareket ekranında' },
  ], [rows])

  const openConnection = async (row: BankConnectionRow, mode: PageState = 'view') => {
    try {
      const payload = await bankAccountsCardsService.getConnection(row.id)
      setSelected(payload.data)
      setPageState(mode)
      setActiveTab('genel')
    } catch (error) {
      setToast({ type: 'error', title: 'Detay yüklenemedi', message: error instanceof Error ? error.message : 'Banka bağlantısı detayı alınamadı.' })
    }
  }

  const handleCreate = () => {
    setSelected({
      id: '',
      bank_name: '',
      provider_code: 'manual',
      integration_type: 'manual',
      connection_status: 'not_connected',
      environment: 'sandbox',
      status: 'active',
      accounts: [],
      cards: [],
    })
    setPageState('create')
    setActiveTab('genel')
  }

  const saveConnection = async (payload: Partial<BankConnectionRow>, automatedAccounts?: Partial<BankAccountRow>[]) => {
    setSaving(true)
    try {
      const result = pageState === 'create'
        ? await bankAccountsCardsService.createConnection(payload)
        : await bankAccountsCardsService.updateConnection(selected!.id, payload)
      if (automatedAccounts?.length) {
        for (const account of automatedAccounts) {
          await bankAccountsCardsService.createAccount(result.data.id, account)
        }
      }
      setToast({ type: 'success', title: 'Kaydedildi', message: 'Banka bağlantısı kaydedildi.' })
      await loadRows()
      await openConnection(result.data, 'view')
      return result.data
    } catch (error) {
      setToast({ type: 'error', title: 'Kaydedilemedi', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
      return undefined
    } finally {
      setSaving(false)
    }
  }

  if (!can(ACCOUNTING_PERMISSIONS.bankConnectionsView)) {
    return <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">Bu sayfayı görüntüleme yetkiniz yok.</div>
  }

  return (
    <div className="relative">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        title={pageState === 'list' ? 'Banka Hesapları ve Kartları' : selected?.bank_name || 'Banka Bağlantısı'}
        subtitle="Şirket banka bağlantılarını, hesaplarını, kartlarını ve entegrasyon ayarlarını yönetin."
        icon={<Landmark size={24} />}
        onAddClick={can(ACCOUNTING_PERMISSIONS.bankConnectionsInsert) ? handleCreate : undefined}
        addButtonText="Yeni Banka Bağlantısı Ekle"
        onBackClick={() => { setPageState('list'); setSelected(null) }}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' ? (
        <div className="space-y-4">
          <ActionBar onRefresh={loadRows} />
          <SmartDataTable
            columns={connectionColumns}
            data={tableData}
            loading={loading}
            widgets={widgets}
            defaultView="list"
            storageKey="bank-accounts-cards-connections"
            emptyText="Banka bağlantısı bulunamadı"
            onRefresh={loadRows}
            onRowClick={(row: any) => openConnection(row, 'view')}
          />
        </div>
      ) : selected && (
        <ConnectionForm
          mode={pageState}
          selected={selected}
          companies={companies}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          saving={saving}
          canEdit={can(ACCOUNTING_PERMISSIONS.bankConnectionsEdit)}
          onSave={saveConnection}
          onModeChange={setPageState}
          onReload={() => selected.id ? openConnection(selected, 'view') : undefined}
          onToast={setToast}
        />
      )}
    </div>
  )
}

function ConnectionActions({ row }: { row: any }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <ActionLink href={`/app/muhasebe/hesap-ve-kart-hareketleri?bankConnectionId=${row.id}`}>Hareketler</ActionLink>
      <ActionLink href={`/app/muhasebe/banka-hesaplari-ve-kartlari?connectionId=${row.id}`}>Hesaplar</ActionLink>
      <ActionLink href={`/app/muhasebe/banka-hesaplari-ve-kartlari?connectionId=${row.id}`}>Kartlar</ActionLink>
    </div>
  )
}

function ConnectionForm({
  mode,
  selected,
  companies,
  activeTab,
  setActiveTab,
  saving,
  canEdit,
  onSave,
  onModeChange,
  onReload,
  onToast,
}: {
  mode: PageState
  selected: BankConnectionRow & { accounts?: BankAccountRow[]; cards?: BankCardRow[] }
  companies: CompanyOption[]
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
  saving: boolean
  canEdit: boolean
  onSave: (payload: Partial<BankConnectionRow>, automatedAccounts?: Partial<BankAccountRow>[]) => Promise<BankConnectionRow | void>
  onModeChange: (mode: PageState) => void
  onReload: () => void
  onToast: (toast: ToastState) => void
}) {
  const [form, setForm] = useState<Partial<BankConnectionRow>>(selected)
  const [automation, setAutomation] = useState<AutomationDraft>(() => createAutomationDraft(selected.provider_code, selected.base_url))
  const [automationAccounts, setAutomationAccounts] = useState<Partial<BankAccountRow>[]>([])
  const [automationLoading, setAutomationLoading] = useState(false)
  const readOnly = mode === 'view'

  useEffect(() => {
    setForm(selected)
    setAutomation(createAutomationDraft(selected.provider_code, selected.base_url))
    setAutomationAccounts([])
  }, [selected])

  const updateForm = (patch: Partial<BankConnectionRow>) => setForm(prev => ({ ...prev, ...patch }))
  const automationConfig = BANK_AUTOMATIONS[String(form.provider_code || '')]
  const canRunAutomation = !!automationConfig && !readOnly

  const handleProviderChange = (providerCode: string) => {
    const config = BANK_AUTOMATIONS[providerCode]
    updateForm({
      provider_code: providerCode,
      bank_name: providerLabel(providerCode),
      integration_type: config ? 'api' : providerCode === 'manual' ? 'manual' : form.integration_type,
      base_url: config?.baseUrl || form.base_url,
      connection_status: config ? 'pending_test' : form.connection_status,
    })
    setAutomation(createAutomationDraft(providerCode, config?.baseUrl || form.base_url))
    setAutomationAccounts([])
  }

  const handleAutomation = async () => {
    if (!automationConfig) {
      onToast({ type: 'warning', title: 'Otomasyon yok', message: 'Seçili banka için otomasyon henüz tanımlı değil.' })
      return
    }

    setAutomationLoading(true)
    try {
      const payload: BankAutomationPreviewPayload = {
        id: selected.id || undefined,
        company_id: form.company_id || null,
        bank_name: form.bank_name || providerLabel(form.provider_code),
        provider_code: form.provider_code,
        credential_id: form.credential_id || null,
        environment: form.environment || 'sandbox',
        base_url: form.base_url || automationConfig.baseUrl,
        credentials: automation,
      }
      const result = await bankAccountsCardsService.previewAutomation(payload)
      const accounts = (result.data.accounts || []).map(mapProviderAccountToForm)
      setAutomationAccounts(accounts)
      updateForm({
        bank_name: result.data.bankName || form.bank_name || providerLabel(form.provider_code),
        connection_status: result.data.connectionStatus,
        integration_type: 'api',
        base_url: form.base_url || automationConfig.baseUrl,
      })
      onToast({ type: 'success', title: 'Otomasyon tamamlandı', message: `${accounts.length} hesap bilgisi forma alındı.` })
      setActiveTab('genel')
    } catch (error) {
      onToast({ type: 'error', title: 'Otomasyon başarısız', message: error instanceof Error ? error.message : 'Hesap bilgileri alınamadı.' })
    } finally {
      setAutomationLoading(false)
    }
  }

  const handleSave = () => onSave(form, automationAccounts.length ? automationAccounts : undefined)

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'genel', label: 'Genel', icon: <Building2 size={15} /> },
    { key: 'hesaplar', label: 'Hesaplar', icon: <Landmark size={15} /> },
    { key: 'kartlar', label: 'Kartlar', icon: <CreditCard size={15} /> },
    { key: 'entegrasyon', label: 'Entegrasyon', icon: <KeyRound size={15} /> },
    { key: 'belgeler', label: 'Belgeler', icon: <FileText size={15} /> },
    { key: 'gecmis', label: 'Geçmiş', icon: <History size={15} /> },
  ]

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500">Banka Bağlantısı</div>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{form.bank_name || 'Yeni Banka Bağlantısı'}</h2>
            <p className="mt-1 text-sm text-gray-500">{providerLabel(form.provider_code)} · {integrationLabel(form.integration_type)} · {connectionStatusLabel(form.connection_status)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === 'view' && canEdit && <button className="btn" onClick={() => onModeChange('edit')}>Düzenle</button>}
            {mode !== 'view' && <button disabled={saving} className="btn btn-primary" onClick={handleSave}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>}
            {selected.id && <button className="btn" onClick={() => testConnection(selected.id, onToast, onReload)}><TestTube2 size={16} />Test Et</button>}
            {selected.id && <button className="btn" onClick={() => syncConnection(selected.id, onToast, onReload)}><RefreshCw size={16} />Senkronize Et</button>}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'genel' && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SelectField label="Şirket" value={form.company_id || ''} options={[['', 'Şirket seçiniz'], ...companies.map(company => [company.value, company.label])]} disabled={readOnly} onChange={value => updateForm({ company_id: value || null })} />
            <SelectField label="Provider" value={form.provider_code} options={PROVIDERS} disabled={readOnly} onChange={handleProviderChange} />
            <TextField label="Banka Adı" value={form.bank_name} readOnly={readOnly} onChange={value => updateForm({ bank_name: value })} />
            <TextField label="Credential Reference" value={form.credential_id} readOnly={readOnly} onChange={value => updateForm({ credential_id: value })} />
            <TextField label="Base URL" value={form.base_url || automationConfig?.baseUrl} readOnly={readOnly} onChange={value => updateForm({ base_url: value })} />
            <SelectField label="Entegrasyon Tipi" value={form.integration_type} options={INTEGRATION_TYPES} disabled={readOnly} onChange={value => updateForm({ integration_type: value })} />
            <SelectField label="Bağlantı Durumu" value={form.connection_status} options={CONNECTION_STATUSES} disabled={readOnly} onChange={value => updateForm({ connection_status: value })} />
            <SelectField label="Durum" value={form.status} options={[['active', 'Aktif'], ['passive', 'Pasif']]} disabled={readOnly} onChange={value => updateForm({ status: value })} />
            <TextField label="Açıklama" value={form.notes} readOnly={readOnly} onChange={value => updateForm({ notes: value })} className="md:col-span-2 xl:col-span-3" />
          </div>
          {!readOnly && (
            <AutomationPanel
              providerCode={form.provider_code}
              automation={automation}
              accounts={automationAccounts}
              loading={automationLoading}
              disabled={!canRunAutomation}
              disabledReason={automationConfig ? undefined : 'Seçili banka için hesap bilgisi otomasyonu henüz tanımlı değil.'}
              onChange={patch => setAutomation(prev => ({ ...prev, ...patch }))}
              onRun={handleAutomation}
            />
          )}
          <p className="mt-3 text-xs text-gray-500">Şube bilgisi bağlantıda değil, hesap seviyesinde tutulur.</p>
        </section>
      )}

      {activeTab === 'hesaplar' && <AccountsTab connection={selected} accounts={selected.accounts || []} onToast={onToast} onReload={onReload} />}
      {activeTab === 'kartlar' && <CardsTab connection={selected} cards={selected.cards || []} onToast={onToast} onReload={onReload} />}
      {activeTab === 'entegrasyon' && <IntegrationTab connection={selected} />}
      {activeTab === 'belgeler' && <StaticPanel title="Belgeler" text="Merkezi Document Registry ile Yeni Belge Yükle ve Mevcut Belgeden Seç aksiyonları için alan hazırlandı. Belgeler tekrar yüklenmeden referanslanmalıdır." />}
      {activeTab === 'gecmis' && <StaticPanel title="Geçmiş" text="Bağlantı oluşturma, hesap/kart ekleme, credential güncelleme, test ve senkronizasyon olayları audit altyapısına bağlanmak üzere hazır." />}
    </div>
  )
}

function AccountsTab({ connection, accounts, onToast, onReload }: { connection: BankConnectionRow; accounts: BankAccountRow[]; onToast: (toast: ToastState) => void; onReload: () => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Partial<BankAccountRow>>({ account_name: '', currency: 'TRY', account_type: 'vadesiz', status: 'active' })
  const columns: ColumnDef[] = [
    { key: 'iban', label: 'IBAN', type: 'text', width: 190 },
    { key: 'account_no', label: 'Hesap No', type: 'text', width: 120 },
    { key: 'account_name', label: 'Hesap Adı', type: 'text', width: 150 },
    { key: 'branch_name', label: 'Şube Adı', type: 'text', width: 120 },
    { key: 'branch_code', label: 'Şube Kodu', type: 'text', width: 100 },
    { key: 'currency', label: 'Para Birimi', type: 'text', width: 90 },
    { key: 'account_type', label: 'Hesap Tipi', type: 'text', width: 90 },
    { key: 'is_default_label', label: 'Varsayılan mı?', type: 'text', width: 110 },
    { key: 'last_balance', label: 'Son Bakiye', type: 'number', width: 100 },
    { key: 'last_sync_at', label: 'Son Senkronizasyon', type: 'date', width: 140 },
    { key: 'status', label: 'Durum', type: 'text', width: 80 },
    { key: 'actions', label: 'İşlemler', type: 'text', width: 220, fixedWidth: true, render: (_v, row) => <RowActions movementHref={`/app/muhasebe/hesap-ve-kart-hareketleri?accountId=${row.id}`} /> },
  ]

  const save = async () => {
    try {
      await bankAccountsCardsService.createAccount(connection.id, form)
      onToast({ type: 'success', title: 'Hesap eklendi', message: 'Banka hesabı kaydedildi.' })
      setAdding(false)
      setForm({ account_name: '', currency: 'TRY', account_type: 'vadesiz', status: 'active' })
      onReload()
    } catch (error) {
      onToast({ type: 'error', title: 'Hesap eklenemedi', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
    }
  }

  return (
    <section className="space-y-3">
      <button className="btn btn-primary" onClick={() => setAdding(!adding)}><Plus size={16} />Hesap Ekle</button>
      {adding && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 md:grid-cols-3">
            <TextField label="IBAN" value={form.iban} onChange={value => setForm({ ...form, iban: value })} />
            <TextField label="Hesap No" value={form.account_no} onChange={value => setForm({ ...form, account_no: value })} />
            <TextField label="Hesap Adı" value={form.account_name} onChange={value => setForm({ ...form, account_name: value })} />
            <TextField label="Şube Adı" value={form.branch_name} onChange={value => setForm({ ...form, branch_name: value })} />
            <TextField label="Şube Kodu" value={form.branch_code} onChange={value => setForm({ ...form, branch_code: value })} />
            <SelectField label="Para Birimi" value={form.currency} options={[['TRY', 'TRY'], ['USD', 'USD'], ['EUR', 'EUR'], ['GBP', 'GBP']]} onChange={value => setForm({ ...form, currency: value })} />
            <SelectField label="Hesap Tipi" value={form.account_type} options={[['vadesiz', 'Vadesiz'], ['vadeli', 'Vadeli'], ['doviz', 'Döviz'], ['kredi', 'Kredi'], ['pos', 'POS'], ['other', 'Diğer']]} onChange={value => setForm({ ...form, account_type: value })} />
            <TextField label="Açılış Tarihi" type="date" value={form.opening_date} onChange={value => setForm({ ...form, opening_date: value })} />
          </div>
          <button className="btn btn-primary mt-3" onClick={save}>Kaydet</button>
        </div>
      )}
      <SmartDataTable columns={columns} data={accounts.map(row => ({ ...row, is_default_label: row.is_default ? 'Evet' : 'Hayır' }))} storageKey="bank-accounts-list" defaultView="list" emptyText="Bu bağlantıya ait hesap bulunamadı" />
    </section>
  )
}

function CardsTab({ connection, cards, onToast, onReload }: { connection: BankConnectionRow; cards: BankCardRow[]; onToast: (toast: ToastState) => void; onReload: () => void }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Partial<BankCardRow>>({ card_name: '', card_type: 'credit_card', currency: 'TRY', status: 'active' })
  const columns: ColumnDef[] = [
    { key: 'card_name', label: 'Kart Adı', type: 'text', width: 150 },
    { key: 'card_type', label: 'Kart Tipi', type: 'text', width: 100 },
    { key: 'last_four_digits', label: 'Son 4 Hane', type: 'text', width: 90 },
    { key: 'currency', label: 'Para Birimi', type: 'text', width: 90 },
    { key: 'limit_amount', label: 'Limit', type: 'number', width: 100 },
    { key: 'available_limit', label: 'Kullanılabilir Limit', type: 'number', width: 130 },
    { key: 'statement_day', label: 'Son Ekstre Tarihi', type: 'number', width: 130 },
    { key: 'last_sync_at', label: 'Son Senkronizasyon', type: 'date', width: 140 },
    { key: 'status', label: 'Durum', type: 'text', width: 80 },
    { key: 'actions', label: 'İşlemler', type: 'text', width: 220, fixedWidth: true, render: (_v, row) => <RowActions movementHref={`/app/muhasebe/hesap-ve-kart-hareketleri?cardId=${row.id}`} /> },
  ]

  const save = async () => {
    try {
      await bankAccountsCardsService.createCard(connection.id, form)
      onToast({ type: 'success', title: 'Kart eklendi', message: 'Kart kaydedildi. Tam kart numarası saklanmadı; yalnızca son 4 hane tutulur.' })
      setAdding(false)
      setForm({ card_name: '', card_type: 'credit_card', currency: 'TRY', status: 'active' })
      onReload()
    } catch (error) {
      onToast({ type: 'error', title: 'Kart eklenemedi', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
    }
  }

  return (
    <section className="space-y-3">
      <button className="btn btn-primary" onClick={() => setAdding(!adding)}><Plus size={16} />Kart Ekle</button>
      {adding && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 md:grid-cols-3">
            <TextField label="Kart Adı" value={form.card_name} onChange={value => setForm({ ...form, card_name: value })} />
            <SelectField label="Kart Tipi" value={form.card_type} options={[['credit_card', 'Kredi Kartı'], ['debit_card', 'Banka Kartı'], ['virtual_card', 'Sanal Kart'], ['company_card', 'Şirket Kartı'], ['pos_card', 'POS Kartı'], ['other', 'Diğer']]} onChange={value => setForm({ ...form, card_type: value })} />
            <TextField label="Son 4 Hane" value={form.last_four_digits} onChange={value => setForm({ ...form, last_four_digits: value.replace(/\D/g, '').slice(0, 4) })} />
            <SelectField label="Para Birimi" value={form.currency} options={[['TRY', 'TRY'], ['USD', 'USD'], ['EUR', 'EUR'], ['GBP', 'GBP']]} onChange={value => setForm({ ...form, currency: value })} />
            <TextField label="Limit" type="number" value={form.limit_amount} onChange={value => setForm({ ...form, limit_amount: Number(value) })} />
            <TextField label="Kullanılabilir Limit" type="number" value={form.available_limit} onChange={value => setForm({ ...form, available_limit: Number(value) })} />
            <TextField label="Ekstre Kesim Günü" type="number" value={form.statement_day} onChange={value => setForm({ ...form, statement_day: Number(value) })} />
            <TextField label="Son Ödeme Günü" type="number" value={form.payment_due_day} onChange={value => setForm({ ...form, payment_due_day: Number(value) })} />
          </div>
          <button className="btn btn-primary mt-3" onClick={save}>Kaydet</button>
        </div>
      )}
      <SmartDataTable columns={columns} data={cards} storageKey="bank-cards-list" defaultView="list" emptyText="Bu bağlantıya ait kart bulunamadı" />
    </section>
  )
}

function IntegrationTab({ connection }: { connection: BankConnectionRow }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Info label="Provider" value={providerLabel(connection.provider_code)} />
        <Info label="API Durumu" value={connectionStatusLabel(connection.connection_status)} />
        <Info label="Credential Reference" value={connection.credential_id || 'Tanımlı değil'} />
        <Info label="Sandbox / Production" value={connection.environment || 'sandbox'} />
        <Info label="Base URL" value={connection.base_url || '-'} />
        <Info label="Son Test Tarihi" value={formatDateTime(connection.last_test_at)} />
        <Info label="Son Senkronizasyon" value={formatDateTime(connection.last_sync_at)} />
        <Info label="Token Durumu" value="Credential vault üzerinden yönetilir" />
        <Info label="Hata Mesajı" value="-" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn"><KeyRound size={16} />Credential Ekle / Güncelle</button>
        <button className="btn"><TestTube2 size={16} />Bağlantıyı Test Et</button>
        <button className="btn"><DatabaseZap size={16} />Hesapları Çek</button>
        <button className="btn"><CreditCard size={16} />Kartları Çek</button>
        <button className="btn"><RefreshCw size={16} />Hareketleri Senkronize Et</button>
      </div>
      <p className="mt-3 text-xs text-gray-500">Client secret, API key, refresh token ve sertifika şifresi frontend&apos;de gösterilmez.</p>
    </section>
  )
}

function AutomationPanel({
  providerCode,
  automation,
  accounts,
  loading,
  disabled,
  disabledReason,
  onChange,
  onRun,
}: {
  providerCode?: string | null
  automation: AutomationDraft
  accounts: Partial<BankAccountRow>[]
  loading: boolean
  disabled: boolean
  disabledReason?: string
  onChange: (patch: Partial<AutomationDraft>) => void
  onRun: () => void
}) {
  const config = providerCode ? BANK_AUTOMATIONS[providerCode] : undefined

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Banka otomasyonu</h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            {config ? `${config.label} ile hesap bilgileri çekilir.` : 'Seçili banka için otomasyon henüz tanımlı değil.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={disabled || loading}
          title={disabledReason}
          onClick={onRun}
        >
          <DatabaseZap size={16} />
          {loading ? 'Çekiliyor...' : 'Otomatik Doldur'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <TextField label="Client ID" value={automation.clientId} onChange={value => onChange({ clientId: value })} />
        <TextField label="Client Secret" value={automation.clientSecret} type="password" onChange={value => onChange({ clientSecret: value })} />
        <TextField label="Consent ID" value={automation.consentId} onChange={value => onChange({ consentId: value })} />
        <TextField label="Token Endpoint" value={automation.tokenEndpoint} onChange={value => onChange({ tokenEndpoint: value })} />
        <TextField label="Şube No" value={automation.unitNum} onChange={value => onChange({ unitNum: value.replace(/\D/g, '') })} />
        <TextField label="Hesap No" value={automation.accountNum} onChange={value => onChange({ accountNum: value.replace(/\D/g, '') })} />
        <TextField label="IBAN" value={automation.IBAN} onChange={value => onChange({ IBAN: value.toUpperCase().replace(/\s/g, '') })} />
        <SelectField label="Token Kimlik Doğrulama" value={automation.tokenAuthMethod} options={[['body', 'Body'], ['basic', 'Basic Auth']]} onChange={value => onChange({ tokenAuthMethod: value })} />
      </div>

      {accounts.length > 0 && (
        <div className="mt-4 rounded-md border border-blue-100 bg-white p-3 dark:border-blue-900 dark:bg-gray-950">
          <div className="text-xs font-medium text-gray-500">Otomasyonla alınan hesaplar</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {accounts.map((account, index) => (
              <div key={`${account.iban || account.account_no || index}`} className="rounded-md border border-gray-100 p-2 text-xs dark:border-gray-800">
                <div className="font-semibold text-gray-900 dark:text-white">{account.account_name || account.iban || account.account_no}</div>
                <div className="mt-1 text-gray-500">{account.iban || account.account_no || '-'} · {account.currency || 'TRY'} · {account.last_balance ?? '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBar({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button className="btn"><Settings2 size={16} />Filtreler</button>
      <button className="btn" onClick={onRefresh}><RefreshCw size={16} />Senkronize Et</button>
      <button className="btn"><FileText size={16} />Dışa Aktar</button>
    </div>
  )
}

function RowActions({ movementHref }: { movementHref: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <ActionLink href={movementHref}>Hareketler</ActionLink>
      <button className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200">Senkronize Et</button>
      <button className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200">Geçmiş</button>
    </div>
  )
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} onClick={event => event.stopPropagation()} className="rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300">{children}</Link>
}

function TextField({ label, value, onChange, readOnly, type = 'text', className }: { label: string; value: any; onChange: (value: string) => void; readOnly?: boolean; type?: string; className?: string }) {
  return (
    <label className={`block ${className || ''}`}>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input type={type} value={value ?? ''} readOnly={readOnly} onChange={event => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-400 read-only:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:read-only:bg-gray-900" />
    </label>
  )
}

function SelectField({ label, value, options, onChange, disabled }: { label: string; value: any; options: string[][]; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <select value={value ?? ''} disabled={disabled} onChange={event => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-400 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-900">
        {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
      </select>
    </label>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950"><div className="text-xs text-gray-500">{label}</div><div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value}</div></div>
}

function StaticPanel({ title, text }: { title: string; text: string }) {
  return <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{text}</p></section>
}

async function testConnection(id: string, onToast: (toast: ToastState) => void, onReload: () => void) {
  try {
    await bankAccountsCardsService.testConnection(id)
    onToast({ type: 'success', title: 'Test tamamlandı', message: 'Bağlantı testi tamamlandı.' })
    onReload()
  } catch (error) {
    onToast({ type: 'error', title: 'Test başarısız', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
  }
}

async function syncConnection(id: string, onToast: (toast: ToastState) => void, onReload: () => void) {
  try {
    await bankAccountsCardsService.syncConnection(id)
    onToast({ type: 'success', title: 'Senkronize edildi', message: 'Senkronizasyon isteği tamamlandı.' })
    onReload()
  } catch (error) {
    onToast({ type: 'error', title: 'Senkronizasyon başarısız', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
  }
}

function providerLabel(value?: string | null) {
  return PROVIDERS.find(([key]) => key === value)?.[1] || value || '-'
}

function integrationLabel(value?: string | null) {
  return INTEGRATION_TYPES.find(([key]) => key === value)?.[1] || value || '-'
}

function connectionStatusLabel(value?: string | null) {
  return CONNECTION_STATUSES.find(([key]) => key === value)?.[1] || value || '-'
}

function createAutomationDraft(providerCode?: string | null, baseUrl?: string | null): AutomationDraft {
  const config = providerCode ? BANK_AUTOMATIONS[providerCode] : undefined
  return {
    clientId: '',
    clientSecret: '',
    tokenEndpoint: config?.tokenEndpoint || (baseUrl ? `${String(baseUrl).replace(/\/+$/, '')}/oauth2/token` : ''),
    consentId: '',
    unitNum: '',
    accountNum: '',
    IBAN: '',
    tokenAuthMethod: 'body',
  }
}

function mapProviderAccountToForm(account: Record<string, any>): Partial<BankAccountRow> {
  return {
    iban: account.iban || null,
    account_no: account.accountNo || null,
    account_name: account.accountName || account.iban || account.accountNo || 'Banka Hesabı',
    branch_name: account.branchName || null,
    branch_code: account.branchCode || null,
    currency: account.currency || 'TRY',
    account_type: account.accountType || 'vadesiz',
    last_balance: account.lastBalance ?? account.availableBalance ?? null,
    status: account.status === 'passive' ? 'passive' : 'active',
  }
}

async function loadCompanies(): Promise<CompanyOption[]> {
  const response = await fetch('/api/sirketler?is_active=true', { cache: 'no-store' })
  if (!response.ok) return []
  const payload = await response.json()
  return (payload.data || []).map((company: any) => ({
    value: company.id,
    label: company.kisa_unvan || company.ticari_unvan || 'Şirket',
  }))
}

function latestSyncText(rows: BankConnectionRow[]) {
  const latest = rows.map(row => row.last_sync_at).filter(Boolean).sort().at(-1)
  return latest ? formatDateTime(latest) : 'Veri bekleniyor'
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString('tr-TR') : '-'
}
