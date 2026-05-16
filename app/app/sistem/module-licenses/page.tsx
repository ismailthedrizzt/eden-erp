'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  Layers,
  LockKeyhole,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import { formControlClass } from '@/components/ui/formControlStyles'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch'
import { TriStateToggle } from '@/components/ui/TriStateToggle'
import { useModuleLicense, ModuleLicense, SubmoduleLicense } from '@/hooks/useModuleLicense'
import { cn } from '@/lib/utils'

type TriState = 'on' | 'off' | 'partial'
type Environment = 'all' | 'development' | 'production' | 'test' | 'dev' | 'prod'

interface ModuleRow extends ModuleLicense {
  id: string
  submodule_count: number
  active_submodule_count: number
  inactive_submodule_count: number
  state: TriState
  health: string
  last_updated: string
}

const MODULE_ORDER = ['sirket', 'ik', 'teskilat', 'kadro', 'muhasebe', 'stok', 'satis', 'uretim', 'servis']

export default function ModuleLicensesPage() {
  const { modules, submodules, loading, error, refetch } = useModuleLicense()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const submodulesByModule = useMemo(() => {
    return Object.values(submodules).reduce<Record<string, SubmoduleLicense[]>>((acc, submodule) => {
      acc[submodule.module_key] = [...(acc[submodule.module_key] || []), submodule]
      return acc
    }, {})
  }, [submodules])

  const rows = useMemo<ModuleRow[]>(() => {
    return Object.values(modules)
      .map((module) => {
        const moduleSubmodules = submodulesByModule[module.module_key] || []
        const active = moduleSubmodules.filter((item) => item.is_active).length
        const inactive = moduleSubmodules.length - active
        const state = getModuleState(module, moduleSubmodules)
        return {
          ...module,
          id: module.module_key,
          submodule_count: moduleSubmodules.length,
          active_submodule_count: active,
          inactive_submodule_count: inactive,
          state,
          health: state === 'on' ? 'Aktif' : state === 'partial' ? 'Kısmi' : 'Kapalı',
          last_updated: (module as any).updated_at || '',
        }
      })
      .filter((row) => {
        const needle = query.trim().toLocaleLowerCase('tr-TR')
        if (!needle) return true
        return [row.module_name, row.module_key, row.environment, row.health]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(needle))
      })
      .sort((a, b) => {
        const aIndex = MODULE_ORDER.indexOf(a.module_key)
        const bIndex = MODULE_ORDER.indexOf(b.module_key)
        if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
        return a.module_name.localeCompare(b.module_name, 'tr')
      })
  }, [modules, query, submodulesByModule])

  const selectedModule = selectedModuleKey ? modules[selectedModuleKey] : rows[0]
  const selectedSubmodules = selectedModule ? submodulesByModule[selectedModule.module_key] || [] : []
  const allCount = rows.length
  const activeCount = rows.filter((row) => row.state === 'on').length
  const partialCount = rows.filter((row) => row.state === 'partial').length
  const inactiveCount = rows.filter((row) => row.state === 'off').length

  const columns: ColumnDef[] = [
    { key: 'module_name', label: 'Modül', type: 'text', width: 260, sortable: true, render: (_, row) => <ModuleNameCell row={row} expanded={expandedModules.has(row.module_key)} onToggle={() => toggleExpand(row.module_key)} /> },
    { key: 'module_key', label: 'Key', type: 'text', width: 130 },
    { key: 'health', label: 'Durum', type: 'text', width: 120, render: (_, row) => <StateBadge state={row.state} /> },
    { key: 'active_submodule_count', label: 'Aktif Alt Modül', type: 'number', width: 130 },
    { key: 'inactive_submodule_count', label: 'Kapalı', type: 'number', width: 90 },
    { key: 'environment', label: 'Ortam', type: 'text', width: 120, render: (value) => <EnvironmentBadge value={value} /> },
    { key: 'actions', label: 'İşlemler', type: 'text', width: 220, render: (_, row) => <ModuleActions row={row} busy={busyKey === row.module_key} onToggle={() => setModuleEnabled(row.module_key, row.state !== 'on')} onConfigure={() => setSelectedModuleKey(row.module_key)} /> },
  ]

  const widgets: WidgetDef<ModuleRow>[] = [
    { key: 'total', label: 'Toplam Modül', render: () => allCount },
    { key: 'active', label: 'Aktif', render: () => activeCount },
    { key: 'partial', label: 'Kısmi', render: () => partialCount },
    { key: 'inactive', label: 'Kapalı', render: () => inactiveCount },
  ]

  function toggleExpand(moduleKey: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      next.has(moduleKey) ? next.delete(moduleKey) : next.add(moduleKey)
      return next
    })
  }

  async function patchLicense(payload: Record<string, any>, keyForBusy: string) {
    setBusyKey(keyForBusy)
    setToast(null)
    try {
      const response = await fetch('/api/settings/module-licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Lisans güncellenemedi')
      await refetch()
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Lisans güncellenemedi')
    } finally {
      setBusyKey(null)
    }
  }

  async function setModuleEnabled(moduleKey: string, enabled: boolean) {
    await patchLicense({ type: 'module', key: moduleKey, is_active: enabled }, moduleKey)
  }

  async function setSubmoduleEnabled(moduleKey: string, submoduleKey: string, enabled: boolean) {
    await patchLicense({ type: 'submodule', moduleKey, submoduleKey, is_active: enabled }, `${moduleKey}:${submoduleKey}`)
  }

  async function setModuleEnvironment(moduleKey: string, environment: Environment) {
    await patchLicense({ type: 'module', key: moduleKey, environment }, moduleKey)
  }

  async function setSubmoduleEnvironment(moduleKey: string, submoduleKey: string, environment: Environment) {
    await patchLicense({ type: 'submodule', moduleKey, submoduleKey, environment }, `${moduleKey}:${submoduleKey}`)
  }

  async function handleTriState(moduleKey: string, state: TriState) {
    await setModuleEnabled(moduleKey, state !== 'on')
  }

  if (loading) {
    return (
      <div>
        <PageBanner mode="list" title="Modül Lisansları" subtitle="Modül ve alt modül erişimlerini yönetin" icon={<Settings size={24} />} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageBanner mode="list" title="Modül Lisansları" subtitle="Modül ve alt modül erişimlerini yönetin" icon={<Settings size={24} />} />
        <EmptyState icon={<AlertTriangle size={28} />} title="Lisanslar yüklenemedi" description={error} />
      </div>
    )
  }

  if (Object.keys(modules).length === 0) {
    return (
      <div>
        <PageBanner mode="list" title="Modül Lisansları" subtitle="Modül ve alt modül erişimlerini yönetin" icon={<Settings size={24} />} />
        <EmptyState icon={<LockKeyhole size={28} />} title="Modül lisansı bulunamadı" description="Veritabanı tablolarının ve varsayılan lisans kayıtlarının oluşturulduğundan emin olun." />
      </div>
    )
  }

  return (
    <div className="relative">
      <PageBanner
        mode="list"
        title="Modül Lisansları"
        subtitle="ERP modül erişimlerini, ortam kapsamını ve alt modül görünürlüğünü yönetin"
        icon={<Settings size={24} />}
      />

      {toast && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <span className="flex items-center gap-2"><AlertTriangle size={16} />{toast}</span>
          <button onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Modül, key veya ortam ara"
                className={formControlClass({ className: 'pl-9' })}
              />
            </div>
            <button onClick={refetch} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900">
              <RefreshCw size={16} />
              Yenile
            </button>
            <button onClick={() => setExpandedModules(new Set(rows.map((row) => row.module_key)))} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900">
              <Layers size={16} />
              Tümünü Aç
            </button>
          </div>

          <SmartDataTable
            columns={columns}
            data={rows}
            widgets={widgets}
            defaultView="list"
            storageKey="module-licenses"
            emptyText="Modül lisansı bulunamadı"
            onRowClick={(row) => setSelectedModuleKey(row.module_key)}
            onRefresh={refetch}
            showActions={false}
          />

          <div className="space-y-3">
            {rows.filter((row) => expandedModules.has(row.module_key)).map((row) => (
              <SubmoduleStrip
                key={row.module_key}
                module={row}
                submodules={submodulesByModule[row.module_key] || []}
                busyKey={busyKey}
                onToggle={setSubmoduleEnabled}
                onConfigure={() => setSelectedModuleKey(row.module_key)}
              />
            ))}
          </div>
        </div>

        <LicenseDetailPanel
          module={selectedModule || null}
          submodules={selectedSubmodules}
          busyKey={busyKey}
          onClose={() => setSelectedModuleKey(null)}
          onModuleToggle={setModuleEnabled}
          onModuleTriState={handleTriState}
          onModuleEnvironment={setModuleEnvironment}
          onSubmoduleToggle={setSubmoduleEnabled}
          onSubmoduleEnvironment={setSubmoduleEnvironment}
        />
      </div>
    </div>
  )
}

