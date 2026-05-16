'use client'

import { useEffect, useMemo, useState } from 'react'
import { DatabaseZap } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api/apiClient'

type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type PageMode = 'list' | 'edit'
type IntegrationRow = Record<string, any> & {
  catalog_key: string
  module_name: string
  page_name: string
  integration_name: string
  is_catalog: boolean
}

const ENVIRONMENTS = [['sandbox', 'Sandbox'], ['production', 'Production']]
const CONNECTION_STATUSES = [['not_connected', 'Bağlı Değil'], ['connected', 'Bağlı'], ['pending_test', 'Test Bekliyor'], ['error', 'Hata'], ['expired', 'Yetki Süresi Doldu']]
const CREDENTIAL_STATUSES = [['not_configured', 'Tanımlı Değil'], ['configured', 'Tanımlı'], ['expired', 'Süresi Doldu'], ['rotation_required', 'Rotasyon Gerekli']]
const STATUSES = [['active', 'Aktif'], ['passive', 'Pasif']]

const INTEGRATION_CATALOG: IntegrationRow[] = [
  {
    catalog_key: 'garanti-bbva-account-information',
    module_name: 'Muhasebe',
    page_name: 'Banka Hesapları ve Kartları',
    integration_name: 'Garanti BBVA Hesap Bilgisi API',
    bank_name: 'Garanti BBVA',
    provider_code: 'garanti',
    provider_name: 'GarantiProvider',
    integration_type: 'bank_account_information',
    environment: 'sandbox',
    base_url: 'https://apis.garantibbva.com.tr:443',
    token_url: 'https://apis.garantibbva.com.tr:443/auth/oauth/v2/token',
    connection_status: 'not_connected',
    credential_status: 'configured',
    api_status: '',
    requires_certificate: false,
    ip_whitelist_note: '',
    error_message: '',
    status: 'active',
    credential_id: 'GARANTI_SANDBOX',
    consent_id: '',
    token_auth_method: 'body',
    oauth_type: 'confidential',
    scopes: 'oob',
    account_filters: '',
    account_information_path: '/balancesandmovements/accountinformation/account/v1/getaccountinformation',
    documentation_url: '',
    is_catalog: true,
  },
]

const emptyForm = {
  module_name: '',
  page_name: '',
  integration_name: '',
  bank_name: '',
  provider_code: '',
  provider_name: '',
  integration_type: 'api',
  environment: 'sandbox',
  base_url: '',
  token_url: '',
  connection_status: 'not_connected',
  credential_status: 'not_configured',
  api_status: '',
  requires_certificate: false,
  ip_whitelist_note: '',
  error_message: '',
  status: 'active',
  credential_id: '',
  consent_id: '',
  token_auth_method: '',
  oauth_type: '',
  scopes: '',
  account_filters: '',
  account_information_path: '',
  documentation_url: '',
}

