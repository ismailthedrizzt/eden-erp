'use client'
import { useEffect, useMemo, useState } from 'react'
import { Check, Home, Settings, SlidersHorizontal } from 'lucide-react'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'
import { ActionCenterSummaryCards } from '@/components/action-center/ActionCenterSummaryCards'
import { homePageContract } from '@/contracts/pages/home/home.page.contract'
import { formControlClass } from '@/components/ui/formControlStyles'
import type { AnyDashboardWidgetConfig } from '@/components/dashboard/dashboard.types'
import { PageBanner } from '@/components/ui/PageBanner'
import { usePersonel } from '@/hooks/usePersonel'
import { normalizeWidgetPreferenceIds, widgetPreferenceStorageKey } from '@/lib/dashboard/widgetPreferences'
import {
  dashboardWidgetRegistry,
  uniqueWidgetModules,
  uniqueWidgetPages,
  type DashboardWidgetRegistryRecord,
} from '@/lib/dashboard/widgetRegistry'
import { companyGeographicReachWidgetConfig } from '@/lib/modules/companies/dashboard/companyGeographicReach.config'
import { buildEmployeesDashboard } from '@/lib/modules/employees/dashboard/employeesDashboard.mock'
import { getEducationSummary } from '@/lib/modules/employees/education'
import type { Personel } from '@/types'
import { getCachedTablePreference, syncUiPreferencesPatch } from '@/lib/user-state/client'

const HOME_DASHBOARD_CONTRACT = homePageContract.dashboard
const WIDGET_STORAGE_KEY = HOME_DASHBOARD_CONTRACT.legacyStorageKey
const WIDGET_STORAGE_SCOPE = HOME_DASHBOARD_CONTRACT.widgetStorageScope
const HOME_WIDGET_PREFERENCE_KEY = HOME_DASHBOARD_CONTRACT.widgetPreferenceKey
const CAN_CONFIGURE_HOME_WIDGETS = homePageContract.allowedActions.includes('configure_dashboard_widgets')
const CURRENT_USER = {
  first_name: 'İsmail',
  last_name: 'ILGAR',
  sgk_entry_date: '2024-01-15',
  birth_date: '1990-04-27',
}

interface WidgetModalProps {
  open: boolean
  selectedWidgetIds: string[]
  onClose: () => void
  onSave: (ids: string[]) => void
}

