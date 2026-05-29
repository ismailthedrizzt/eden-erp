'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Flag,
  KeyRound,
  Loader2,
  RefreshCw,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  ToggleLeft,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  adminService,
  type AdminDashboard,
  type AdminFeatureFlag,
  type AdminHealth,
  type AdminIntegration,
  type AdminModule,
  type AdminOutbox,
  type WorkspaceSettings,
} from '@/lib/services/admin'

export type AdminSection =
  | 'dashboard'
  | 'workspace'
  | 'modules'
  | 'features'
  | 'health'
  | 'outbox'
  | 'integrations'
  | 'technical'

type ToastState = { type: ToastType; title?: string; message: string }

const navigation: { key: AdminSection; label: string; href: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Admin Console', href: '/app/sistem', icon: Settings },
  { key: 'workspace', label: 'Genel Ayarlar', href: '/app/sistem/genel', icon: SlidersHorizontal },
  { key: 'modules', label: 'Moduller', href: '/app/sistem/moduller', icon: Wrench },
  { key: 'features', label: 'Ozellikler', href: '/app/sistem/ozellikler', icon: Flag },
  { key: 'health', label: 'Saglik', href: '/app/sistem/saglik', icon: Activity },
  { key: 'outbox', label: 'Outbox', href: '/app/sistem/outbox', icon: Send },
  { key: 'integrations', label: 'Entegrasyonlar', href: '/app/sistem/entegrasyonlar', icon: Database },
  { key: 'technical', label: 'Teknik', href: '/app/sistem/teknik', icon: KeyRound },
]

