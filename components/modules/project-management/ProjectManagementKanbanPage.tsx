'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Columns3,
  MessageSquare,
  Paperclip,
  SquareStack,
} from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { formControlClass } from '@/components/ui/formControlStyles'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import {
  PROJECT_MANAGEMENT_MODULE_KEY,
  formatProjectManagementDate,
  getTaskHealth,
  priorityLabels,
  taskStatusLabels,
  taskTypeLabels,
  taskWorkflowColumns,
} from '@/lib/modules/project-management/projectManagement.config'
import { PROJECT_MANAGEMENT_PERMISSIONS } from '@/lib/modules/project-management/projectManagement.permissions'
import { projectManagementProjectsMock, projectManagementTasksMock } from '@/lib/modules/project-management/projectManagement.mock'
import { usePermissions } from '@/lib/security/permissionStore'
import type { ProjectManagementPriority, ProjectManagementTask, ProjectManagementTaskStatus, ProjectManagementTaskType } from '@/lib/modules/project-management/projectManagement.types'

export function ProjectManagementKanbanPage() {
  const permissions = usePermissions()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const [tasks, setTasks] = useState<ProjectManagementTask[]>(projectManagementTasksMock)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [projectFilter, setProjectFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [taskTypeFilter, setTaskTypeFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const canManage = permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.manageAll)
  const canMove = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.editTask) || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.manageBoards)
  const canView = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.view)
  const moduleAvailable = isModuleActive(PROJECT_MANAGEMENT_MODULE_KEY) && isSubmoduleActive(PROJECT_MANAGEMENT_MODULE_KEY, 'kanban-board')

  const filteredTasks = useMemo(() => tasks
    .filter(task => !task.is_deleted)
    .filter(task => !projectFilter || task.project_id === projectFilter)
    .filter(task => !assigneeFilter || task.assignee_name === assigneeFilter)
    .filter(task => !priorityFilter || task.priority === priorityFilter)
    .filter(task => !taskTypeFilter || task.task_type === taskTypeFilter)
    .filter(task => !tagFilter || task.tags.includes(tagFilter))
    .sort((a, b) => Number(a.board_order || 999) - Number(b.board_order || 999)),
  [assigneeFilter, priorityFilter, projectFilter, tagFilter, taskTypeFilter, tasks])

  const assignees = Array.from(new Set(tasks.map(task => task.assignee_name).filter(Boolean))) as string[]
  const tags = Array.from(new Set(tasks.flatMap(task => task.tags))).sort()

  function moveTask(taskId: string, status: ProjectManagementTaskStatus) {
    if (!canMove) return
    setTasks(current => current.map(task => task.id === taskId
      ? {
          ...task,
          status,
          updated_at: new Date().toISOString(),
          history: [
            ...(task.history || []),
            {
              id: `history-${Date.now()}`,
              task_id: task.id,
              event_type: 'status_changed',
              from_value: taskStatusLabels[task.status],
              to_value: taskStatusLabels[status],
              actor_name: 'İsmail ILGAR',
              note: `${taskStatusLabels[task.status]} -> ${taskStatusLabels[status]}`,
              created_at: new Date().toISOString(),
            },
          ],
        }
      : task,
    ))
  }

  if (!moduleAvailable || !canView) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Kanban Board"
          subtitle={!moduleAvailable ? 'Modül lisansı pasif olduğu için sayfa kullanılamıyor.' : 'Bu sayfayı görüntülemek için yetki gerekiyor.'}
          icon={<Columns3 size={24} />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageBanner
        mode="list"
        title="Kanban Board"
        subtitle="Görevleri durumlarına göre görsel kolonlar halinde yönetin."
        icon={<Columns3 size={24} />}
      />

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2 xl:grid-cols-5">
        <select value={projectFilter} onChange={event => setProjectFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm projeler</option>
          {projectManagementProjectsMock.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select value={assigneeFilter} onChange={event => setAssigneeFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm sorumlular</option>
          {assignees.map(assignee => <option key={assignee} value={assignee}>{assignee}</option>)}
        </select>
        <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm öncelikler</option>
          {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={taskTypeFilter} onChange={event => setTaskTypeFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm görev tipleri</option>
          {Object.entries(taskTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={tagFilter} onChange={event => setTagFilter(event.target.value)} className={formControlClass()}>
          <option value="">Tüm etiketler</option>
          {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
        </select>
      </div>

      {!canMove && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          Durum değiştirmek için {PROJECT_MANAGEMENT_PERMISSIONS.editTask} veya {PROJECT_MANAGEMENT_PERMISSIONS.manageBoards} izni gerekir.
        </div>
      )}

      <div className="grid min-h-[620px] gap-4 overflow-x-auto pb-2 xl:grid-cols-6">
        {taskWorkflowColumns.map(status => {
          const columnTasks = filteredTasks.filter(task => task.status === status)
          return (
            <section
              key={status}
              onDragOver={event => event.preventDefault()}
              onDrop={() => {
                if (draggedTaskId) moveTask(draggedTaskId, status)
                setDraggedTaskId(null)
              }}
              className="min-w-[280px] rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{taskStatusLabels[status]}</h2>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">{columnTasks.length}</span>
              </div>
              <div className="space-y-3">
                {columnTasks.map(task => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    draggable={canMove}
                    onDragStart={() => setDraggedTaskId(task.id)}
                    onDragEnd={() => setDraggedTaskId(null)}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
                    Bu kolonda görev yok
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard({
  task,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  task: ProjectManagementTask
  draggable: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const health = getTaskHealth(task)
  const borderClass = health === 'critical'
    ? 'border-red-200 dark:border-red-900/70'
    : health === 'warning'
      ? 'border-amber-200 dark:border-amber-900/70'
      : 'border-gray-200 dark:border-gray-800'

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md dark:bg-gray-900 ${borderClass} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">{task.task_no}</div>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">{task.title}</h3>
        </div>
        {health !== 'ok' && (
          <AlertTriangle className={health === 'critical' ? 'text-red-500' : 'text-amber-500'} size={17} />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge label={taskTypeLabels[task.task_type as ProjectManagementTaskType]} />
        <Badge label={priorityLabels[task.priority as ProjectManagementPriority]} tone={task.priority === 'acil' || task.priority === 'kritik' ? 'red' : task.priority === 'yuksek' ? 'amber' : 'gray'} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="truncate">{task.customer_display_name || task.company_name || '-'}</span>
        <span className="flex items-center gap-1"><CalendarDays size={13} />{formatProjectManagementDate(task.due_date)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center gap-1.5">
          <Avatar name={task.assignee_name || '?'} />
          <span className="max-w-[120px] truncate text-xs font-medium text-gray-700 dark:text-gray-300">{task.assignee_name || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><MessageSquare size={13} />{task.comment_count}</span>
          <span className="flex items-center gap-1"><Paperclip size={13} />{task.attachment_count}</span>
          <span className="flex items-center gap-1"><SquareStack size={13} />{task.subtask_count}</span>
        </div>
      </div>
    </article>
  )
}

function Badge({ label, tone = 'gray' }: { label: string; tone?: 'gray' | 'amber' | 'red' }) {
  const className = tone === 'red'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(part => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-eden-blue text-[10px] font-bold text-white">
      {initials || '?'}
    </span>
  )
}