export default function IntegrationParametersPage() {
  const [storedRows, setStoredRows] = useState<any[]>([])
  const [mode, setMode] = useState<PageMode>('list')
  const [selected, setSelected] = useState<IntegrationRow | null>(null)
  const [form, setForm] = useState<Record<string, any>>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const rows = useMemo(() => mergeCatalogRows(storedRows), [storedRows])

  const loadRows = async () => {
    setLoading(true)
    try {
      const payload = await apiClient.get<{ data?: any[] }>('/api/settings/integration-parameters', { skipAuth: true, staleTime: 120_000 })
      setStoredRows(payload.data || [])
    } catch (error) {
      setToast({ type: 'error', title: 'Hata', message: error instanceof Error ? error.message : 'Entegrasyon ayarları yüklenemedi.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [])

  const columns: ColumnDef[] = [
    { key: 'module_name', label: 'Modül', type: 'text', width: 130 },
    { key: 'page_name', label: 'Sayfa', type: 'text', width: 190 },
    { key: 'integration_name', label: 'Entegrasyon Adı', type: 'text', width: 260 },
  ]

  function openEdit(row: IntegrationRow) {
    setSelected(row)
    setForm({ ...emptyForm, ...row, ...(row.settings_json || {}) })
    setMode('edit')
  }

  const save = async () => {
    if (!selected) return

    setSaving(true)
    try {
      const isPersisted = !!selected.id
      const payload = {
        ...form,
        settings_json: integrationSettingsFromForm(form),
      }
      if (isPersisted) {
        await apiClient.patch(`/api/settings/integration-parameters/${selected.id}`, payload)
      } else {
        await apiClient.post('/api/settings/integration-parameters', payload)
      }
      apiClient.invalidate('/api/settings/integration-parameters')

      setToast({ type: 'success', title: 'Kaydedildi', message: 'Entegrasyon ayarı kaydedildi.' })
      setMode('list')
      setSelected(null)
      await loadRows()
    } catch (error) {
      setToast({ type: 'error', title: 'Kaydedilemedi', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <PageBanner
        mode={mode === 'list' ? 'list' : 'form'}
        title="Entegrasyon Ayarları"
        subtitle="Modül ve sayfa bazlı entegrasyon parametrelerini yönetin."
        icon={<DatabaseZap size={24} />}
        onAddClick={mode === 'list' ? () => undefined : undefined}
        addButtonDisabled
        onBackClick={mode === 'list' ? undefined : () => { setMode('list'); setSelected(null) }}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {mode === 'list' ? (
        <SmartDataTable
          columns={columns}
          data={rows}
          loading={loading}
          defaultView="list"
          storageKey="integration-parameters-catalog"
          emptyText="Entegrasyon ayarı bulunamadı"
          onRefresh={loadRows}
          onRowClick={(row: any) => openEdit(row)}
        />
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <TextField label="Modül" value={form.module_name} readOnly onChange={value => setForm({ ...form, module_name: value })} />
              <TextField label="Sayfa" value={form.page_name} readOnly onChange={value => setForm({ ...form, page_name: value })} />
              <TextField label="Entegrasyon Adı" value={form.integration_name} onChange={value => setForm({ ...form, integration_name: value })} />
              <TextField label="Banka" value={form.bank_name} onChange={value => setForm({ ...form, bank_name: value })} />
              <TextField label="Provider Code" value={form.provider_code} onChange={value => setForm({ ...form, provider_code: value })} />
              <TextField label="Provider Name" value={form.provider_name} onChange={value => setForm({ ...form, provider_name: value })} />
              <SelectField label="Ortam" value={form.environment} options={ENVIRONMENTS} onChange={value => setForm({ ...form, environment: value })} />
              <SelectField label="Durum" value={form.status} options={STATUSES} onChange={value => setForm({ ...form, status: value })} />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Entegrasyona Özel Veriler</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <TextField label="Base URL" value={form.base_url} onChange={value => setForm({ ...form, base_url: value })} />
              <TextField label="Token URL" value={form.token_url} onChange={value => setForm({ ...form, token_url: value })} />
              <TextField label="Account Information Path" value={form.account_information_path} onChange={value => setForm({ ...form, account_information_path: value })} />
              <SelectField label="Bağlantı Durumu" value={form.connection_status} options={CONNECTION_STATUSES} onChange={value => setForm({ ...form, connection_status: value })} />
              <SelectField label="Credential Durumu" value={form.credential_status} options={CREDENTIAL_STATUSES} onChange={value => setForm({ ...form, credential_status: value })} />
              <TextField label="Secure Credential ID" value={form.credential_id} onChange={value => setForm({ ...form, credential_id: value })} />
              <TextField label="Consent ID" value={form.consent_id} onChange={value => setForm({ ...form, consent_id: value })} />
              <TextField label="Token Auth Method" value={form.token_auth_method} onChange={value => setForm({ ...form, token_auth_method: value })} />
              <TextField label="OAuth Type" value={form.oauth_type} onChange={value => setForm({ ...form, oauth_type: value })} />
              <TextField label="Scopes" value={form.scopes} onChange={value => setForm({ ...form, scopes: value })} />
              <TextField label="Account Filters" value={form.account_filters} onChange={value => setForm({ ...form, account_filters: value })} />
              <TextField label="API Durumu" value={form.api_status} onChange={value => setForm({ ...form, api_status: value })} />
              <TextField label="IP Whitelist Notu" value={form.ip_whitelist_note} onChange={value => setForm({ ...form, ip_whitelist_note: value })} />
              <TextField label="Dokümantasyon URL" value={form.documentation_url} onChange={value => setForm({ ...form, documentation_url: value })} />
              <TextField label="Hata Mesajı" value={form.error_message} onChange={value => setForm({ ...form, error_message: value })} />
              <CheckboxField label="Sertifika gerekiyor mu?" checked={!!form.requires_certificate} onChange={value => setForm({ ...form, requires_certificate: value })} />
            </div>
          </section>

          <div className="flex justify-end">
            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function integrationSettingsFromForm(form: Record<string, any>) {
  return {
    credential_id: form.credential_id || '',
    consent_id: form.consent_id || '',
    token_auth_method: form.token_auth_method || '',
    oauth_type: form.oauth_type || '',
    scopes: form.scopes || '',
    account_filters: form.account_filters || '',
    account_information_path: form.account_information_path || '',
    documentation_url: form.documentation_url || '',
  }
}

function mergeCatalogRows(storedRows: any[]): IntegrationRow[] {
  return INTEGRATION_CATALOG.map((catalogRow) => {
    const stored = storedRows.find(row =>
      row.provider_code === catalogRow.provider_code ||
      row.integration_name === catalogRow.integration_name
    )

    return {
      ...catalogRow,
      ...stored,
      catalog_key: catalogRow.catalog_key,
      module_name: catalogRow.module_name,
      page_name: catalogRow.page_name,
      integration_name: stored?.integration_name || catalogRow.integration_name,
      settings_json: {
        ...integrationSettingsFromForm(catalogRow),
        ...(stored?.settings_json || {}),
      },
      is_catalog: !stored,
    }
  })
}

function TextField({ label, value, onChange, readOnly, type = 'text' }: { label: string; value: any; onChange: (value: string) => void; readOnly?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input type={type} value={value ?? ''} readOnly={readOnly} onChange={event => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-400 read-only:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:read-only:bg-gray-900" />
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: any; options: string[][]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <select value={value ?? ''} onChange={event => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white">
        {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
      </select>
    </label>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="mt-6 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
      {label}
    </label>
  )
}
