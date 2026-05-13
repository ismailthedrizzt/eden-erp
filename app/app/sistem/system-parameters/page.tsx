'use client'

import { useEffect, useMemo, useState } from 'react'
import { DatabaseZap, FileUp, Save, Settings2 } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import {
  systemParameterDefinitions,
  uniqueSystemParameterModules,
  uniqueSystemParameterPages,
  type SystemParameterDefinition,
} from '@/lib/system/systemParameters.config'

type ParameterRow = SystemParameterDefinition & {
  value: string
  updatedAt?: string | null
  descriptionOverride?: string | null
}

type Notice = { type: 'success' | 'error' | 'warning'; message: string } | null

export default function SystemParametersPage() {
  const [rows, setRows] = useState<ParameterRow[]>([])
  const [moduleKey, setModuleKey] = useState('')
  const [pageKey, setPageKey] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    loadParameters()
  }, [])

  const modules = uniqueSystemParameterModules()
  const pages = uniqueSystemParameterPages(moduleKey || undefined)
  const filteredRows = useMemo(() => rows.filter(row =>
    (!moduleKey || row.moduleKey === moduleKey) &&
    (!pageKey || row.pageKey === pageKey)
  ), [moduleKey, pageKey, rows])

  async function loadParameters() {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/system-parameters', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Parametreler alınamadı.')
      setRows(payload.data || systemParameterDefinitions.map(item => ({ ...item, value: item.defaultValue })))
      if (payload.warning) setNotice({ type: 'warning', message: payload.warning })
    } catch (error) {
      setRows(systemParameterDefinitions.map(item => ({ ...item, value: item.defaultValue })))
      setNotice({ type: 'warning', message: error instanceof Error ? error.message : 'Varsayılan parametreler gösteriliyor.' })
    } finally {
      setLoading(false)
    }
  }

  async function saveParameter(row: ParameterRow) {
    setSavingKey(row.key)
    setNotice(null)
    try {
      const response = await fetch('/api/settings/system-parameters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: row.key, value: row.value, description: row.descriptionOverride || row.description }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Parametre kaydedilemedi.')
      setNotice({ type: 'success', message: 'Parametre kaydedildi.' })
      await loadParameters()
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Parametre kaydedilemedi.' })
    } finally {
      setSavingKey(null)
    }
  }

  async function generateNaceFromOfficialSource() {
    setImporting(true)
    setNotice(null)
    try {
      const response = await fetch('/api/reference/nace-codes/update-from-source', { method: 'POST' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'NACE listesi üretilemedi.')
      const result = payload.data || {}
      setNotice({
        type: result.warning ? 'warning' : 'success',
        message: result.warning || `NACE referansı güncellendi. Yeni: ${result.imported || 0}, Güncellenen: ${result.updated || 0}`,
      })
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'NACE listesi üretilemedi.' })
    } finally {
      setImporting(false)
    }
  }

  async function uploadNaceFile() {
    if (!file) {
      setNotice({ type: 'warning', message: 'Lütfen XLSX veya CSV dosyası seçin.' })
      return
    }
    setImporting(true)
    setNotice(null)
    try {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('sourceName', 'Sistem Parametreleri üzerinden yüklenen resmi NACE dosyası')
      const response = await fetch('/api/reference/nace-codes/import', { method: 'POST', body: formData })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'NACE dosyası yüklenemedi.')
      const result = payload.data || {}
      setNotice({ type: 'success', message: `NACE dosyası işlendi. Yeni: ${result.imported || 0}, Güncellenen: ${result.updated || 0}` })
      setFile(null)
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'NACE dosyası yüklenemedi.' })
    } finally {
      setImporting(false)
    }
  }

  function updateRowValue(key: string, value: string) {
    setRows(prev => prev.map(row => row.key === key ? { ...row, value } : row))
  }

  return (
    <div className="space-y-5">
      <PageBanner
        mode="list"
        title="Sistem Parametreleri"
        subtitle="Modül ve sayfa bazında firma enumları, referans listeleri ve uygulama parametrelerini yönetin."
        icon={<Settings2 size={24} />}
      />

      {notice && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          notice.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
            : notice.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
        }`}>
          {notice.message}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">NACE Referans Listesi</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Resmi Ticaret Bakanlığı / TÜİK NACE listesi kaynak alınır. Tehlike sınıfı yoksa aşağıdaki varsayılan parametre uygulanır.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={importing} onClick={generateNaceFromOfficialSource}>
              <DatabaseZap size={16} />
              Resmi Kaynaktan Üret
            </button>
            <label className="btn cursor-pointer">
              <FileUp size={16} />
              Dosya Seç
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            <button type="button" className="btn" disabled={importing || !file} onClick={uploadNaceFile}>
              Yükle
            </button>
          </div>
        </div>
        {file && <p className="text-xs text-gray-500 dark:text-gray-400">Seçili dosya: {file.name}</p>}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>Modül</span>
            <select
              value={moduleKey}
              onChange={(event) => {
                setModuleKey(event.target.value)
                setPageKey('')
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="">Tüm Modüller</option>
              {modules.map(module => <option key={module.key} value={module.key}>{module.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>Sayfa</span>
            <select
              value={pageKey}
              onChange={(event) => setPageKey(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="">Tüm Sayfalar</option>
              {pages.map(page => <option key={`${page.moduleKey}:${page.key}`} value={page.key}>{page.label}</option>)}
            </select>
          </label>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-950 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2">Parametre</th>
                <th className="px-3 py-2">Modül / Sayfa</th>
                <th className="px-3 py-2">Değer</th>
                <th className="px-3 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">Yükleniyor...</td></tr>}
              {!loading && filteredRows.map(row => (
                <tr key={row.key} className="align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{row.label}</div>
                    <div className="mt-1 max-w-xl text-xs text-gray-500 dark:text-gray-400">{row.descriptionOverride || row.description || row.key}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{row.moduleLabel} / {row.pageLabel}</td>
                  <td className="px-3 py-3">
                    <ParameterInput row={row} onChange={(value) => updateRowValue(row.key, value)} />
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" className="btn" disabled={savingKey === row.key} onClick={() => saveParameter(row)}>
                      <Save size={15} />
                      Kaydet
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredRows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">Bu filtrede parametre yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ParameterInput({ row, onChange }: { row: ParameterRow; onChange: (value: string) => void }) {
  const className = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white'
  if (row.type === 'enum') {
    return (
      <select value={row.value} onChange={(event) => onChange(event.target.value)} className={className}>
        {(row.options || []).map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    )
  }
  if (row.type === 'boolean') {
    return (
      <select value={String(row.value)} onChange={(event) => onChange(event.target.value)} className={className}>
        <option value="true">Açık</option>
        <option value="false">Kapalı</option>
      </select>
    )
  }
  return <input type={row.type === 'number' ? 'number' : 'text'} value={row.value} onChange={(event) => onChange(event.target.value)} className={className} />
}
