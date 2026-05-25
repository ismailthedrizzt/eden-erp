'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CheckSquare, ListTodo, MoveRight } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { formControlClass } from '@/components/ui/formControlStyles'
import { SmartDataTable, type ColumnDef } from '@/components/ui/SmartDataTable'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import {
  PROJECT_MANAGEMENT_MODULE_KEY,
  decorateTask,
  isTaskOpen,
  priorityLabels,
  taskStatusLabels,
  taskTypeLabels,
} from '@/lib/modules/project-management/projectManagement.config'
import { PROJECT_MANAGEMENT_PERMISSIONS } from '@/lib/modules/project-management/projectManagement.permissions'
import { projectManagementProjectsMock, projectManagementSprintsMock, projectManagementTasksMock } from '@/lib/modules/project-management/projectManagement.mock'
import { usePermissions } from '@/lib/security/permissionStore'
import type { ProjectManagementTask, ProjectManagementTaskStatus } from '@/lib/modules/project-management/projectManagement.types'

const backlogColumns: ColumnDef[] = [
  { key: 'select', label: 'Seç', type: 'text', width: 70, sortable: false, render: (_, row) => row.selectionControl },
  { key: 'task_no', label: 'Görev No', type: 'text', width: 130, sortable: true, filterable: true },
  { key: 'title', label: 'Başlık', type: 'text', width: 260, sortable: true, filterable: true },
  { key: 'task_type_label', label: 'Görev Tipi', type: 'badge', width: 150, sortable: true, filterable: true },
  { key: 'priority_label', label: 'Öncelik', type: 'badge', width: 120, sortable: true, filterable: true },
  { key: 'project_name', label: 'Proje', type: 'text', width: 210, sortable: true, filterable: true },
  { key: 'assignee_name', label: 'Sorumlu', type: 'text', width: 150, sortable: true, filterable: true },
  { key: 'estimated_hours', label: 'Tahmini Süre', type: 'number', width: 130, sortable: true },
  { key: 'created_at_display', label: 'Oluşturulma', type: 'text', width: 130, sortable: true },
  { key: 'order_actions', label: 'Sıra', type: 'text', width: 120, sortable: false, render: (_, row) => row.orderControls },
]