function WidgetModal({ open, selectedWidgetIds, onClose, onSave }: WidgetModalProps) {
  const [draftIds, setDraftIds] = useState<string[]>(selectedWidgetIds)
  const [moduleKey, setModuleKey] = useState('')
  const [pageKey, setPageKey] = useState('')

  useEffect(() => {
    if (!open) return
    setDraftIds(selectedWidgetIds)
    setModuleKey('')
    setPageKey('')
  }, [open, selectedWidgetIds])

  const modules = uniqueWidgetModules()
  const pages = uniqueWidgetPages(dashboardWidgetRegistry, moduleKey || undefined)
  const filteredWidgets = dashboardWidgetRegistry.filter(widget =>
    (!moduleKey || widget.moduleKey === moduleKey) &&
    (!pageKey || widget.pageKey === pageKey)
  )

  const toggleWidget = (id: string) => {
    setDraftIds(prev => prev.includes(id)
      ? prev.filter(item => item !== id)
      : [...prev, id]
    )
  }

  const saveWidgets = () => {
    onSave(draftIds)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl dark:bg-eden-navy-2">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mevcut Widget&apos;ları Ekle</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Widget kayıtlarını modül ve sayfaya göre filtreleyerek ana sayfaya ekleyin.
            </p>
          </div>
          <div className="rounded-lg bg-eden-blue/10 p-2 text-eden-blue">
            <SlidersHorizontal size={20} />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>Modül</span>
            <select
              value={moduleKey}
              onChange={(event) => {
                setModuleKey(event.target.value)
                setPageKey('')
              }}
              className={formControlClass()}
            >
              <option value="">Tüm Modüller</option>
              {modules.map(module => (
                <option key={module.key} value={module.key}>{module.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>Sayfa</span>
            <select
              value={pageKey}
              onChange={(event) => setPageKey(event.target.value)}
              className={formControlClass()}
            >
              <option value="">Tüm Sayfalar</option>
              {pages.map(page => (
                <option key={`${page.moduleKey}:${page.key}`} value={page.key}>{page.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {filteredWidgets.map(widget => (
            <WidgetChoice
              key={widget.id}
              widget={widget}
              selected={draftIds.includes(widget.id)}
              onToggle={() => toggleWidget(widget.id)}
            />
          ))}
          {filteredWidgets.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Bu filtrelere uygun widget kaydı bulunamadı.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-eden-navy"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={saveWidgets}
            className="rounded-lg bg-eden-blue px-4 py-2 text-sm font-medium text-white hover:bg-eden-blue-dk"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}

function WidgetChoice({ widget, selected, onToggle }: { widget: DashboardWidgetRegistryRecord; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-eden-navy"
    >
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-eden-blue bg-eden-blue text-white' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'}`}>
        {selected && <Check size={14} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-gray-900 dark:text-white">{widget.title}</span>
        <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
          {widget.moduleLabel} / {widget.pageLabel}
        </span>
        {widget.description && (
          <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">{widget.description}</span>
        )}
      </span>
    </button>
  )
}

export default function AnaSayfa() {
  const [widgetModalOpen, setWidgetModalOpen] = useState(false)
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([])
  const { data: employees } = usePersonel()

  useEffect(() => {
    const cachedWidgetPreference = getCachedTablePreference<{ selectedWidgetIds?: unknown[] }>(HOME_WIDGET_PREFERENCE_KEY)
    if (Array.isArray(cachedWidgetPreference?.selectedWidgetIds)) {
      setSelectedWidgetIds(normalizeSavedWidgetIds(cachedWidgetPreference.selectedWidgetIds))
      return
    }

    const preferenceKey = widgetPreferenceStorageKey(WIDGET_STORAGE_SCOPE)
    const saved = localStorage.getItem(`${preferenceKey}:ids`) ?? localStorage.getItem(WIDGET_STORAGE_KEY)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      setSelectedWidgetIds(Array.isArray(parsed) ? normalizeSavedWidgetIds(parsed) : [])
    } catch {
      setSelectedWidgetIds([])
    }
  }, [])

  const duration = useMemo(() => calculateDuration(CURRENT_USER.sgk_entry_date), [])
  const birthday = isBirthday(CURRENT_USER.birth_date)
  const employeeRows = useMemo(() => (employees || []).map(toEmployeeDashboardRow), [employees])
  const availableWidgets = useMemo(() => {
    const homeWidgets = buildHomeDashboardWidgets(CURRENT_USER, duration, birthday)
    const companyWidgets = buildCompanyDashboardWidgets()
    const employeeWidgets = buildEmployeesDashboard(employeeRows).map(widget => ({
      ...widget,
      permissions: [],
    }))
    return new Map([...homeWidgets, ...companyWidgets, ...employeeWidgets].map(widget => [widget.id, widget]))
  }, [birthday, duration, employeeRows])

  const selectedWidgets = selectedWidgetIds
    .map(id => availableWidgets.get(id) || buildRegisteredWidgetPlaceholder(id))
    .filter((widget): widget is AnyDashboardWidgetConfig => Boolean(widget))

  const handleSaveWidgets = (ids: string[]) => {
    const normalizedIds = normalizeSavedWidgetIds(ids)
    setSelectedWidgetIds(normalizedIds)
    localStorage.setItem(`${widgetPreferenceStorageKey(WIDGET_STORAGE_SCOPE)}:ids`, JSON.stringify(normalizedIds))
    syncUiPreferencesPatch({
      tablePreferences: {
        [HOME_WIDGET_PREFERENCE_KEY]: {
          selectedWidgetIds: normalizedIds,
        },
      },
    }).catch(() => undefined)
  }

  return (
    <main data-contract-route={homePageContract.route}>
      <WidgetModal
        open={widgetModalOpen}
        selectedWidgetIds={selectedWidgetIds}
        onClose={() => setWidgetModalOpen(false)}
        onSave={handleSaveWidgets}
      />

      <PageBanner
        mode="list"
        tourId="page-banner"
        title={birthday ? `Doğum Günün Kutlu Olsun, ${CURRENT_USER.first_name}!` : `Merhaba, ${CURRENT_USER.first_name}`}
        subtitle={birthday
          ? 'Bugün senin özel günün.'
          : `${duration.years} yıl ${duration.months} ay, ${duration.days} gündür bizimlesin. İyi ki varsın!`
        }
        icon={<Home size={24} />}
        onAddClick={CAN_CONFIGURE_HOME_WIDGETS ? () => setWidgetModalOpen(true) : undefined}
        addButtonText={HOME_DASHBOARD_CONTRACT.addWidgetActionLabel}
        addButtonTourId="quick-actions"
      />

      <ActionCenterSummaryCards />

      <div className="mt-6">
        {selectedWidgets.length > 0 ? (
          <DashboardGrid
            widgets={selectedWidgets}
            className="pb-6"
            draggable
            onOrderChange={(ids) => handleSaveWidgets(ids)}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <Settings size={48} className="mx-auto mb-4 opacity-50" />
            <p>{HOME_DASHBOARD_CONTRACT.emptyState.title}</p>
            <p className="mt-1 text-sm">{HOME_DASHBOARD_CONTRACT.emptyState.message}</p>
          </div>
        )}
      </div>
    </main>
  )
}

function buildHomeDashboardWidgets(
  currentUser: { first_name: string; last_name: string; sgk_entry_date: string; birth_date: string },
  duration: { years: number; months: number; days: number },
  birthday: boolean
): AnyDashboardWidgetConfig[] {
  return [
    {
      id: 'home-tenure',
      type: 'kpi',
      title: 'Çalışma Süresi',
      module: 'home',
      size: { w: 4, h: 2 },
      dataSource: 'dashboard.home.tenure',
      permissions: [],
      value: `${duration.years} yıl ${duration.months} ay`,
      label: `${currentUser.first_name} ${currentUser.last_name}`,
      subtitle: `${duration.days} gün`,
    },
    {
      id: 'home-birthday',
      type: 'kpi',
      title: 'Doğum Günü',
      module: 'home',
      size: { w: 4, h: 2 },
      dataSource: 'dashboard.home.birthday',
      permissions: [],
      value: birthday ? 'Bugün' : nextBirthdayText(currentUser.birth_date),
      label: birthday ? 'Kutlu olsun' : 'Sonraki doğum günü',
      subtitle: birthday ? 'Bugün özel bir gün.' : 'Takvim hatırlatıcısı',
    },
    {
      id: 'home-actions',
      type: 'actionList',
      title: 'Kısa Aksiyonlar',
      module: 'home',
      size: { w: 4, h: 2 },
      dataSource: 'dashboard.home.actions',
      permissions: [],
      items: [
        { id: 'open-employees', label: 'Çalışan kayıtlarını gözden geçir', description: 'İK / Çalışanlarımız', severity: 'info' },
        { id: 'dashboard-widgets', label: 'Ana sayfa widget seçimini güncelle', description: 'Mevcut widget kayıtları', severity: 'success' },
      ],
    },
  ]
}

function buildCompanyDashboardWidgets(): AnyDashboardWidgetConfig[] {
  return [
    {
      id: companyGeographicReachWidgetConfig.id,
      type: 'geographicTradeReach',
      title: companyGeographicReachWidgetConfig.title,
      description: 'Şirket bağlantılarının Türkiye ve dünya üzerindeki dağılımı',
      module: companyGeographicReachWidgetConfig.module,
      size: { w: 12, h: 6, minHeight: 560 },
      dataSource: 'dashboard.companies.geographicTradeReach',
      permissions: [],
    },
  ]
}

function buildRegisteredWidgetPlaceholder(id: string): AnyDashboardWidgetConfig | null {
  const record = dashboardWidgetRegistry.find(widget => widget.id === id)
  if (!record) return null
  return {
    id: record.id,
    type: 'actionList',
    title: record.title,
    module: record.moduleKey,
    size: { w: 4, h: 2 },
    dataSource: `registry.${record.id}`,
    permissions: [],
    items: [
      {
        id: `${record.id}-source`,
        label: `${record.moduleLabel} / ${record.pageLabel}`,
        description: record.description || record.pagePath,
        severity: 'info',
      },
    ],
  }
}

function toEmployeeDashboardRow(employees: Personel) {
  return {
    id: employees.id,
    gender: employees.gender,
    egitim_durumu: getEducationSummary(employees),
    work_type: (employees as any).work_type || '-',
    work_status: employees.work_status,
    employment_status: (employees as any).employment_status,
    unit_name: employees.unit?.name || '-',
    birth_date: employees.birth_date,
    sgk_entry_date: employees.sgk_entry_date,
  }
}

function normalizeSavedWidgetIds(ids: unknown[]) {
  const normalized = normalizeWidgetPreferenceIds(ids
    .map(id => String(id)), dashboardWidgetRegistry.map(widget => widget.id))
  return normalized
}

function calculateDuration(startDate: string) {
  const start = new Date(startDate)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const years = Math.floor(diffDays / 365)
  const months = Math.floor((diffDays % 365) / 30)
  const days = diffDays % 30
  return { years, months, days }
}

function isBirthday(birthDate?: string | null) {
  if (!birthDate) return false
  const today = new Date()
  const birth = new Date(birthDate)
  return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate()
}

function nextBirthdayText(birthDate?: string | null) {
  if (!birthDate) return '-'
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return '-'
  const today = new Date()
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1)
  }
  return next.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })
}
