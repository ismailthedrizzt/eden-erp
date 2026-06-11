'use client'


import { appSistemTemalarPageContract } from '@/contracts/pages/generated/app-sistem-temalar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemTemalarContractReady = requirePageContract(appSistemTemalarPageContract)
void appSistemTemalarContractReady

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Eye, FileJson, Loader2, Palette, ShieldCheck, Upload } from 'lucide-react'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { themeConcepts } from '@/components/design-lab/themeConcepts'
import { THEME_IMPORT_PREVIEW_STORAGE_KEY, type ThemeImportPreviewRecord } from '@/lib/theme/themeSchema'
import { cn } from '@/lib/utils'

type ToastState = { type: ToastType; title?: string; message: string }

const samplePackageUrl = '/api/theme/export?themeKey=atlas&format=eden'

export default function VisualThemesAdminPage() {
  const [jsonText, setJsonText] = useState('')
  const [working, setWorking] = useState(false)
  const [result, setResult] = useState<ThemeImportPreviewRecord | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const selectedPreview = useMemo(() => result?.status === 'review' ? result : null, [result])

  async function handleFile(file: File | null) {
    if (!file) return
    if (file.size > 256 * 1024) {
      setToast({ type: 'warning', title: 'Dosya cok buyuk', message: 'Tema JSON dosyasi 256 KB limitini asamaz.' })
      return
    }
    setJsonText(await file.text())
  }

  async function validateImport() {
    setWorking(true)
    setResult(null)
    try {
      const response = await fetch('/api/theme/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonText,
      })
      const payload = await response.json().catch(() => ({}))
      const preview = payload.data as ThemeImportPreviewRecord | undefined
      if (preview) setResult(preview)
      if (!response.ok || !preview || preview.status === 'rejected') {
        throw new Error(payload.error || payload.message || 'Tema paketi dogrulanamadi.')
      }
      if (preview.theme) {
        window.localStorage.setItem(THEME_IMPORT_PREVIEW_STORAGE_KEY, JSON.stringify(preview.theme))
      }
      setToast({ type: 'success', title: 'Inceleme hazir', message: 'Tema Design Lab icin V2 local inceleme kaydi olarak saklandi.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Import reddedildi', message: error instanceof Error ? error.message : 'Tema import edilemedi.' })
    } finally {
      setWorking(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <Palette className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Gorsel Temalar</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Eden theme JSON, Figma/Tokens Studio ve CSS variables export; JSON-only guvenli import ve Design Lab preview akisi.
              </p>
            </div>
          </div>
          <a href={samplePackageUrl} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
            <Download className="h-4 w-4" aria-hidden="true" />
            Ornek Eden JSON
          </a>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Sistem Temalari</h2>
                <p className="text-sm text-muted-foreground">Aktif sistem temalari dis tasarimci paketine uygun formatlarda indirilebilir.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>

            <div className="grid gap-3">
              {themeConcepts.map(theme => (
                <div key={theme.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 h-6 w-6 shrink-0 rounded-md border border-border" style={{ backgroundColor: theme.colors.accentPrimary }} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{theme.name}</h3>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">system</span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">active</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{theme.description}</p>
                        <div className="mt-2 text-xs text-muted-foreground">themeKey: <code>{theme.id}</code></div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <ExportLink themeKey={theme.id} format="eden" label="Eden" />
                      <ExportLink themeKey={theme.id} format="figma" label="Figma" />
                      <ExportLink themeKey={theme.id} format="css" label="CSS" />
                      <ExportLink themeKey={theme.id} format="readme" label="README" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-md border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold">Import Preview</h2>
                  <p className="text-sm text-muted-foreground">JSON once validation alir; aktif tema olmaz.</p>
                </div>
              </div>

              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">eden-theme.json</span>
                <input type="file" accept="application/json,.json" onChange={event => handleFile(event.target.files?.[0] || null)} className="block h-10 w-full rounded-md border border-border bg-background text-sm file:mr-3 file:h-full file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium" />
              </label>

              <textarea
                value={jsonText}
                onChange={event => setJsonText(event.target.value)}
                rows={12}
                placeholder={'{ "schemaVersion": "2.0.0", "meta": { ... }, "modes": { ... } }'}
                className="w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
              />

              <button
                type="button"
                onClick={validateImport}
                disabled={!jsonText.trim() || working}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Validate & Preview
              </button>
            </section>

            {result && <ValidationPanel result={result} />}

            <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold">Aktivasyon kilitli</h2>
                  <p className="mt-1 text-sm">
                    Bu ilk faz import edilen temayi otomatik aktif yapmaz. Kalici aktivasyon FastAPI + DB + audit onay akisiyle eklenecek.
                  </p>
                </div>
              </div>
            </section>

            {selectedPreview && (
              <a href="/app/design-lab" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
                <Eye className="h-4 w-4" aria-hidden="true" />
                Design Lab preview
              </a>
            )}
          </aside>
        </section>
      </div>
    </main>
  )
}

function ExportLink({ themeKey, format, label }: { themeKey: string; format: string; label: string }) {
  return (
    <a
      href={`/api/theme/export?themeKey=${encodeURIComponent(themeKey)}&format=${format}`}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted"
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  )
}

function ValidationPanel({ result }: { result: ThemeImportPreviewRecord }) {
  const allContrast = result.validation.contrast.light.concat(result.validation.contrast.dark)
  const issues = result.validation.errors.concat(result.validation.warnings)

  return (
    <section className={cn(
      'rounded-md border p-4',
      result.status === 'review' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-red-200 bg-red-50 text-red-950'
    )}>
      <div className="mb-2 flex items-center gap-2">
        {result.status === 'review' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <h2 className="text-sm font-semibold">{result.status === 'review' ? 'Inceleme hazir' : 'Import reddedildi'}</h2>
      </div>
      <div className="space-y-1 text-sm">
        <p>Tema: {result.displayName || result.themeKey || '-'}</p>
        <p>Aktivasyon: {result.canActivate ? 'Admin onayi gerekli' : 'Kontrast veya validation nedeniyle bloklu'}</p>
        <p>Kalici storage: {result.stored ? 'Evet' : 'Hayir, ilk faz local preview'}</p>
      </div>
      {(issues.length || allContrast.length) ? (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-current/20 bg-white/50 p-2 text-xs">
          {issues.map(item => (
            <div key={`${item.path}-${item.code}`} className="mb-1">
              <strong>{item.severity.toUpperCase()}</strong> {item.path}: {item.message}
            </div>
          ))}
          {allContrast.map(item => (
            <div key={`${item.mode}-${item.path}`} className="mb-1">
              <strong>{item.severity.toUpperCase()}</strong> {item.mode} {item.path}: {item.ratio}/{item.minimum}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
