'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, CircleDot } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { formControlClass } from '@/components/ui/formControlStyles'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import {
  PROJECT_MANAGEMENT_MODULE_KEY,
  formatProjectManagementDate,
  priorityLabels,
} from '@/lib/modules/project-management/projectManagement.config'
import { PROJECT_MANAGEMENT_PERMISSIONS } from '@/lib/modules/project-management/projectManagement.permissions'
import { getProjectManagementCalendarEvents } from '@/lib/modules/project-management/projectManagement.mock'
import { usePermissions } from '@/lib/security/permissionStore'
import type { ProjectManagementCalendarEvent } from '@/lib/modules/project-management/projectManagement.types'

type CalendarView = 'gunluk' | 'haftalik' | 'aylik' | 'liste'

const viewLabels: Record<CalendarView, string> = {
  gunluk: 'Günlük',
  haftalik: 'Haftalık',
  aylik: 'Aylık',
  liste: 'Liste',
}

const kindLabels: Record<ProjectManagementCalendarEvent['kind'], string> = {
  task_due: 'Görev son tarihi',
  project_start: 'Proje başlangıcı',
  project_end: 'Proje bitişi',
  sprint_start: 'Sprint başlangıcı',
  sprint_end: 'Sprint bitişi',
  service: 'Servis randevusu',
  license: 'Lisans yenileme',
  warranty: 'Garanti bitişi',
  meeting_action: 'Toplantı aksiyonu',
}

export function ProjectManagementCalendarPage() {
  const permissions = usePermissions()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const [view, setView] = useState<CalendarView>('aylik')
  const [projectFilter, setProjectFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const canManage = permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.admin)
  const canView = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.projectsView)
  const moduleAvailable = isModuleActive(PROJECT_MANAGEMENT_MODULE_KEY) && isSubmoduleActive(PROJECT_MANAGEMENT_MODULE_KEY, 'takvim')
  const events = getProjectManagementCalendarEvents()
  const projects = Array.from(new Set(events.map(event => event.project_name).filter(Boolean))) as string[]
  const assignees = Array.from(new Set(events.map(event => event.assignee_name).filter(Boolean))) as string[]
  const filteredEvents = useMemo(() => events
    .filter(event => !projectFilter || event.project_name === projectFilter)
    .filter(event => !assigneeFilter || event.assignee_name === assigneeFilter)
    .filter(event => !priorityFilter || event.priority === priorityFilter),
  [assigneeFilter, events, priorityFilter, projectFilter])
  const visibleEvents = filterByView(filteredEvents, view)

  if (!moduleAvailable || !canView) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Takvim"
          subtitle={!moduleAvailable ? 'Modül lisansı pasif olduğu için sayfa kullanılamıyor.' : 'Bu sayfayı görüntülemek için yetki gerekiyor.'}
          icon={<CalendarDays size={24} />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageBanner
        mode="list"
        title="Takvim"
        subtitle="Görev son tarihlerini, proje kilometre taşlarını ve çalışma dönemi tarihlerini takvim üzerinde görün."
        icon={<CalendarDays size={24} />}
      />

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-[auto_1fr_1fr_1fr]">
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950/40">
          {(Object.keys(viewLabels) as CalendarView[]).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === item ? 'bg-white text-eden-blue shadow-sm dark:bg-gray-900' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
            >
              {viewLabels[item]}
            </button>
          ))}
        </div>
        <select value={projectFilter} onChange={event => setProjectFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm projeler</option>
          {projects.map(project => <option key={project} value={project}>{project}</option>)}
        </select>
        <select value={assigneeFilter} onChange={event => setAssigneeFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm sorumlular</option>
          {assignees.map(assignee => <option key={assignee} value={assignee}>{assignee}</option>)}
        </select>
        <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm öncelikler</option>
          {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {view === 'aylik' ? (
        <MonthGrid events={filteredEvents} />
      ) : (
        <EventList events={visibleEvents} />
      )}
    </div>
  )
}

function MonthGrid({ events }: { events: ProjectManagementCalendarEvent[] }) {
  const year = 2026
  const month = 4
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: 42 }).map((_, index) => {
    const day = index - startOffset + 1
    return day > 0 && day <= daysInMonth ? day : null
  })

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Mayıs 2026</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{events.length} kayıt</span>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 dark:border-gray-800 dark:bg-gray-800">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
          <div key={day} className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-500 dark:bg-gray-950/60 dark:text-gray-400">{day}</div>
        ))}
        {cells.map((day, index) => {
          const date = day ? `2026-05-${String(day).padStart(2, '0')}` : ''
          const dayEvents = day ? events.filter(event => event.date === date) : []
          return (
            <div key={`${day || 'empty'}-${index}`} className="min-h-28 bg-white p-2 dark:bg-gray-900">
              {day && <div className={`mb-2 text-xs font-semibold ${date === '2026-05-19' ? 'text-eden-blue' : 'text-gray-500 dark:text-gray-400'}`}>{day}</div>}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div key={event.id} title={event.title} className={`truncate rounded px-2 py-1 text-[11px] font-medium ${eventTone(event)}`}>
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <div className="text-[11px] text-gray-400">+{dayEvents.length - 3} kayıt</div>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EventList({ events }: { events: ProjectManagementCalendarEvent[] }) {
  return (
    <div className="space-y-2">
      {events.map(event => (
        <article key={event.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <CircleDot size={13} />
                {kindLabels[event.kind]} · {formatProjectManagementDate(event.date)}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{event.title}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {[event.project_name, event.customer_display_name, event.assignee_name].filter(Boolean).join(' · ') || '-'}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${eventTone(event)}`}>
              {event.priority ? priorityLabels[event.priority] : event.status || 'Plan'}
            </span>
          </div>
        </article>
      ))}
      {events.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Bu görünüm için takvim kaydı bulunamadı.
        </div>
      )}
    </div>
  )
}

function filterByView(events: ProjectManagementCalendarEvent[], view: CalendarView) {
  if (view === 'liste' || view === 'aylik') return events
  if (view === 'gunluk') return events.filter(event => event.date === '2026-05-19')
  return events.filter(event => event.date >= '2026-05-19' && event.date <= '2026-05-25')
}

function eventTone(event: ProjectManagementCalendarEvent) {
  if (event.priority === 'acil' || event.priority === 'kritik') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
  if (event.priority === 'yuksek' || event.kind === 'project_end' || event.kind === 'sprint_end') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  if (event.kind === 'project_start' || event.kind === 'sprint_start') return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
}
