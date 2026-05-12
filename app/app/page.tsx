'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Home, Settings, SlidersHorizontal } from 'lucide-react'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'
import type { AnyDashboardWidgetConfig } from '@/components/dashboard/dashboard.types'
import { PageBanner } from '@/components/ui/PageBanner'
import { usePersonel } from '@/hooks/usePersonel'
import {
  dashboardWidgetRegistry,
  legacyHomeWidgetIdMap,
  uniqueWidgetModules,
  uniqueWidgetPages,
  type DashboardWidgetRegistryRecord,
} from '@/lib/dashboard/widgetRegistry'
import { buildEmployeesDashboard } from '@/lib/modules/employees/dashboard/employeesDashboard.mock'
import { getEducationSummary } from '@/lib/modules/employees/education'
import type { Personel } from '@/types'

const WIDGET_STORAGE_KEY = 'user_widgets'
const CURRENT_USER = {
  ad: 'İsmail',
  soyad: 'ILGAR',
  sgk_giris: '2024-01-15',
  dogum_tarihi: '1990-04-27',
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
  const { data: personel } = usePersonel()

  useEffect(() => {
    const saved = localStorage.getItem(WIDGET_STORAGE_KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        setSelectedWidgetIds(normalizeSavedWidgetIds(parsed))
      }
    } catch {
      setSelectedWidgetIds([])
    }
  }, [])

  const duration = useMemo(() => calculateDuration(CURRENT_USER.sgk_giris), [])
  const birthday = isBirthday(CURRENT_USER.dogum_tarihi)
  const employeeRows = useMemo(() => (personel || []).map(toEmployeeDashboardRow), [personel])
  const availableWidgets = useMemo(() => {
    const homeWidgets = buildHomeDashboardWidgets(CURRENT_USER, duration, birthday)
    const employeeWidgets = buildEmployeesDashboard(employeeRows).map(widget => ({
      ...widget,
      permissions: [],
    }))
    return new Map([...homeWidgets, ...employeeWidgets].map(widget => [widget.id, widget]))
  }, [birthday, duration, employeeRows])

  const selectedWidgets = selectedWidgetIds
    .map(id => availableWidgets.get(id))
    .filter((widget): widget is AnyDashboardWidgetConfig => Boolean(widget))

  const handleSaveWidgets = (ids: string[]) => {
    const normalizedIds = normalizeSavedWidgetIds(ids)
    setSelectedWidgetIds(normalizedIds)
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(normalizedIds))
  }

  return (
    <>
      <WidgetModal
        open={widgetModalOpen}
        selectedWidgetIds={selectedWidgetIds}
        onClose={() => setWidgetModalOpen(false)}
        onSave={handleSaveWidgets}
      />

      <PageBanner
        mode="list"
        title={birthday ? `Doğum Günün Kutlu Olsun, ${CURRENT_USER.ad}!` : `Merhaba, ${CURRENT_USER.ad}`}
        subtitle={birthday
          ? 'Bugün senin özel günün.'
          : `${duration.years} yıl ${duration.months} ay, ${duration.days} gündür bizimlesin. İyi ki varsın!`
        }
        icon={<Home size={24} />}
        onAddClick={() => setWidgetModalOpen(true)}
        addButtonText="Widget Ekle"
      />

      <div className="mt-6">
        {selectedWidgets.length > 0 ? (
          <DashboardGrid widgets={selectedWidgets} className="pb-6" />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <Settings size={48} className="mx-auto mb-4 opacity-50" />
            <p>Henüz widget eklenmemiş</p>
            <p className="mt-1 text-sm">&quot;Widget Ekle&quot; butonuyla mevcut widget kayıtlarını ana sayfaya ekleyebilirsiniz.</p>
          </div>
        )}
      </div>
    </>
  )
}

function buildHomeDashboardWidgets(
  currentUser: { ad: string; soyad: string; sgk_giris: string; dogum_tarihi: string },
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
      label: `${currentUser.ad} ${currentUser.soyad}`,
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
      value: birthday ? 'Bugün' : nextBirthdayText(currentUser.dogum_tarihi),
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
        { id: 'open-personel', label: 'Çalışan kayıtlarını gözden geçir', description: 'İK / Çalışanlarımız', severity: 'info' },
        { id: 'dashboard-widgets', label: 'Ana sayfa widget seçimini güncelle', description: 'Mevcut widget kayıtları', severity: 'success' },
      ],
    },
  ]
}

function toEmployeeDashboardRow(personel: Personel) {
  return {
    id: personel.id,
    cinsiyet: personel.cinsiyet,
    egitim_durumu: getEducationSummary(personel),
    calisma_tipi: (personel as any).calisma_tipi || '-',
    calisma_durumu: personel.calisma_durumu,
    employment_status: (personel as any).employment_status,
    birim_adi: personel.birim?.ad || '-',
    dogum_tarihi: personel.dogum_tarihi,
    sgk_giris: personel.sgk_giris,
  }
}

function normalizeSavedWidgetIds(ids: unknown[]) {
  const validIds = new Set(dashboardWidgetRegistry.map(widget => widget.id))
  const normalized = ids
    .map(id => String(id))
    .map(id => legacyHomeWidgetIdMap[id] || id)
    .filter(id => validIds.has(id))
  return Array.from(new Set(normalized))
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