function ModuleNameCell({ row, expanded, onToggle }: { row: ModuleRow; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {row.submodule_count > 0 ? expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : <span className="block w-[15px]" />}
      </button>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <ShieldCheck size={17} />
      </div>
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{row.module_name}</div>
        <div className="text-xs text-gray-500">{row.submodule_count} alt modül</div>
      </div>
    </div>
  )
}

function ModuleActions({ row, busy, onToggle, onConfigure }: { row: ModuleRow; busy: boolean; onToggle: () => void; onConfigure: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <ToggleSwitch checked={row.state === 'on'} onChange={onToggle} size="sm" disabled={busy} />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onConfigure()
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
      >
        <SlidersHorizontal size={14} />
        Ayarla
      </button>
    </div>
  )
}

function SubmoduleStrip({ module, submodules, busyKey, onToggle, onConfigure }: {
  module: ModuleRow
  submodules: SubmoduleLicense[]
  busyKey: string | null
  onToggle: (moduleKey: string, submoduleKey: string, enabled: boolean) => void
  onConfigure: () => void
}) {
  if (submodules.length === 0) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{module.module_name} alt modülleri</div>
          <div className="text-xs text-gray-500">Alt modül görünürlüğünü hızlıca değiştirin.</div>
        </div>
        <button onClick={onConfigure} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900">Detay</button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {submodules.map((submodule) => (
          <div key={`${submodule.module_key}:${submodule.submodule_key}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/60">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{submodule.submodule_name}</div>
              <div className="text-xs text-gray-500">{submodule.submodule_key} · {submodule.environment}</div>
            </div>
            <ToggleSwitch checked={submodule.is_active} onChange={() => onToggle(submodule.module_key, submodule.submodule_key, !submodule.is_active)} size="sm" disabled={busyKey === `${submodule.module_key}:${submodule.submodule_key}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

function LicenseDetailPanel({
  module,
  submodules,
  busyKey,
  onClose,
  onModuleToggle,
  onModuleTriState,
  onModuleEnvironment,
  onSubmoduleToggle,
  onSubmoduleEnvironment,
}: {
  module: ModuleLicense | ModuleRow | null
  submodules: SubmoduleLicense[]
  busyKey: string | null
  onClose: () => void
  onModuleToggle: (moduleKey: string, enabled: boolean) => void
  onModuleTriState: (moduleKey: string, state: TriState) => void
  onModuleEnvironment: (moduleKey: string, environment: Environment) => void
  onSubmoduleToggle: (moduleKey: string, submoduleKey: string, enabled: boolean) => void
  onSubmoduleEnvironment: (moduleKey: string, submoduleKey: string, environment: Environment) => void
}) {
  if (!module) {
    return <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">Detay için bir modül seçin.</div>
  }

  const state = getModuleState(module, submodules)
  const activeSubmodules = submodules.filter((item) => item.is_active).length

  return (
    <aside className="sticky top-4 h-fit rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{module.module_name}</h3>
              <p className="text-xs text-gray-500">{module.module_key}</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900"><X size={16} /></button>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <DetailStat label="Durum" value={<StateBadge state={state} />} />
          <DetailStat label="Alt Modül" value={submodules.length} />
          <DetailStat label="Aktif" value={activeSubmodules} />
        </div>

        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Modül Lisansı</div>
              <div className="text-xs text-gray-500">Alt modüller varsa tri-state durum gösterir.</div>
            </div>
            {submodules.length > 0 ? (
              <TriStateToggle state={state} onChange={() => onModuleTriState(module.module_key, state)} />
            ) : (
              <ToggleSwitch checked={module.is_active} onChange={() => onModuleToggle(module.module_key, !module.is_active)} size="md" disabled={busyKey === module.module_key} />
            )}
          </div>
          <label className="block text-xs font-medium text-gray-500">Ortam Kapsamı</label>
          <select
            value={module.environment}
            onChange={(event) => onModuleEnvironment(module.module_key, event.target.value as Environment)}
            className={formControlClass({ className: 'mt-1' })}
          >
            {environmentOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Alt Modüller</h4>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">{submodules.length}</span>
          </div>
          {submodules.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">Bu modüle bağlı alt modül yok.</div>}
          {submodules.map((submodule) => (
            <div key={`${submodule.module_key}:${submodule.submodule_key}`} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{submodule.submodule_name}</div>
                  <div className="text-xs text-gray-500">{submodule.submodule_key}</div>
                </div>
                <ToggleSwitch checked={submodule.is_active} onChange={() => onSubmoduleToggle(submodule.module_key, submodule.submodule_key, !submodule.is_active)} size="sm" disabled={busyKey === `${submodule.module_key}:${submodule.submodule_key}`} />
              </div>
              <select
                value={submodule.environment}
                onChange={(event) => onSubmoduleEnvironment(submodule.module_key, submodule.submodule_key, event.target.value as Environment)}
                className={formControlClass({ size: 'sm', className: 'mt-2' })}
              >
                {environmentOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/60">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><History size={15} />Değişiklik Notu</div>
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">Modül kapatıldığında bağlı alt modüller de kapatılır. Alt modüller tek tek açıldığında modül durumu kısmi olarak görünür.</p>
        </div>
      </div>
    </aside>
  )
}

function DetailStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/60">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-900">{icon}</div>
      <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  )
}

function StateBadge({ state }: { state: TriState }) {
  const config = {
    on: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    partial: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    off: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
  }[state]
  const label = state === 'on' ? 'Aktif' : state === 'partial' ? 'Kısmi' : 'Kapalı'
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', config)}>{state === 'on' && <CheckCircle2 size={12} />}{label}</span>
}

function EnvironmentBadge({ value }: { value: string }) {
  return <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{environmentLabel(value)}</span>
}

function getModuleState(module: ModuleLicense, moduleSubmodules: SubmoduleLicense[]): TriState {
  if (moduleSubmodules.length === 0) return module.is_active ? 'on' : 'off'
  const activeCount = moduleSubmodules.filter((item) => item.is_active).length
  if (activeCount === moduleSubmodules.length && module.is_active) return 'on'
  if (activeCount === 0 || !module.is_active) return 'off'
  return 'partial'
}

function environmentOptions() {
  return [
    { value: 'all', label: 'Tüm Ortamlar' },
    { value: 'development', label: 'Development' },
    { value: 'production', label: 'Production' },
    { value: 'test', label: 'Test' },
    { value: 'dev', label: 'Dev (legacy)' },
    { value: 'prod', label: 'Prod (legacy)' },
  ]
}

function environmentLabel(value: string) {
  return environmentOptions().find((option) => option.value === value)?.label || value
}