export function ProjectManagementBacklogPage() {
  const permissions = usePermissions()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const [tasks, setTasks] = useState<ProjectManagementTask[]>(() => projectManagementTasksMock)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [projectFilter, setProjectFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [targetSprintId, setTargetSprintId] = useState(projectManagementSprintsMock.find(sprint => sprint.status === 'aktif')?.id || '')
  const [bulkStatus, setBulkStatus] = useState<ProjectManagementTaskStatus>('yapilacak')
  const [bulkAssignee, setBulkAssignee] = useState('')
  const canManage = permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.manageAll)
  const canEdit = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.editTask) || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.assignTask)
  const canView = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.view)
  const moduleAvailable = isModuleActive(PROJECT_MANAGEMENT_MODULE_KEY) && isSubmoduleActive(PROJECT_MANAGEMENT_MODULE_KEY, 'backlog')

  const backlogTasks = useMemo(() => tasks
    .filter(task => !task.sprint_id && isTaskOpen(task))
    .filter(task => !projectFilter || task.project_id === projectFilter)
    .filter(task => !priorityFilter || task.priority === priorityFilter)
    .sort((a, b) => Number(a.backlog_order || 999) - Number(b.backlog_order || 999)),
  [priorityFilter, projectFilter, tasks])

  const assignees = Array.from(new Set(tasks.map(task => task.assignee_name).filter(Boolean))) as string[]
  const selectedCount = selectedIds.size
  const rows = backlogTasks.map(task => ({
    ...decorateTask(task),
    selectionControl: (
      <input
        type="checkbox"
        checked={selectedIds.has(task.id)}
        onClick={event => event.stopPropagation()}
        onChange={() => toggleSelect(task.id)}
        className="h-4 w-4 rounded border-gray-300 text-eden-blue"
      />
    ),
    orderControls: (
      <div className="flex justify-center gap-1">
        <button type="button" onClick={event => { event.stopPropagation(); moveTask(task.id, 'up') }} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800" title="Yukarı taşı">
          <ArrowUp size={14} />
        </button>
        <button type="button" onClick={event => { event.stopPropagation(); moveTask(task.id, 'down') }} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800" title="Aşağı taşı">
          <ArrowDown size={14} />
        </button>
      </div>
    ),
  }))

  function toggleSelect(taskId: string) {
    setSelectedIds(current => {
      const next = new Set(current)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }

  function moveTask(taskId: string, direction: 'up' | 'down') {
    if (!canEdit) return
    const ordered = [...backlogTasks]
    const index = ordered.findIndex(task => task.id === taskId)
    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return
    const current = ordered[index]
    const next = ordered[nextIndex]
    setTasks(all => all.map(task => {
      if (task.id === current.id) return { ...task, backlog_order: next.backlog_order ?? nextIndex + 1 }
      if (task.id === next.id) return { ...task, backlog_order: current.backlog_order ?? index + 1 }
      return task
    }))
  }

  function applyBulkStatus() {
    if (!canEdit || selectedIds.size === 0) return
    setTasks(current => current.map(task => selectedIds.has(task.id) ? { ...task, status: bulkStatus, updated_at: new Date().toISOString() } : task))
  }

  function applyBulkAssignee() {
    if (!canEdit || selectedIds.size === 0 || !bulkAssignee.trim()) return
    setTasks(current => current.map(task => selectedIds.has(task.id) ? { ...task, assignee_name: bulkAssignee.trim(), updated_at: new Date().toISOString() } : task))
  }

  function moveSelectedToSprint() {
    if (!canEdit || selectedIds.size === 0 || !targetSprintId) return
    const sprint = projectManagementSprintsMock.find(item => item.id === targetSprintId)
    setTasks(current => current.map(task => selectedIds.has(task.id)
      ? {
          ...task,
          sprint_id: targetSprintId,
          sprint_name: sprint?.name || null,
          backlog_order: null,
          status: task.status === 'yeni' ? 'yapilacak' : task.status,
          updated_at: new Date().toISOString(),
        }
      : task,
    ))
    setSelectedIds(new Set())
  }

  if (!moduleAvailable || !canView) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Backlog"
          subtitle={!moduleAvailable ? 'Modül lisansı pasif olduğu için sayfa kullanılamıyor.' : 'Bu sayfayı görüntülemek için yetki gerekiyor.'}
          icon={<ListTodo size={24} />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageBanner
        mode="list"
        title="Backlog"
        subtitle="Henüz sprint veya aktif plana alınmamış görevleri önceliklendirin."
        icon={<ListTodo size={24} />}
      />

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-3">
        <select value={projectFilter} onChange={event => setProjectFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm projeler</option>
          {projectManagementProjectsMock.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm öncelikler</option>
          {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
          {backlogTasks.length} backlog görevi · {selectedCount} seçili
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <select value={bulkStatus} onChange={event => setBulkStatus(event.target.value as ProjectManagementTaskStatus)} className={formControlClass()} disabled={!canEdit || selectedCount === 0}>
            {Object.entries(taskStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={bulkAssignee} onChange={event => setBulkAssignee(event.target.value)} className={formControlClass()} disabled={!canEdit || selectedCount === 0}>
            <option value="">Sorumlu seç</option>
            {assignees.map(assignee => <option key={assignee} value={assignee}>{assignee}</option>)}
          </select>
          <select value={targetSprintId} onChange={event => setTargetSprintId(event.target.value)} className={formControlClass()} disabled={!canEdit || selectedCount === 0}>
            <option value="">Sprint seç</option>
            {projectManagementSprintsMock.filter(sprint => sprint.status !== 'tamamlandi').map(sprint => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={applyBulkStatus} disabled={!canEdit || selectedCount === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <CheckSquare size={16} />
              Durum
            </button>
            <button type="button" onClick={applyBulkAssignee} disabled={!canEdit || selectedCount === 0 || !bulkAssignee} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">
              Sorumlu
            </button>
            <button type="button" onClick={moveSelectedToSprint} disabled={!canEdit || selectedCount === 0 || !targetSprintId} className="inline-flex items-center gap-2 rounded-lg bg-eden-blue px-3 py-2 text-sm font-semibold text-white hover:bg-eden-blue-dk disabled:opacity-50">
              {"Sprint'e al"}
              <MoveRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <SmartDataTable
        columns={backlogColumns}
        data={rows as any[]}
        loading={false}
        defaultView="list"
        storageKey="project-management-backlog"
        emptyText="Backlog kaydı bulunamadı"
      />
    </div>
  )
}
