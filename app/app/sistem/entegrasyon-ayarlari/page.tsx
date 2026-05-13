'use client'

import { useEffect, useState } from 'react'
import { DatabaseZap, KeyRound, RefreshCw, TestTube2 } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'

type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }

const BANK_OPTIONS = [['', 'Seçiniz'], ['Garanti BBVA', 'Garanti BBVA'], ['İş Bankası', 'İş Bankası'], ['Akbank', 'Akbank'], ['Yapı Kredi', 'Yapı Kredi'], ['QNB', 'QNB'], ['Ziraat', 'Ziraat'], ['Diğer', 'Diğer']]
const ENVIRONMENTS = [['sandbox', 'Sandbox'], ['production', 'Production']]
const CONNECTION_STATUSES = [['not_connected', 'Bağlı Değil'], ['connected', 'Bağlı'], ['pending_test', 'Test Bekliyor'], ['error', 'Hata'], ['expired', 'Yetki Süresi Doldu']]
const CREDENTIAL_STATUSES = [['not_configured', 'Tanımlı Değil'], ['configured', 'Tanımlı'], ['expired', 'Süresi Doldu'], ['rotation_required', 'Rotasyon Gerekli']]

const emptyForm = {
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
}

export default function IntegrationParametersPage() {
  const [rows, setRows] = useState<any[]>([])
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [selected, setSelected] = useState<any | null>(null)
  const [form, setForm] = useState<Record<string, any>>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const loadRows = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/integration-parameters', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Entegrasyon ayarları yüklenemedi.')
      setRows(payload.data || [])
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
    { key: 'integration_name', label: 'Entegrasyon Adı', type: 'text', width: 180 },
    { key: 'bank_name', label: 'Banka', type: 'text', width: 130 },
    { key: 'provider_code', label: 'Provider Code', type: 'text', width: 120 },
    { key: 'environment', label: 'Ortam', type: 'text', width: 100 },
    { key: 'connection_status', label: 'Bağlantı Durumu', type: 'text', width: 140 },
    { key: 'credential_status', label: 'Credential Durumu', type: 'text', width: 140 },
    { key: 'last_test_at', label: 'Son Test', type: 'date', width: 140 },
    { key: 'last_sync_at', label: 'Son Senkronizasyon', type: 'date', width: 150 },
    { key: 'api_status', label: 'API Durumu', type: 'text', width: 160 },
    { key: 'status', label: 'Durum', type: 'text', width: 90 },
    { key: 'actions', label: 'İşlemler', type: 'text', width: 260, fixedWidth: true, render: (_value, row) => <RowActions row={row} onEdit={openEdit} onCredential={markCredential} onTest={testIntegration} /> },
  ]

  const openCreate = () => {
    setSelected(null)
    setForm(emptyForm)
    setMode('create')
  }

  function openEdit(row: any) {
    setSelected(row)
    setForm({ ...emptyForm, ...row })
    setMode('edit')
  }

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch(mode === 'create' ? '/api/settings/integration-parameters' : `/api/settings/integration-parameters/${selected.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Kayıt kaydedilemedi.')
      setToast({ type: 'success', title: 'Kaydedildi', message: 'Entegrasyon ayarı kaydedildi.' })
      setMode('list')
      await loadRows()
    } catch (error) {
      setToast({ type: 'error', title: 'Kaydedilemedi', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
    } finally {
      setSaving(false)
    }
  }

  async function markCredential(row: any) {
    const response = await fetch(`/api/settings/integration-parameters/${row.id}/credential`, { method: 'POST', body: '{}' })
    const payload = await response.json().catch(() => ({}))
    setToast(response.ok ? { type: 'success', title: 'Credential', message: payload.message || 'Credential durumu güncellendi.' } : { type: 'error', title: 'Credential', message: payload.error || 'Credential güncellenemedi.' })
    await loadRows()
  }

  async function testIntegration(row: any) {
    const response = await fetch(`/api/settings/integration-parameters/${row.id}/test`, { method: 'POST' })
    const payload = await response.json().catch(() => ({}))
    setToast(response.ok ? { type: 'success', title: 'Test', message: payload.message || 'Test isteği alındı.' } : { type: 'error', title: 'Test', message: payload.error || 'Test başlatılamadı.' })
    await loadRows()
  }

  return (
    <div className="relative">
      <PageBanner
        mode={mode === 'list' ? 'list' : 'form'}
        title="Entegrasyon Ayarları"
        subtitle="Banka API bağlantılarını, ortamları ve credential durumlarını yönetin."
        icon={<DatabaseZap size={24} />}
        onAddClick={mode === 'list' ? openCreate : undefined}
        addButtonText="Yeni Entegrasyon Ekle"
        onBackClick={mode === 'list' ? undefined : () => setMode('list')}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {mode === 'list' ? (
        <SmartDataTable columns={columns} data={rows} loading={loading} defaultView="list" storageKey="integration-parameters" emptyText="Entegrasyon ayarı bulunamadı" onRefresh={loadRows} />
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <TextField label="Entegrasyon Adı" value={form.integration_name} onChange={value => setForm({ ...form, integration_name: value })} />
            <SelectField label="Banka" value={form.bank_name} options={BANK_OPTIONS} onChange={value => setForm({ ...form, bank_name: value })} />
            <TextField label="Provider Code" value={form.provider_code} onChange={value => setForm({ ...form, provider_code: value })} />
            <TextField label="Provider Name" value={form.provider_name} onChange={value => setForm({ ...form, provider_name: value })} />
            <SelectField label="Ortam" value={form.environment} options={ENVIRONMENTS} onChange={value => setForm({ ...form, environment: value })} />
            <TextField label="Base URL" value={form.base_url} onChange={value => setForm({ ...form, base_url: value })} />
            <TextField label="Token URL" value={form.token_url} onChange={value => setForm({ ...form, token_url: value })} />
            <SelectField label="Bağlantı Durumu" value={form.connection_status} options={CONNECTION_STATUSES} onChange={value => setForm({ ...form, connection_status: value })} />
            <SelectField label="Credential Durumu" value={form.credential_status} options={CREDENTIAL_STATUSES} onChange={value => setForm({ ...form, credential_status: value })} />
            <TextField label="API Durumu" value={form.api_status} onChange={value => setForm({ ...form, api_status: value })} />
            <TextField label="IP Whitelist Notu" value={form.ip_whitelist_note} onChange={value => setForm({ ...form, ip_whitelist_note: value })} />
            <TextField label="Hata Mesajı" value={form.error_message} onChange={value => setForm({ ...form, error_message: value })} />
            <CheckboxField label="Sertifika gerekiyor mu?" checked={!!form.requires_certificate} onChange={value => setForm({ ...form, requires_certificate: value })} />
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
          <p className="mt-3 text-xs text-gray-500">Client ID, Client Secret, Consent ID, API Key, token, private key ve sertifika şifresi bu tabloda tutulmaz. Bu değerler Secure Credential akışıyla girilir ve kayıt sonrası gösterilmez.</p>
        </section>
      )}
    </div>
  )
}

function RowActions({ row, onEdit, onCredential, onTest }: { row: any; onEdit: (row: any) => void; onCredential: (row: any) => void; onTest: (row: any) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <button className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200" onClick={() => onEdit(row)}>Düzenle</button>
      <button className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" onClick={() => onCredential(row)}><KeyRound size={11} />Credential</button>
      <button className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" onClick={() => onTest(row)}><TestTube2 size={11} />Test</button>
      <button className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200"><RefreshCw size={11} />Senkron</button>
    </div>
  )
}

function TextField({ label, value, onChange }: { label: string; value: any; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input value={value ?? ''} onChange={event => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
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