export function AdminConsolePage({ section = 'dashboard' }: { section?: AdminSection }) {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null)
  const [workspaceDraft, setWorkspaceDraft] = useState<Partial<WorkspaceSettings>>({})
  const [modules, setModules] = useState<AdminModule[]>([])
  const [features, setFeatures] = useState<AdminFeatureFlag[]>([])
  const [health, setHealth] = useState<AdminHealth | null>(null)
  const [integrations, setIntegrations] = useState<AdminIntegration[]>([])
  const [outbox, setOutbox] = useState<AdminOutbox | null>(null)
  const [technical, setTechnical] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [workingKey, setWorkingKey] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (section === 'dashboard') {
        const data = await adminService.dashboard()
        setDashboard(data)
      }
      if (section === 'workspace') {
        const data = await adminService.workspaceSettings()
        setWorkspace(data)
        setWorkspaceDraft(data)
      }
      if (section === 'modules') {
        const data = await adminService.modules()
        setModules(data.modules)
      }
      if (section === 'features') {
        const data = await adminService.features()
        setFeatures(data.features)
      }
      if (section === 'health') {
        setHealth(await adminService.health())
      }
      if (section === 'integrations') {
        const data = await adminService.integrations()
        setIntegrations(data.integrations)
      }
      if (section === 'outbox') {
        setOutbox(await adminService.outbox())
      }
      if (section === 'technical') {
        const [settingsData, healthData] = await Promise.all([
          adminService.settings(),
          adminService.health(true),
        ])
        setTechnical({ ...settingsData, health: healthData })
      }
    } catch (error) {
      setToast({ type: 'error', title: 'Admin Console', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [section])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const title = useMemo(() => navigation.find(item => item.key === section)?.label || 'Admin Console', [section])

  async function saveWorkspace() {
    setWorkingKey('workspace')
    try {
      const data = await adminService.updateWorkspaceSettings(workspaceDraft)
      setWorkspace(data)
      setWorkspaceDraft(data)
      setToast({ type: 'success', title: 'Kaydedildi', message: 'Calisma alani ayarlari guncellendi.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Kaydedilemedi', message: errorMessage(error) })
    } finally {
      setWorkingKey(null)
    }
  }

  async function toggleModule(moduleItem: AdminModule) {
    if (moduleItem.enabled && !window.confirm('Bu modul kapatilirsa bagli ekranlar ve islemler kullanilamayabilir. Devam edilsin mi?')) {
      return
    }
    setWorkingKey(`module:${moduleItem.module_key}`)
    try {
      await adminService.setModuleActivation(
        moduleItem.module_key,
        !moduleItem.enabled,
        'Admin Console modul aktivasyon degisikligi'
      )
      const data = await adminService.modules()
      setModules(data.modules)
      setToast({ type: 'success', title: 'Modul guncellendi', message: 'Degisiklik audit izine yazildi.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Modul guncellenemedi', message: errorMessage(error) })
    } finally {
      setWorkingKey(null)
    }
  }

  async function toggleFeature(feature: AdminFeatureFlag) {
    if (isRiskyFeature(feature) && !window.confirm('Bu ayar kritik sistem davranisini etkileyebilir. Degisikligi uygulamak istiyor musunuz?')) {
      return
    }
    setWorkingKey(`feature:${feature.key}`)
    try {
      await adminService.setFeature(feature.key, !feature.enabled, 'Admin Console feature flag degisikligi')
      const data = await adminService.features()
      setFeatures(data.features)
      setToast({ type: 'success', title: 'Ozellik guncellendi', message: 'Riskli degisiklikler auditlenir.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Ozellik guncellenemedi', message: errorMessage(error) })
    } finally {
      setWorkingKey(null)
    }
  }

  async function testIntegration(key: string) {
    setWorkingKey(`integration:${key}`)
    try {
      await adminService.testIntegration(key)
      setToast({ type: 'success', title: 'Kontrol tamamlandi', message: 'Secret degerleri gosterilmeden kontrol edildi.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Kontrol basarisiz', message: errorMessage(error) })
    } finally {
      setWorkingKey(null)
    }
  }

  async function retryOutbox(eventId: string) {
    setWorkingKey(`outbox:${eventId}`)
    try {
      await adminService.retryOutbox(eventId)
      setOutbox(await adminService.outbox())
      setToast({ type: 'success', title: 'Outbox', message: 'Event tekrar kuyruga alindi.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Retry basarisiz', message: errorMessage(error) })
    } finally {
      setWorkingKey(null)
    }
  }

  async function dispatchOnce() {
    setWorkingKey('outbox:dispatch')
    try {
      await adminService.dispatchOutboxOnce()
      setOutbox(await adminService.outbox())
      setToast({ type: 'success', title: 'Outbox', message: 'Dispatch once calisti.' })
    } catch (error) {
      setToast({ type: 'error', title: 'Dispatch basarisiz', message: errorMessage(error) })
    } finally {
      setWorkingKey(null)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-md border border-border bg-card p-3">
          <div className="px-2 py-2">
            <div className="text-sm font-semibold">Sistem Yonetimi</div>
            <div className="mt-1 text-xs text-muted-foreground">Ayar, saglik ve yetki merkezi</div>
          </div>
          <nav className="mt-2 space-y-1" aria-label="Admin Console">
            {navigation.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    'flex h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted',
                    section === item.key && 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Calisma alani, moduller, ozellikler, saglik ve teknik ayarlar tek merkezde.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Yenile
            </button>
          </header>

          {loading ? <LoadingState /> : null}
          {!loading && section === 'dashboard' ? <DashboardView dashboard={dashboard} /> : null}
          {!loading && section === 'workspace' ? (
            <WorkspaceView
              draft={workspaceDraft}
              original={workspace}
              saving={workingKey === 'workspace'}
              onChange={setWorkspaceDraft}
              onSave={saveWorkspace}
            />
          ) : null}
          {!loading && section === 'modules' ? (
            <ModulesView modules={modules} workingKey={workingKey} onToggle={toggleModule} />
          ) : null}
          {!loading && section === 'features' ? (
            <FeaturesView features={features} workingKey={workingKey} onToggle={toggleFeature} />
          ) : null}
          {!loading && section === 'health' ? <HealthView health={health} /> : null}
          {!loading && section === 'integrations' ? (
            <IntegrationsView integrations={integrations} workingKey={workingKey} onTest={testIntegration} />
          ) : null}
          {!loading && section === 'outbox' ? (
            <OutboxView
              outbox={outbox}
              workingKey={workingKey}
              onRetry={retryOutbox}
              onDispatch={dispatchOnce}
            />
          ) : null}
          {!loading && section === 'technical' ? <TechnicalView data={technical} /> : null}
        </div>
      </div>
    </main>
  )
}

function DashboardView({ dashboard }: { dashboard: AdminDashboard | null }) {
  if (!dashboard) return <EmptyState text="Admin Console verisi bulunamadi." />
  const summary = dashboard.summary
  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Hazir modul" value={`${summary.modules_ready}/${summary.modules_total}`} icon={CheckCircle2} tone="emerald" />
        <Metric label="Kurulum isteyen" value={summary.modules_setup_required} icon={AlertTriangle} tone="amber" />
        <Metric label="Feature flag" value={summary.feature_flags_total} icon={Flag} />
        <Metric label="Failed outbox" value={summary.outbox_failed} icon={XCircle} tone={summary.outbox_failed ? 'red' : 'emerald'} />
      </section>
      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Baslangic Paneli</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.quick_links.map(link => (
            <Link key={link.href} href={link.href} className="rounded-md border border-border bg-background px-3 py-3 text-sm font-medium hover:bg-muted">
              {link.label}
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Sistem Uyarilari</h2>
        <div className="mt-3 space-y-2">
          {dashboard.warnings.map(warning => <WarningRow key={warning} text={warning} />)}
          {!dashboard.warnings.length ? <EmptyState text="Kritik kurulum uyarisi yok." /> : null}
        </div>
      </section>
    </div>
  )
}

function WorkspaceView(props: {
  draft: Partial<WorkspaceSettings>
  original: WorkspaceSettings | null
  saving: boolean
  onChange: (draft: Partial<WorkspaceSettings>) => void
  onSave: () => void
}) {
  const { draft, original, saving, onChange, onSave } = props
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Calisma Alani Ayarlari</h2>
          <p className="text-sm text-muted-foreground">Degisiklikler audit izine yazilir; secret deger tutulmaz.</p>
        </div>
        <StatusBadge status={original?.tenant_id ? 'configured' : 'missing'} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Calisma alani adi" value={draft.workspace_name || ''} onChange={value => onChange({ ...draft, workspace_name: value })} />
        <Input label="Ulke" value={draft.country || ''} onChange={value => onChange({ ...draft, country: value.toUpperCase() })} />
        <Input label="Varsayilan dil" value={draft.default_language || ''} onChange={value => onChange({ ...draft, default_language: value })} />
        <Input label="Varsayilan para birimi" value={draft.default_currency || ''} onChange={value => onChange({ ...draft, default_currency: value.toUpperCase() })} />
        <Input label="Zaman dilimi" value={draft.timezone || ''} onChange={value => onChange({ ...draft, timezone: value })} />
        <Input label="Tarih formati" value={draft.date_format || ''} onChange={value => onChange({ ...draft, date_format: value })} />
      </div>
      <button type="button" onClick={onSave} disabled={saving} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
        Kaydet
      </button>
    </section>
  )
}

function ModulesView({ modules, workingKey, onToggle }: { modules: AdminModule[]; workingKey: string | null; onToggle: (moduleItem: AdminModule) => void }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="text-base font-semibold">Moduller ve Lisanslar</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Modul</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2">Hazirlik</th>
              <th className="px-3 py-2">Ozellik</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {modules.map(moduleItem => (
              <tr key={moduleItem.module_key}>
                <td className="px-3 py-3">
                  <div className="font-medium">{moduleItem.name}</div>
                  <div className="text-xs text-muted-foreground">{moduleItem.category}</div>
                </td>
                <td className="px-3 py-3"><StatusBadge status={moduleItem.status} /></td>
                <td className="px-3 py-3 text-muted-foreground">{moduleItem.readiness_status}</td>
                <td className="px-3 py-3">{moduleItem.feature_count || 0}</td>
                <td className="px-3 py-3 text-right">
                  <button type="button" onClick={() => onToggle(moduleItem)} disabled={workingKey === `module:${moduleItem.module_key}`} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-2 text-xs hover:bg-muted disabled:opacity-50">
                    <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                    {moduleItem.enabled ? 'Kapat' : 'Ac'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function FeaturesView({ features, workingKey, onToggle }: { features: AdminFeatureFlag[]; workingKey: string | null; onToggle: (feature: AdminFeatureFlag) => void }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="text-base font-semibold">Feature Flags</h2>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {features.map(feature => (
          <div key={feature.key} className="rounded-md border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{feature.label}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{feature.key}</div>
                <p className="mt-2 text-xs text-muted-foreground">{feature.description}</p>
                {isRiskyFeature(feature) ? (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    Bu ayar kritik sistem davranisini etkileyebilir.
                  </p>
                ) : null}
              </div>
              <StatusBadge status={feature.enabled ? 'enabled' : 'disabled'} />
            </div>
            <button type="button" onClick={() => onToggle(feature)} disabled={workingKey === `feature:${feature.key}`} className="mt-3 inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted disabled:opacity-50">
              {feature.enabled ? 'Kapat' : 'Ac'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function HealthView({ health }: { health: AdminHealth | null }) {
  if (!health) return <EmptyState text="Saglik verisi bulunamadi." />
  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Genel durum" value={statusLabel(health.status)} icon={Activity} tone={health.status === 'ok' ? 'emerald' : 'amber'} />
        <Metric label="Ortam" value={health.environment || '-'} icon={Settings} />
        <Metric label="Servis" value={health.service || '-'} icon={Shield} />
        <Metric label="Versiyon" value={health.version || '-'} icon={Flag} />
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        {Object.entries(health.checks || {}).map(([key, check]) => (
          <div key={key} className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{check.label || key}</div>
                <div className="mt-1 text-xs text-muted-foreground">{check.message || 'Kontrol sonucu hazir.'}</div>
              </div>
              <StatusBadge status={check.status} />
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function IntegrationsView({ integrations, workingKey, onTest }: { integrations: AdminIntegration[]; workingKey: string | null; onTest: (key: string) => void }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {integrations.map(item => (
        <div key={item.integration_key} className="rounded-md border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">{item.label}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-3 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            Gizli degerler guvenlik nedeniyle gosterilmez.
          </div>
          <button type="button" onClick={() => onTest(item.integration_key)} disabled={workingKey === `integration:${item.integration_key}`} className="mt-3 inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted disabled:opacity-50">
            Health check
          </button>
        </div>
      ))}
    </section>
  )
}

function OutboxView(props: { outbox: AdminOutbox | null; workingKey: string | null; onRetry: (id: string) => void; onDispatch: () => void }) {
  const { outbox, workingKey, onRetry, onDispatch } = props
  if (!outbox?.available) return <EmptyState text="Outbox altyapisi hazir degil." />
  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-4">
        {Object.entries(outbox.counts || {}).map(([status, count]) => (
          <Metric key={status} label={status} value={count} icon={Send} tone={status === 'failed' ? 'red' : undefined} />
        ))}
      </section>
      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Failed Events</h2>
          <button type="button" onClick={onDispatch} disabled={workingKey === 'outbox:dispatch'} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
            Dispatch once
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {outbox.recent_failed.map(event => (
            <div key={event.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{event.event_type || event.id}</div>
                <div className="font-mono text-xs text-muted-foreground">{event.id}</div>
              </div>
              <button type="button" onClick={() => onRetry(event.id)} disabled={workingKey === `outbox:${event.id}`} className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs hover:bg-muted disabled:opacity-50">
                Retry
              </button>
            </div>
          ))}
          {!outbox.recent_failed.length ? <EmptyState text="Failed outbox event yok." /> : null}
        </div>
      </section>
    </div>
  )
}

function TechnicalView({ data }: { data: Record<string, unknown> | null }) {
  const technical = (data?.technical || {}) as Record<string, unknown>
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="text-base font-semibold">Teknik Bilgiler</h2>
      <p className="mt-1 text-sm text-muted-foreground">Secret, token, DB URL veya service key gosterilmez.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {Object.entries(technical).map(([key, value]) => (
          <div key={key} className="rounded-md border border-border bg-background p-3">
            <div className="text-xs text-muted-foreground">{key}</div>
            <div className="mt-1 font-mono text-sm">{String(value)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone?: 'emerald' | 'amber' | 'red' }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className={cn('mt-2 truncate text-2xl font-semibold', tone === 'emerald' && 'text-emerald-700 dark:text-emerald-300', tone === 'amber' && 'text-amber-700 dark:text-amber-300', tone === 'red' && 'text-red-700 dark:text-red-300')}>{value}</div>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary" />
    </label>
  )
}

function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status)
  return <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium', tone)}>{statusLabel(status)}</span>
}

function WarningRow({ text }: { text: string }) {
  return <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">{text}</div>
}

function LoadingState() {
  return <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">Yukleniyor...</div>
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">{text}</div>
}

function statusTone(status: string) {
  if (['ok', 'ready', 'available', 'configured', 'enabled'].includes(status)) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
  }
  if (['error', 'failed', 'missing', 'disabled'].includes(status)) {
    return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
  }
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ok: 'Saglikli',
    warning: 'Uyari',
    degraded: 'Uyari',
    error: 'Sorun var',
    missing: 'Yapilandirilmamis',
    configured: 'Yapilandirilmis',
    available: 'Kullanilabilir',
    disabled: 'Kapali',
    enabled: 'Acik',
  }
  return labels[status] || status
}

function isRiskyFeature(feature: AdminFeatureFlag) {
  return Boolean(feature.risk) || [
    'processEngine.enabled',
    'auditLog.enabled',
    'actionCenter.enabled',
    'documents.enabled',
    'notifications.email',
    'representatives.scopeAuthority',
    'accounting.enabled',
    'adminConsole.outboxAdmin',
    'adminConsole.technicalPage',
  ].includes(feature.key)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Islem tamamlanamadi.'
}
