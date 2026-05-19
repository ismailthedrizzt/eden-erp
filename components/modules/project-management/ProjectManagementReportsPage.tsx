'use client'

import { BarChart3, CheckCircle2, Clock, Timer, AlertTriangle } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import {
  PROJECT_MANAGEMENT_MODULE_KEY,
  formatDuration,
  isTaskOpen,
  isTaskOverdue,
  priorityLabels,
  projectStatusLabels,
  taskStatusLabels,
} from '@/lib/modules/project-management/projectManagement.config'
import { PROJECT_MANAGEMENT_PERMISSIONS } from '@/lib/modules/project-management/projectManagement.permissions'
import {
  projectManagementProjectsMock,
  projectManagementTasksMock,
  projectManagementTimeLogsMock,
} from '@/lib/modules/project-management/projectManagement.mock'
import { usePermissions } from '@/lib/security/permissionStore'

export function ProjectManagementReportsPage() {
  const permissions = usePermissions()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const canManage = permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.manageAll)
  const canView = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.viewReports) || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.view)
  const moduleAvailable = isModuleActive(PROJECT_MANAGEMENT_MODULE_KEY) && isSubmoduleActive(PROJECT_MANAGEMENT_MODULE_KEY, 'raporlar')
  const openTasks = projectManagementTasksMock.filter(isTaskOpen)
  const overdueTasks = openTasks.filter(task => isTaskOverdue(task))
  const criticalTasks = openTasks.filter(task => ['kritik', 'acil'].includes(task.priority))
  const activeProjects = projectManagementProjectsMock.filter(project => ['planlandi', 'devam_ediyor', 'riskli', 'beklemede'].includes(project.status))
  const riskProjects = activeProjects.filter(project => project.status === 'riskli' || project.overdue_task_count > 0)
  const completedTasks = projectManagementTasksMock.filter(task => task.status === 'tamamlandi')
  const totalMinutes = projectManagementTimeLogsMock.reduce((sum, log) => sum + log.duration_minutes, 0)
  const billableMinutes = projectManagementTimeLogsMock.filter(log => log.is_billable).reduce((sum, log) => sum + log.duration_minutes, 0)

  if (!moduleAvailable || !canView) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Raporlar"
          subtitle={!moduleAvailable ? 'Modül lisansı pasif olduğu için sayfa kullanılamıyor.' : 'Bu sayfayı görüntülemek için yetki gerekiyor.'}
          icon={<BarChart3 size={24} />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageBanner
        mode="list"
        title="Raporlar"
        subtitle="Görev, proje, ekip, müşteri ve zaman performansını izleyin."
        icon={<BarChart3 size={24} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard label="Toplam açık görev" value={openTasks.length} icon={<CheckCircle2 size={20} />} tone="blue" />
        <ReportCard label="Geciken görevler" value={overdueTasks.length} icon={<AlertTriangle size={20} />} tone={overdueTasks.length > 0 ? 'red' : 'emerald'} />
        <ReportCard label="Kritik görevler" value={criticalTasks.length} icon={<AlertTriangle size={20} />} tone={criticalTasks.length > 0 ? 'amber' : 'emerald'} />
        <ReportCard label="Devam eden projeler" value={activeProjects.length} icon={<Clock size={20} />} tone="blue" />
        <ReportCard label="Riskli projeler" value={riskProjects.length} icon={<AlertTriangle size={20} />} tone={riskProjects.length > 0 ? 'amber' : 'emerald'} />
        <ReportCard label="Tamamlanan görevler" value={completedTasks.length} icon={<CheckCircle2 size={20} />} tone="emerald" />
        <ReportCard label="Harcanan süre" value={formatDuration(totalMinutes)} icon={<Timer size={20} />} tone="blue" />
        <ReportCard label="Faturalandırılabilir süre" value={formatDuration(billableMinutes)} icon={<Timer size={20} />} tone="emerald" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DistributionPanel
          title="Duruma göre görev dağılımı"
          items={Object.entries(taskStatusLabels).map(([status, label]) => ({
            label,
            value: projectManagementTasksMock.filter(task => task.status === status).length,
          }))}
        />
        <DistributionPanel
          title="Önceliğe göre görev dağılımı"
          items={Object.entries(priorityLabels).map(([priority, label]) => ({
            label,
            value: projectManagementTasksMock.filter(task => task.priority === priority).length,
          }))}
        />
        <DistributionPanel
          title="Sorumlu kişiye göre açık görevler"
          items={groupBy(openTasks.map(task => task.assignee_name || 'Atanmamış'))}
        />
        <DistributionPanel
          title="Proje bazlı tamamlanma oranı"
          items={projectManagementProjectsMock.map(project => ({
            label: project.name,
            value: project.completion_rate,
            suffix: '%',
          }))}
          maxValue={100}
        />
        <DistributionPanel
          title="Proje durumları"
          items={Object.entries(projectStatusLabels).map(([status, label]) => ({
            label,
            value: projectManagementProjectsMock.filter(project => project.status === status).length,
          }))}
        />
        <DistributionPanel
          title="Haftalık tamamlanan görev trendi"
          items={[
            { label: '13 May', value: 0 },
            { label: '14 May', value: 1 },
            { label: '15 May', value: 0 },
            { label: '16 May', value: 1 },
            { label: '17 May', value: 0 },
            { label: '18 May', value: 0 },
            { label: '19 May', value: completedTasks.length },
          ]}
        />
      </div>
    </div>
  )
}

function ReportCard({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: 'blue' | 'emerald' | 'amber' | 'red' }) {
  return (
    <div className={`rounded-lg border p-4 ${toneClass(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium opacity-75">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
        </div>
        {icon}
      </div>
    </div>
  )
}

function DistributionPanel({
  title,
  items,
  maxValue,
}: {
  title: string
  items: Array<{ label: string; value: number; suffix?: string }>
  maxValue?: number
}) {
  const max = maxValue ?? Math.max(1, ...items.map(item => item.value))
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.filter(item => item.value > 0 || maxValue).map(item => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{item.value}{item.suffix || ''}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-full rounded-full bg-eden-blue" style={{ width: `${Math.max(4, Math.min(100, (item.value / max) * 100))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function groupBy(values: string[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts).map(([label, value]) => ({ label, value }))
}

function toneClass(tone: 'blue' | 'emerald' | 'amber' | 'red') {
  if (tone === 'red') return 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
  if (tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
  if (tone === 'emerald') return 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
  return 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300'
}
