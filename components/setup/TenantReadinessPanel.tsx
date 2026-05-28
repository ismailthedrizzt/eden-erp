'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Wrench } from 'lucide-react'
import { apiClient } from '@/lib/api/apiClient'
import { normalizeProductStatus, productStatusLabels } from '@/lib/modules/moduleProductCatalog'
import { ModuleReadinessCard, type ModuleReadinessCardData } from './ModuleReadinessCard'

type TenantReadinessResponse = {
  data?: {
    ready: boolean
    blockingModules: string[]
    warningModules: string[]
    modules: ModuleReadinessCardData[] | Record<string, unknown>
  }
}

type NormalizedTenantReadiness = {
  ready: boolean
  blockingModules: string[]
  warningModules: string[]
  modules: ModuleReadinessCardData[]
}

const PRIMARY_MODULES = ['companies', 'partners', 'representatives', 'branches', 'organization', 'facilities']

export function TenantReadinessPanel() {
  const [data, setData] = useState<NormalizedTenantReadiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const visibleModules = useMemo(() => {
    if (!data?.modules) return []
    const primary = data.modules.filter(module => PRIMARY_MODULES.includes(module.moduleKey))
    const blocked = data.modules.filter(module => !module.ready && !PRIMARY_MODULES.includes(module.moduleKey))
    const others = data.modules.filter(module => module.ready && !PRIMARY_MODULES.includes(module.moduleKey))
    return [...primary, ...blocked, ...others]
  }, [data])

  const summary = useMemo(() => {
    const modules = data?.modules || []
    return {
      total: modules.length,
      available: modules.filter(module => module.ready || normalizeProductStatus(module.status) === 'available').length,
      setupRequired: modules.filter(module => normalizeProductStatus(module.status) === 'setup_required').length,
      unlicensed: modules.filter(module => normalizeProductStatus(module.status) === 'unlicensed').length,
      dependencyMissing: modules.filter(module => normalizeProductStatus(module.status) === 'dependency_missing').length,
      critical: modules.filter(module => !module.ready).length,
    }
  }, [data])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<TenantReadinessResponse>('/api/setup/readiness', { useCache: false })
      setData(normalizeTenantReadiness(response))
    } catch {
      setError('Calisma alani hazirlik durumu su anda okunamadi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <section data-tour-id="setup-readiness" className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-eden-navy-3/70">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white text-eden-blue shadow-sm dark:bg-eden-navy-2 dark:text-blue-300">
            {loading ? <Loader2 size={20} className="animate-spin" /> : data?.ready ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Calisma alani hazirlik durumu</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              {data?.ready
                ? 'Temel moduller kullanima hazir gorunuyor. Uyari olan moduller yine de ek ozellikler icin kontrol edilebilir.'
                : 'Bazi moduller kullanilmadan once kurulum veya bagli modul kontrolu gerektiriyor.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-eden-navy-2 dark:text-gray-200 dark:hover:bg-eden-navy"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <ReadinessStat icon={<ShieldCheck size={16} />} label="Toplam modul" value={summary.total} />
          <ReadinessStat icon={<CheckCircle2 size={16} />} label="Kullanima hazir" value={summary.available} tone="success" />
          <ReadinessStat icon={<Wrench size={16} />} label="Kurulum isteyen" value={summary.setupRequired} tone="warning" />
          <ReadinessStat icon={<AlertCircle size={16} />} label="Lisanssiz" value={summary.unlicensed} tone="danger" />
          <ReadinessStat icon={<AlertCircle size={16} />} label="Bagimlilik eksik" value={summary.dependencyMissing} tone="warning" />
          <ReadinessStat icon={<AlertCircle size={16} />} label="Kritik engel" value={summary.critical} tone={summary.critical ? 'danger' : 'success'} />
        </div>
      )}

      {!loading && visibleModules.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleModules.map(module => (
            <ModuleReadinessCard key={module.moduleKey} module={module} />
          ))}
        </div>
      )}
    </section>
  )
}

function ReadinessStat({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: ReactNode
  label: string
  value: number
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  const toneClass = {
    neutral: 'bg-white text-gray-700 dark:bg-eden-navy-2 dark:text-gray-200',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200',
  }[tone]
  return (
    <div className={`rounded-lg border border-gray-200 p-3 dark:border-gray-700 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}

function normalizeTenantReadiness(response: TenantReadinessResponse | any): NormalizedTenantReadiness {
  const payload = response?.data || response || {}
  const rawModules = payload.modules || {}
  const modules = Array.isArray(rawModules)
    ? rawModules.map(normalizeModule)
    : Object.entries(rawModules).map(([key, value]) => normalizeModule({ module_key: key, ...(value as Record<string, unknown>) }))
  const blockingModules = payload.blockingModules || payload.blocking_modules || modules.filter(module => !module.ready).map(module => module.moduleKey)
  return {
    ready: Boolean(payload.ready ?? payload.ok ?? blockingModules.length === 0),
    blockingModules,
    warningModules: payload.warningModules || payload.warning_modules || modules.filter(module => module.warnings.length > 0).map(module => module.moduleKey),
    modules,
  }
}

function normalizeModule(raw: any): ModuleReadinessCardData {
  const moduleKey = raw.moduleKey || raw.module_key || raw.key || 'unknown'
  const rawStatus = raw.status || raw.readiness_status || (raw.ok || raw.ready ? 'ready' : 'setup_required')
  const status = normalizeProductStatus(rawStatus)
  const ready = Boolean(raw.ready ?? raw.ok ?? status === 'available')
  return {
    moduleKey,
    ready,
    status,
    blockingReasons: raw.blockingReasons || raw.blocking_reasons || (ready ? [] : [raw.message || productStatusLabels[status] || 'Kurulum kontrolu gerekli.']),
    warnings: raw.warnings || [],
    setupSteps: normalizeSetupSteps(moduleKey, raw.setupSteps || raw.setup_steps || [], ready),
    setupActions: raw.setupActions || raw.setup_actions || [],
    licenseStatus: raw.licenseStatus || raw.license_status,
    dependencies: raw.dependencies || raw.missing_dependencies || [],
    description: raw.description,
  }
}

function normalizeSetupSteps(moduleKey: string, steps: any[], ready: boolean) {
  if (!Array.isArray(steps)) return []
  return steps.map((step, index) => {
    if (typeof step === 'string') {
      return {
        key: `${moduleKey}.${index}`,
        label: step,
        description: step,
        required: true,
        status: ready ? 'completed' : 'missing',
      }
    }
    return {
      key: step.key || `${moduleKey}.${index}`,
      label: step.label || step.name || 'Kurulum adimi',
      description: step.description || step.label || 'Bu adim modul hazirligi icin gereklidir.',
      required: step.required !== false,
      status: step.status || (ready ? 'completed' : 'missing'),
      action: step.action,
    }
  })
}
