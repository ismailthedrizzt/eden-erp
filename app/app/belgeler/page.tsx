'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react'
import { DocumentLoader } from '@/components/documents/DocumentLoader'
import { DocumentPreview } from '@/components/documents/DocumentPreview'
import { DocumentRequirementList } from '@/components/documents/DocumentRequirementList'
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { cn, formatFileSize } from '@/lib/utils'
import { documentService, type DocumentRecord } from '@/lib/services/documents'

type ToastState = { type: ToastType; title?: string; message: string }

const categories = [
  'company',
  'partner',
  'representative',
  'branch',
  'hr',
  'accounting',
  'after_sales',
  'import_export',
  'project',
  'general',
]

const statuses = ['uploaded', 'verified', 'rejected', 'expired', 'archived']

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [query, setQuery] = useState({
    search: '',
    document_category: '',
    status: '',
    verification_status: '',
    required: '',
    owner_entity_type: '',
    owner_entity_id: '',
  })
  const [form, setForm] = useState({
    owner_entity_type: 'company',
    owner_entity_id: 'sample-company',
    document_type: 'trade_registry_gazette',
    document_category: 'company',
    title: 'Ticaret Sicil Gazetesi',
    required: true,
    verification_required: true,
    issue_date: '',
    expiry_date: '',
  })

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await documentService.list({
        search: query.search || undefined,
        document_category: query.document_category || undefined,
        status: query.status || undefined,
        verification_status: query.verification_status || undefined,
        required: query.required === '' ? undefined : query.required === 'true',
        owner_entity_type: query.owner_entity_type || undefined,
        owner_entity_id: query.owner_entity_id || undefined,
        pageSize: 100,
      })
      setDocuments(data.data)
      setSelectedId(current => current || data.data[0]?.id || '')
    } catch (error) {
      setToast({ type: 'error', title: 'Belgeler Yuklenemedi', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const selected = useMemo(
    () => documents.find(document => document.id === selectedId) || documents[0] || null,
    [documents, selectedId]
  )

  const summary = useMemo(() => ({
    total: documents.length,
    required: documents.filter(document => document.required).length,
    pending: documents.filter(document => document.verification_status === 'pending').length,
    expiring: documents.filter(document => isExpiring(document.expiry_date)).length,
  }), [documents])

  async function uploadDocument(file: File | null) {
    if (!file) return
    setWorking(true)
    try {
      const uploaded = await documentService.upload({
        ...form,
        file,
        required: form.required,
        verification_required: form.verification_required,
        relation_type: form.document_type === 'service_photo' ? 'service_photo' : 'attachment',
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
      })
      setDocuments(current => [uploaded, ...current.filter(item => item.id !== uploaded.id)])
      setSelectedId(uploaded.id)
      setToast({ type: 'success', title: 'Belge Yuklendi', message: `${uploaded.file_name} kaydedildi.` })
    } catch (error) {
      setToast({ type: 'error', title: 'Yukleme Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function verifySelected() {
    if (!selected) return
    setWorking(true)
    try {
      const verified = await documentService.verify(selected.id)
      replaceDocument(verified)
      setToast({ type: 'success', title: 'Belge Dogrulandi', message: verified.title })
    } catch (error) {
      setToast({ type: 'error', title: 'Dogrulama Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function rejectSelected() {
    if (!selected) return
    const reason = window.prompt('Red nedeni') || ''
    if (!reason.trim()) return
    setWorking(true)
    try {
      const rejected = await documentService.reject(selected.id, reason)
      replaceDocument(rejected)
      setToast({ type: 'warning', title: 'Belge Reddedildi', message: rejected.title })
    } catch (error) {
      setToast({ type: 'error', title: 'Red Basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  function replaceDocument(document: DocumentRecord) {
    setDocuments(current => current.map(item => item.id === document.id ? document : item))
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <FileArchive className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Belge Yonetimi</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Merkezi belge metadata, dosya storage, versiyon, required belge ve audit akislarini yonetir.
              </p>
            </div>
          </div>
          <button type="button" onClick={loadDocuments} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Yenile
          </button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <SummaryTile icon={FileText} label="Belge" value={summary.total} />
          <SummaryTile icon={AlertTriangle} label="Zorunlu" value={summary.required} tone="amber" />
          <SummaryTile icon={ShieldCheck} label="Dogrulama Bekleyen" value={summary.pending} tone="sky" />
          <SummaryTile icon={CheckCircle2} label="30 Gun Icinde" value={summary.expiring} tone="emerald" />
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <TextInput label="Arama" value={query.search} onChange={value => setQuery(current => ({ ...current, search: value }))} />
            <SelectInput label="Kategori" value={query.document_category} options={categories} onChange={value => setQuery(current => ({ ...current, document_category: value }))} />
            <SelectInput label="Durum" value={query.status} options={statuses} onChange={value => setQuery(current => ({ ...current, status: value }))} />
            <SelectInput label="Dogrulama" value={query.verification_status} options={['pending', 'verified', 'rejected', 'not_required']} onChange={value => setQuery(current => ({ ...current, verification_status: value }))} />
            <SelectInput label="Zorunlu" value={query.required} options={['true', 'false']} onChange={value => setQuery(current => ({ ...current, required: value }))} />
            <button type="button" onClick={loadDocuments} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Filtrele
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Belge Adi</th>
                  <th className="px-3 py-2">Tur</th>
                  <th className="px-3 py-2">Ilgili Kayit</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Boyut</th>
                  <th className="px-3 py-2">Son Gecerlilik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map(document => (
                  <tr key={document.id} onClick={() => setSelectedId(document.id)} className={cn('cursor-pointer hover:bg-muted/50', selected?.id === document.id && 'bg-muted')}>
                    <td className="px-3 py-3">
                      <div className="font-medium">{document.title}</div>
                      <div className="text-xs text-muted-foreground">{document.file_name}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div>{document.document_type}</div>
                      <div className="text-xs text-muted-foreground">{document.document_category}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      {document.owner_entity_type}/{document.owner_entity_id}
                    </td>
                    <td className="px-3 py-3">
                      <DocumentStatusBadge status={document.status} verificationStatus={document.verification_status} required={document.required} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{formatFileSize(Number(document.file_size || 0))}</td>
                    <td className="px-3 py-3 text-muted-foreground">{document.expiry_date || '-'}</td>
                  </tr>
                ))}
                {!documents.length ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                      {loading ? 'Belgeler yukleniyor.' : 'Belge bulunamadi.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Belge Detayi</h2>
                <p className="text-sm text-muted-foreground">Preview/download URL backend tarafinda permission kontrolu sonrasi uretilir.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={!selected || working} onClick={verifySelected} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Dogrula
                </button>
                <button type="button" disabled={!selected || working} onClick={rejectSelected} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Reddet
                </button>
              </div>
            </div>
            <DocumentPreview document={selected} />
            {selected ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info label="Storage" value={`${selected.storage_provider || 'supabase'} / ${selected.storage_path_masked || 'masked'}`} />
                <Info label="Versiyon" value={String(selected.version_no || 1)} />
                <Info label="Yukleyen" value={selected.uploaded_by || '-'} />
                <Info label="Olusturma" value={selected.created_at || '-'} />
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="text-base font-semibold">Yeni Belge Yukle</h2>
            <p className="mt-1 text-sm text-muted-foreground">Mobilde kamera destekli input ve canonical document relation olusur.</p>
            <div className="mt-4 grid gap-3">
              <TextInput label="Entity Type" value={form.owner_entity_type} onChange={value => setForm(current => ({ ...current, owner_entity_type: value }))} />
              <TextInput label="Entity ID" value={form.owner_entity_id} onChange={value => setForm(current => ({ ...current, owner_entity_id: value }))} />
              <TextInput label="Document Type" value={form.document_type} onChange={value => setForm(current => ({ ...current, document_type: value }))} />
              <SelectInput label="Kategori" value={form.document_category} options={categories} onChange={value => setForm(current => ({ ...current, document_category: value || 'general' }))} allowEmpty={false} />
              <TextInput label="Baslik" value={form.title} onChange={value => setForm(current => ({ ...current, title: value }))} />
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput label="Issue Date" type="date" value={form.issue_date} onChange={value => setForm(current => ({ ...current, issue_date: value }))} />
                <TextInput label="Expiry Date" type="date" value={form.expiry_date} onChange={value => setForm(current => ({ ...current, expiry_date: value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.required} onChange={event => setForm(current => ({ ...current, required: event.target.checked }))} />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.verification_required} onChange={event => setForm(current => ({ ...current, verification_required: event.target.checked }))} />
                Verification required
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Dosya</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*" disabled={working} onChange={event => uploadDocument(event.target.files?.[0] || null)} className="block h-10 w-full rounded-md border border-border bg-background text-sm file:mr-3 file:h-full file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Mobil Kamera</span>
                <input type="file" accept="image/*" capture="environment" disabled={working} onChange={event => uploadDocument(event.target.files?.[0] || null)} className="block h-10 w-full rounded-md border border-border bg-background text-sm file:mr-3 file:h-full file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium" />
              </label>
              <div className="inline-flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload sirasinda executable uzantilar backend tarafinda engellenir.
              </div>
            </div>
          </div>
        </section>

        <DocumentLoader
          entityType={form.owner_entity_type}
          entityId={form.owner_entity_id}
          moduleKey={moduleKeyForCategory(form.document_category)}
          operationKey="opening"
          onChange={next => {
            if (!next.length) return
            setDocuments(current => mergeDocuments(current, next))
          }}
        />

        <section className="rounded-md border border-border bg-card p-4">
          <h2 className="text-base font-semibold">Belge Gereksinimleri</h2>
          <p className="mt-1 text-sm text-muted-foreground">Operation bazli required/optional slotlar merkezi registryden gelir.</p>
          <div className="mt-4">
            <DocumentRequirementList moduleKey={moduleKeyForCategory(form.document_category)} operationKey="opening" entityType={form.owner_entity_type} documents={documents} />
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryTile({ icon: Icon, label, value, tone = 'muted' }: { icon: React.ElementType; label: string; value: number; tone?: 'muted' | 'amber' | 'sky' | 'emerald' }) {
  const tones = {
    muted: 'bg-muted text-foreground',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  }
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-md', tones[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  )
}

function TextInput({ label, value, onChange, type = 'text' }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
    </label>
  )
}

function SelectInput({ label, value, options, onChange, allowEmpty = true }: { label: string; value: string; options: string[]; allowEmpty?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
        {allowEmpty ? <option value="">Tum</option> : null}
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm font-medium">{value}</div>
    </div>
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Beklenmeyen hata olustu.'
}

function isExpiring(value?: string | null) {
  if (!value) return false
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return false
  const now = Date.now()
  return time >= now && time <= now + 30 * 24 * 60 * 60 * 1000
}

function mergeDocuments(current: DocumentRecord[], next: DocumentRecord[]) {
  const map = new Map(current.map(document => [document.id, document]))
  next.forEach(document => map.set(document.id, document))
  return Array.from(map.values())
}

function moduleKeyForCategory(category: string) {
  if (category === 'hr') return 'hr'
  if (category === 'after_sales') return 'after_sales'
  if (category === 'import_export') return 'importExport'
  if (category === 'project') return 'project_management'
  if (category === 'branch') return 'branches'
  if (category === 'partner') return 'partners'
  if (category === 'representative') return 'representatives'
  return 'companies'
}
