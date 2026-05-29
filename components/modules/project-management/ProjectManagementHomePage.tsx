'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Columns3,
  FolderOpen,
  GitBranch,
  ListChecks,
  ListTodo,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import {
  PROJECT_MANAGEMENT_MODULE_KEY,
  formatProjectManagementDate,
  isTaskDueToday,
  isTaskOpen,
  isTaskOverdue,
  projectManagementAreaByKey,
} from '@/lib/modules/project-management/projectManagement.config'
import { PROJECT_MANAGEMENT_PERMISSIONS } from '@/lib/modules/project-management/projectManagement.permissions'
import {
  getProjectManagementDashboardSummaries,
  projectManagementProjectsMock,
  projectManagementTasksMock,
} from '@/lib/modules/project-management/projectManagement.mock'
import { usePermissions } from '@/lib/security/permissionStore'
import type { ProjectManagementAreaKey } from '@/lib/modules/project-management/projectManagement.types'

const AREA_ICON = {
  gorevler: CheckCircle2,
  projeler: FolderOpen,
  'kanban-board': Columns3,
  backlog: ListTodo,
  sprintler: ListChecks,
  takvim: CalendarDays,
  'zaman-takibi': Timer,
  'is-akislari': GitBranch,
  raporlar: BarChart3,
} satisfies Record<ProjectManagementAreaKey, LucideIcon>

export function ProjectManagementHomePage() {
  const permissions = usePermissions()
  const { isModuleActive } = useModuleLicense()
  const canView = permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.projectsView) || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.admin)
  const moduleAvailable = isModuleActive(PROJECT_MANAGEMENT_MODULE_KEY)
  const summaries = getProjectManagementDashboardSummaries()
  const openTasks = projectManagementTasksMock.filter(isTaskOpen)
  const overdueTasks = openTasks.filter(task => isTaskOverdue(task))
  const dueTodayTasks = openTasks.filter(task => isTaskDueToday(task))
  const criticalTasks = openTasks.filter(task => ['kritik', 'acil'].includes(task.priority))
  const activeProjects = projectManagementProjectsMock.filter(project => ['planlandi', 'devam_ediyor', 'riskli', 'beklemede'].includes(project.status))
  const riskProjects = activeProjects.filter(project => project.status === 'riskli' || project.overdue_task_count > 0)
  const completedThisWeek = projectManagementTasksMock.filter(task => task.completed_at && task.completed_at >= '2026-05-13').length
  const assignedToMe = openTasks.filter(task => task.assignee_name === 'İsmail ILGAR' || task.reporter_name === 'İsmail ILGAR')
  const visibleCards = summaries.filter(summary => summary.area.key !== 'is-akislari')

  if (!moduleAvailable) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Görev ve Proje Yönetimi"
          subtitle="Modül lisansı pasif olduğu için sayfa kullanılamıyor."
          icon={<ListChecks size={24} />}
        />
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Bu modül sistem ayarlarından aktif edildiğinde iş takip merkezi kullanılabilir.
        </div>
      </div>
    )
  }

  if (!canView) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Görev ve Proje Yönetimi"
          subtitle="Bu modülü görüntülemek için yetki gerekiyor."
          icon={<ListChecks size={24} />}
        />
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Gerekli izin: {PROJECT_MANAGEMENT_PERMISSIONS.projectsView}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Görev ve Proje Yönetimi"
        subtitle="Şirket içi işleri, müşteri projelerini, ekip görevlerini, teslim tarihlerini, sorumlulukları ve iş akışlarını tek merkezden takip eder."
        icon={<ListChecks size={24} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryWidget label="Açık görevler" value={openTasks.length} tone="blue" />
        <SummaryWidget label="Bugün bitmesi gereken" value={dueTodayTasks.length} tone={dueTodayTasks.length > 0 ? 'amber' : 'emerald'} />
        <SummaryWidget label="Geciken görevler" value={overdueTasks.length} tone={overdueTasks.length > 0 ? 'red' : 'emerald'} />
        <SummaryWidget label="Kritik görevler" value={criticalTasks.length} tone={criticalTasks.length > 0 ? 'red' : 'emerald'} />
        <SummaryWidget label="Devam eden projeler" value={activeProjects.length} tone="blue" />
        <SummaryWidget label="Riskli projeler" value={riskProjects.length} tone={riskProjects.length > 0 ? 'amber' : 'emerald'} />
        <SummaryWidget label="Bu hafta tamamlanan" value={completedThisWeek} tone="emerald" />
        <SummaryWidget label="Bana atanmış işler" value={assignedToMe.length} tone="blue" />
      </div>

      {(overdueTasks.length > 0 || riskProjects.length > 0) && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-700 dark:text-amber-300" size={20} />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Öncelikli uyarılar</h2>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {overdueTasks.slice(0, 3).map(task => (
                  <WarningRow
                    key={task.id}
                    title={task.title}
                    description={`${task.task_no} · ${task.assignee_name || '-'} · ${formatProjectManagementDate(task.due_date)}`}
                    badge="Gecikti"
                  />
                ))}
                {riskProjects.slice(0, 3).map(project => (
                  <WarningRow
                    key={project.id}
                    title={project.name}
                    description={`${project.code} · ${project.project_manager_name || '-'} · ${project.overdue_task_count} geciken görev`}
                    badge="Riskli"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleCards.map(summary => {
          const Icon = AREA_ICON[summary.area.key]
          return (
            <Link
              key={summary.area.key}
              href={summary.area.href}
              className="group rounded-lg border border-gray-200 bg-white p-5 transition hover:border-eden-blue hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-eden-blue"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-eden-blue dark:bg-blue-950/40 dark:text-blue-300">
                    <Icon size={21} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{summary.area.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{summary.area.description}</p>
                  </div>
                </div>
                <ArrowRight className="mt-1 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-eden-blue" size={20} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Metric label="Toplam" value={summary.totalCount} tone="blue" />
                <Metric label="Açık" value={summary.openCount} tone="emerald" />
                <Metric label="Uyarı" value={summary.warningCount} tone={summary.warningCount > 0 ? 'amber' : 'emerald'} />
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-eden-blue px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-eden-blue-dk">
                Aç
                <ArrowRight size={15} />
              </div>
            </Link>
          )
        })}
      </div>

      <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
        <div className="font-semibold">Eden ERP iş takip ilkesi</div>
        <p className="mt-1 leading-6">
          JIRA’dan ilham alan proje, backlog, sprint, board ve workflow mantığı korunur; her görev şirket, müşteri, satış, servis, ürün, lisans, garanti, doküman veya personel kaydına bağlanabilecek ERP iş merkezi olarak tasarlanır.
        </p>
        <Link
          href={projectManagementAreaByKey['is-akislari'].href}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-200 dark:hover:bg-blue-950/40"
        >
          Workflow ayarları
          <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  )
}

function SummaryWidget({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'emerald' | 'amber' | 'red' }) {
  const toneClass = getToneClass(tone)
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="text-xs font-medium opacity-75">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'emerald' | 'amber' | 'red' }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${getToneClass(tone)}`}>
      <div className="text-xs font-medium opacity-75">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  )
}

function WarningRow({ title, description, badge }: { title: string; description: string; badge: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-white px-3 py-2 dark:border-amber-900/60 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{title}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</div>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          {badge}
        </span>
      </div>
    </div>
  )
}

function getToneClass(tone: 'blue' | 'emerald' | 'amber' | 'red') {
  if (tone === 'red') return 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
  if (tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
  if (tone === 'emerald') return 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
  return 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300'
}
