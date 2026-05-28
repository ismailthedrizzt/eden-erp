'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Columns3,
  FolderOpen,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  UserCheck,
} from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { formControlClass } from '@/components/ui/formControlStyles'
import { projectsService, projectTasksService } from '@/lib/services/projects'
import type { ProjectRecord, ProjectTaskAttachment, ProjectTaskComment, ProjectTaskRecord, ProjectsSummary } from '@/lib/services/projects'

type Toast = { type: 'success' | 'error' | 'warning'; message: string }
type ProjectForm = {
  company_id: string
  project_key: string
  project_name: string
  project_type: string
  status: string
  priority: string
  project_manager_id: string
  start_date: string
  target_end_date: string
  description: string
  tags_text: string
}
type TaskForm = {
  company_id: string
  project_id: string
  issue_key: string
  title: string
  description: string
  issue_type: string
  status: string
  priority: string
  assignee_user_id: string
  assignee_employee_id: string
  reporter_user_id: string
  due_date: string
  start_date: string
  related_module: string
  related_entity_type: string
  related_entity_id: string
  labels_text: string
}

const projectStatuses = ['draft', 'active', 'on_hold', 'completed', 'cancelled']
const projectTypes = ['internal', 'customer', 'implementation', 'support', 'rnd', 'maintenance', 'other']
const issueStatuses = ['backlog', 'todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled']
const issueTypes = ['task', 'bug', 'improvement', 'support', 'incident', 'research', 'documentation', 'checklist']
const priorities = ['lowest', 'low', 'medium', 'high', 'highest', 'urgent']
const openStatuses = new Set(['backlog', 'todo', 'in_progress', 'blocked', 'review'])
const kanbanColumns = [
  ['backlog', 'Backlog'],
  ['todo', 'Yapilacak'],
  ['in_progress', 'Devam Ediyor'],
  ['blocked', 'Bloke'],
  ['review', 'Incelemede'],
  ['done', 'Tamamlandi'],
  ['cancelled', 'Iptal'],
] as const

export function ProjectTaskHomeMvpPage() {
  const [summary, setSummary] = useState<ProjectsSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    projectsService.summary().then(setSummary).catch(error => setError(error.message))
  }, [])

  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Proje ve Gorevler"
        subtitle="Ekip islerini, proje gorevlerini, atamalari ve Kanban akisini ERP kayitlariyla baglantili takip edin."
        icon={<ListChecks size={24} />}
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="Toplam proje" value={summary?.total_projects ?? 0} />
        <SummaryTile label="Aktif proje" value={summary?.active_projects ?? 0} tone="emerald" />
        <SummaryTile label="Acik gorev" value={summary?.open_tasks ?? 0} />
        <SummaryTile label="Geciken gorev" value={summary?.overdue_tasks ?? 0} tone={summary?.overdue_tasks ? 'amber' : 'emerald'} />
        <SummaryTile label="Urgent" value={summary?.urgent_tasks ?? 0} tone={summary?.urgent_tasks ? 'red' : 'emerald'} />
      </section>
      {error && <Alert text={error} />}
      <section className="grid gap-4 lg:grid-cols-3">
        <HomeLink href="/app/gorev-ve-proje-yonetimi/projeler" icon={<FolderOpen size={20} />} title="Projeler" text="Sirket, sube, organizasyon ve tesis kapsaminda proje kartlari." />
        <HomeLink href="/app/gorev-ve-proje-yonetimi/gorevler" icon={<CheckCircle2 size={20} />} title="Gorevler" text="Issue, oncelik, atama, yorum ve ekler ile is takip listesi." />
        <HomeLink href="/app/gorev-ve-proje-yonetimi/kanban-board" icon={<Columns3 size={20} />} title="Kanban" text="Backlog, yapilacak, devam eden, bloke ve tamamlanan gorevler." />
      </section>
      <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
        <div className="font-semibold">Process task ve project task ayrimi</div>
        <p className="mt-1 leading-6">
          Process task sistem isleminin parcasidir. Project task ise ekip is takibidir. Action Center ikisini tek is listesinde gosterebilir ama veri modeli ve lifecycle ayridir.
        </p>
      </section>
    </div>
  )
}

export function ProjectsMvpPage() {
  const [rows, setRows] = useState<ProjectRecord[]>([])
  const [summary, setSummary] = useState<ProjectsSummary | null>(null)
  const [selected, setSelected] = useState<ProjectRecord | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [filters, setFilters] = useState({ search: '', company_id: '', status: '', project_type: '', priority: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, nextSummary] = await Promise.all([
        projectsService.list({ ...filters, pageSize: 100 }),
        projectsService.summary(),
      ])
      setRows(list.data)
      setSummary(nextSummary)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Projeler yuklenemedi.' })
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <PageBanner
        mode="list"
        title="Projeler"
        subtitle="Proje kartlari sirket scope, yonetici, oncelik, ilerleme ve acik gorev ozetiyle takip edilir."
        icon={<FolderOpen size={24} />}
        onAddClick={() => setShowCreate(true)}
        addButtonText="Proje Olustur"
        customButtonIcon={<Plus size={16} />}
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="Toplam" value={summary?.total_projects ?? rows.length} />
        <SummaryTile label="Aktif" value={summary?.active_projects ?? rows.filter(row => row.status === 'active').length} tone="emerald" />
        <SummaryTile label="Acik gorev" value={summary?.open_tasks ?? sum(rows, 'open_tasks')} />
        <SummaryTile label="Geciken" value={summary?.overdue_tasks ?? sum(rows, 'overdue_tasks')} tone="amber" />
        <SummaryTile label="Urgent" value={summary?.urgent_tasks ?? 0} tone="red" />
      </section>
      <ProjectFilters filters={filters} setFilters={setFilters} onRefresh={load} />
      {toast && <InlineToast toast={toast} onClose={() => setToast(null)} />}
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <ProjectTable rows={rows} loading={loading} onSelect={setSelected} />
      </section>
      {selected && <ProjectDetail project={selected} onClose={() => setSelected(null)} />}
      {showCreate && (
        <ProjectCreateModal
          onClose={() => setShowCreate(false)}
          onSaved={project => {
            setRows(current => [project, ...current])
            setSelected(project)
            setShowCreate(false)
            setToast({ type: 'success', message: 'Proje olusturuldu.' })
          }}
        />
      )}
    </div>
  )
}

export function ProjectTasksMvpPage() {
  const [rows, setRows] = useState<ProjectTaskRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [selected, setSelected] = useState<ProjectTaskRecord | null>(null)
  const [comments, setComments] = useState<ProjectTaskComment[]>([])
  const [attachments, setAttachments] = useState<ProjectTaskAttachment[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [filters, setFilters] = useState({ search: '', company_id: '', project_id: '', status: '', priority: '', issue_type: '', overdue: false })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [taskList, projectList] = await Promise.all([
        projectTasksService.list({ ...filters, pageSize: 150 }),
        projectsService.list({ pageSize: 150 }),
      ])
      setRows(taskList.data)
      setProjects(projectList.data)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Gorevler yuklenemedi.' })
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const openTask = useCallback(async (task: ProjectTaskRecord) => {
    setSelected(task)
    try {
      const [nextComments, nextAttachments] = await Promise.all([
        projectTasksService.comments(task.id),
        projectTasksService.attachments(task.id),
      ])
      setComments(nextComments)
      setAttachments(nextAttachments)
    } catch {
      setComments([])
      setAttachments([])
    }
  }, [])

  async function transition(task: ProjectTaskRecord, status: string, reason?: string) {
    try {
      const updated = await projectTasksService.transition(task.id, { status, reason })
      setRows(current => current.map(row => row.id === updated.id ? { ...row, ...updated } : row))
      setSelected(updated)
      setToast({ type: 'success', message: 'Gorev durumu guncellendi.' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Durum guncellenemedi.' })
    }
  }

  return (
    <div className="space-y-5">
      <PageBanner
        mode="list"
        title="Gorevler"
        subtitle="Bu gorev proje gorevidir; resmi islem sureci degildir. Ilgili kayit secerseniz kayit detayinda da gorunur."
        icon={<CheckCircle2 size={24} />}
        onAddClick={() => setShowCreate(true)}
        addButtonText="Gorev Olustur"
        customButtonIcon={<Plus size={16} />}
      />
      <TaskSummary rows={rows} />
      <TaskFilters filters={filters} setFilters={setFilters} projects={projects} onRefresh={load} />
      {toast && <InlineToast toast={toast} onClose={() => setToast(null)} />}
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <TaskTable rows={rows} loading={loading} onSelect={openTask} />
      </section>
      {selected && (
        <TaskDetail
          task={selected}
          comments={comments}
          attachments={attachments}
          onClose={() => setSelected(null)}
          onTransition={transition}
          onCommentAdded={comment => setComments(current => [...current, comment])}
          onAttachmentAdded={attachment => setAttachments(current => [attachment, ...current])}
        />
      )}
      {showCreate && (
        <TaskCreateModal
          projects={projects}
          onClose={() => setShowCreate(false)}
          onSaved={task => {
            setRows(current => [task, ...current])
            setSelected(task)
            setShowCreate(false)
            setToast({ type: 'success', message: 'Proje gorevi olusturuldu.' })
          }}
        />
      )}
    </div>
  )
}

export function ProjectKanbanMvpPage() {
  const [rows, setRows] = useState<ProjectTaskRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [projectId, setProjectId] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)

  const load = useCallback(async () => {
    try {
      const [taskList, projectList] = await Promise.all([
        projectTasksService.list({ project_id: projectId, pageSize: 200 }),
        projectsService.list({ pageSize: 200 }),
      ])
      setRows(taskList.data)
      setProjects(projectList.data)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Kanban yuklenemedi.' })
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function move(task: ProjectTaskRecord, status: string) {
    try {
      const reason = status === 'blocked' ? 'Kanban uzerinden bloke edildi.' : undefined
      const updated = await projectTasksService.transition(task.id, { status, reason })
      setRows(current => current.map(row => row.id === updated.id ? { ...row, ...updated } : row))
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Gecis yapilamadi.' })
    }
  }

  return (
    <div className="space-y-5">
      <PageBanner mode="list" title="Kanban" subtitle="Button tabanli MVP Kanban; status transition kurallari backend tarafinda uygulanir." icon={<Columns3 size={24} />} />
      <section className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <select value={projectId} onChange={event => setProjectId(event.target.value)} className={formControlClass()}>
          <option value="">Tum projeler</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}
        </select>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          <RefreshCw size={15} /> Yenile
        </button>
      </section>
      {toast && <InlineToast toast={toast} onClose={() => setToast(null)} />}
      <section className="grid gap-4 overflow-x-auto xl:grid-cols-7">
        {kanbanColumns.map(([status, label]) => {
          const columnRows = rows.filter(row => row.status === status)
          return (
            <div key={status} className="min-w-[260px] rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">{columnRows.length}</span>
              </div>
              <div className="space-y-3">
                {columnRows.map(task => (
                  <article key={task.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="font-mono text-xs text-gray-500">{task.issue_key}</div>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge label={task.issue_type} />
                      <Badge label={task.priority} tone={priorityTone(task.priority)} />
                    </div>
                    <div className="mt-3 text-xs text-gray-500">{task.project_name || 'Bagimsiz gorev'} - {formatDate(task.due_date)}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextStatuses(String(task.status)).map(next => (
                        <button key={next} type="button" onClick={() => move(task, next)} className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                          {statusLabel(next)}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
                {columnRows.length === 0 && <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">Gorev yok</div>}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}

function ProjectFilters({ filters, setFilters, onRefresh }: { filters: Record<string, string>; setFilters: (value: any) => void; onRefresh: () => void }) {
  return (
    <section className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-3 xl:grid-cols-6">
      <Input value={filters.search} placeholder="Ara" onChange={search => setFilters((prev: any) => ({ ...prev, search }))} />
      <Input value={filters.company_id} placeholder="Sirket ID" onChange={company_id => setFilters((prev: any) => ({ ...prev, company_id }))} />
      <Select value={filters.status} options={projectStatuses} placeholder="Durum" onChange={status => setFilters((prev: any) => ({ ...prev, status }))} />
      <Select value={filters.project_type} options={projectTypes} placeholder="Tur" onChange={project_type => setFilters((prev: any) => ({ ...prev, project_type }))} />
      <Select value={filters.priority} options={priorities} placeholder="Oncelik" onChange={priority => setFilters((prev: any) => ({ ...prev, priority }))} />
      <button type="button" onClick={onRefresh} className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
        <RefreshCw size={15} /> Yenile
      </button>
    </section>
  )
}

function TaskFilters({ filters, setFilters, projects, onRefresh }: { filters: any; setFilters: (value: any) => void; projects: ProjectRecord[]; onRefresh: () => void }) {
  return (
    <section className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-3 xl:grid-cols-7">
      <Input value={filters.search} placeholder="Ara" onChange={search => setFilters((prev: any) => ({ ...prev, search }))} />
      <Input value={filters.company_id} placeholder="Sirket ID" onChange={company_id => setFilters((prev: any) => ({ ...prev, company_id }))} />
      <select value={filters.project_id} onChange={event => setFilters((prev: any) => ({ ...prev, project_id: event.target.value }))} className={formControlClass()}>
        <option value="">Tum projeler</option>
        {projects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}
      </select>
      <Select value={filters.status} options={issueStatuses} placeholder="Durum" onChange={status => setFilters((prev: any) => ({ ...prev, status }))} />
      <Select value={filters.priority} options={priorities} placeholder="Oncelik" onChange={priority => setFilters((prev: any) => ({ ...prev, priority }))} />
      <Select value={filters.issue_type} options={issueTypes} placeholder="Tip" onChange={issue_type => setFilters((prev: any) => ({ ...prev, issue_type }))} />
      <button type="button" onClick={onRefresh} className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
        <RefreshCw size={15} /> Yenile
      </button>
    </section>
  )
}

function ProjectTable({ rows, loading, onSelect }: { rows: ProjectRecord[]; loading: boolean; onSelect: (row: ProjectRecord) => void }) {
  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Projeler yukleniyor...</div>
  if (!rows.length) return <Empty text="Proje bulunamadi. Aktif bir sirket secerek ilk projeyi olusturun." />
  return (
    <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
      <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-950/40">
        <tr>{['Proje Anahtari', 'Proje Adi', 'Durum', 'Tur', 'Sirket', 'Yonetici', 'Oncelik', 'Baslangic', 'Hedef Bitis', 'Ilerleme', 'Acik Gorev', 'Geciken'].map(label => <th key={label} className="px-3 py-2 text-left">{label}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map(row => (
          <tr key={row.id} onClick={() => onSelect(row)} className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/20">
            <td className="px-3 py-3 font-mono text-xs">{row.project_key}</td>
            <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">{row.project_name}</td>
            <td className="px-3 py-3"><Badge label={row.status} tone={statusTone(row.status)} /></td>
            <td className="px-3 py-3">{row.project_type}</td>
            <td className="px-3 py-3">{shortId(row.company_id)}</td>
            <td className="px-3 py-3">{row.project_manager_id ? shortId(row.project_manager_id) : '-'}</td>
            <td className="px-3 py-3"><Badge label={row.priority} tone={priorityTone(row.priority)} /></td>
            <td className="px-3 py-3">{formatDate(row.start_date)}</td>
            <td className="px-3 py-3">{formatDate(row.target_end_date)}</td>
            <td className="px-3 py-3">%{Number(row.progress_percent || 0)}</td>
            <td className="px-3 py-3">{row.open_tasks || 0}</td>
            <td className="px-3 py-3">{row.overdue_tasks || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TaskTable({ rows, loading, onSelect }: { rows: ProjectTaskRecord[]; loading: boolean; onSelect: (row: ProjectTaskRecord) => void }) {
  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Gorevler yukleniyor...</div>
  if (!rows.length) return <Empty text="Gorev bulunamadi. Proje icinde veya bagimsiz ilk gorevi olusturun." />
  return (
    <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
      <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-950/40">
        <tr>{['Gorev Anahtari', 'Baslik', 'Durum', 'Tur', 'Oncelik', 'Proje', 'Sirket', 'Atanan', 'Son Tarih', 'Ilgili Kayit', 'Etiketler', 'Son Guncelleme'].map(label => <th key={label} className="px-3 py-2 text-left">{label}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map(row => (
          <tr key={row.id} onClick={() => onSelect(row)} className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/20">
            <td className="px-3 py-3 font-mono text-xs">{row.issue_key}</td>
            <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">{row.title}</td>
            <td className="px-3 py-3"><Badge label={row.status} tone={statusTone(row.status)} /></td>
            <td className="px-3 py-3">{row.issue_type}</td>
            <td className="px-3 py-3"><Badge label={row.priority} tone={priorityTone(row.priority)} /></td>
            <td className="px-3 py-3">{row.project_name || '-'}</td>
            <td className="px-3 py-3">{shortId(row.company_id)}</td>
            <td className="px-3 py-3">{row.assignee_employee_id ? shortId(row.assignee_employee_id) : row.assignee_user_id ? shortId(row.assignee_user_id) : '-'}</td>
            <td className={`px-3 py-3 ${isOverdue(row) ? 'font-semibold text-red-600' : ''}`}>{formatDate(row.due_date)}</td>
            <td className="px-3 py-3">{row.related_entity_type ? `${row.related_entity_type}:${shortId(row.related_entity_id)}` : '-'}</td>
            <td className="px-3 py-3">{(row.labels || []).join(', ') || '-'}</td>
            <td className="px-3 py-3">{formatDate(row.updated_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ProjectDetail({ project, onClose }: { project: ProjectRecord; onClose: () => void }) {
  return (
    <Drawer title={project.project_name} onClose={onClose}>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-3">
          <HeroLine label="Proje Anahtari" value={project.project_key} />
          <HeroLine label="Durum" value={project.status} />
          <HeroLine label="Tur" value={project.project_type} />
          <HeroLine label="Sirket" value={shortId(project.company_id)} />
          <HeroLine label="Yonetici" value={shortId(project.project_manager_id)} />
          <HeroLine label="Baslangic" value={formatDate(project.start_date)} />
          <HeroLine label="Hedef Bitis" value={formatDate(project.target_end_date)} />
        </section>
        <section className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Ozet</div>
          <HeroLine label="Toplam gorev" value={String(project.total_tasks || 0)} />
          <HeroLine label="Acik gorev" value={String(project.open_tasks || 0)} />
          <HeroLine label="Tamamlanan" value={String(project.done_tasks || 0)} />
          <HeroLine label="Geciken" value={String(project.overdue_tasks || 0)} />
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full bg-eden-blue" style={{ width: `${Math.min(100, Number(project.progress_percent || 0))}%` }} />
          </div>
          <Link href={`/app/gorev-ve-proje-yonetimi/gorevler?project_id=${project.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-eden-blue">
            Gorevleri ac <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      <section className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
        Tamamlanan veya iptal edilen projede yeni gorev acma policy tarafindan sinirlanir.
      </section>
    </Drawer>
  )
}

function TaskDetail({ task, comments, attachments, onClose, onTransition, onCommentAdded, onAttachmentAdded }: {
  task: ProjectTaskRecord
  comments: ProjectTaskComment[]
  attachments: ProjectTaskAttachment[]
  onClose: () => void
  onTransition: (task: ProjectTaskRecord, status: string, reason?: string) => void
  onCommentAdded: (comment: ProjectTaskComment) => void
  onAttachmentAdded: (attachment: ProjectTaskAttachment) => void
}) {
  const [comment, setComment] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState('')
  const next = nextStatuses(String(task.status))

  async function addComment(event: FormEvent) {
    event.preventDefault()
    if (!comment.trim()) return
    const saved = await projectTasksService.addComment(task.id, comment.trim())
    onCommentAdded(saved)
    setComment('')
  }

  async function addAttachment(event: FormEvent) {
    event.preventDefault()
    if (!fileName.trim()) return
    const saved = await projectTasksService.addAttachment(task.id, {
      file_name: fileName.trim(),
      file_type: fileType.trim() || undefined,
      file_ref: { source: 'manual_reference', file_name: fileName.trim() },
    })
    onAttachmentAdded(saved)
    setFileName('')
    setFileType('')
  }

  return (
    <Drawer title={`${task.issue_key} - ${task.title}`} onClose={onClose}>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-3">
          <HeroLine label="Durum" value={task.status} />
          <HeroLine label="Tip" value={task.issue_type} />
          <HeroLine label="Oncelik" value={task.priority} />
          <HeroLine label="Proje" value={task.project_name || 'Bagimsiz gorev'} />
          <HeroLine label="Son tarih" value={formatDate(task.due_date)} />
          <HeroLine label="Ilgili kayit" value={task.related_entity_type ? `${task.related_entity_type}:${shortId(task.related_entity_id)}` : '-'} />
          <p className="rounded-lg border border-gray-200 p-3 text-sm leading-6 text-gray-600 dark:border-gray-800 dark:text-gray-300">{task.description || 'Aciklama girilmemis.'}</p>
          <div className="flex flex-wrap gap-2">
            {next.map(status => (
              <button key={status} type="button" onClick={() => onTransition(task, status, status === 'blocked' ? 'Detayda bloke edildi.' : undefined)} className="rounded-md bg-eden-blue px-3 py-2 text-sm font-semibold text-white hover:bg-eden-blue-dk">
                {statusLabel(status)}
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageSquare size={16} /> Yorumlar</div>
            <form onSubmit={addComment} className="flex gap-2">
              <input value={comment} onChange={event => setComment(event.target.value)} placeholder="Yorum ekle" className={formControlClass()} />
              <button className="rounded-md bg-eden-blue px-3 text-sm font-semibold text-white">Ekle</button>
            </form>
            <div className="mt-3 space-y-2">
              {comments.map(item => <div key={item.id} className="rounded-md bg-gray-50 p-2 text-sm dark:bg-gray-800">{item.body}</div>)}
              {!comments.length && <div className="text-sm text-gray-500">Yorum yok.</div>}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Paperclip size={16} /> Ekler</div>
            <form onSubmit={addAttachment} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <input value={fileName} onChange={event => setFileName(event.target.value)} placeholder="Dosya adi" className={formControlClass()} />
              <input value={fileType} onChange={event => setFileType(event.target.value)} placeholder="Tip" className={formControlClass()} />
              <button className="rounded-md bg-eden-blue px-3 text-sm font-semibold text-white">Ekle</button>
            </form>
            <div className="mt-3 space-y-2">
              {attachments.map(item => <div key={item.id} className="rounded-md bg-gray-50 p-2 text-sm dark:bg-gray-800">{item.file_name}</div>)}
              {!attachments.length && <div className="text-sm text-gray-500">Ek yok.</div>}
            </div>
          </div>
        </section>
      </div>
      <section className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
        Surec gorevleri Action Center icinde ayri etiketle gorunur; bu kayit ekip is takibi icindir.
      </section>
    </Drawer>
  )
}

function ProjectCreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: (project: ProjectRecord) => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProjectForm>({
    company_id: '',
    project_key: '',
    project_name: '',
    project_type: 'internal',
    status: 'active',
    priority: 'medium',
    project_manager_id: '',
    start_date: '',
    target_end_date: '',
    description: '',
    tags_text: '',
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const saved = await projectsService.create(cleanPayload({ ...form, tags: splitList(form.tags_text) }))
      onSaved(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Proje Olustur" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Hint>Proje bir sirkete bagli olmalidir. Sube, organizasyon ve tesis kapsam alanlari opsiyoneldir.</Hint>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Sirket ID" required value={form.company_id} onChange={company_id => setForm(prev => ({ ...prev, company_id }))} />
          <Input label="Proje Anahtari" value={form.project_key} onChange={project_key => setForm(prev => ({ ...prev, project_key }))} />
          <Input label="Proje Adi" required value={form.project_name} onChange={project_name => setForm(prev => ({ ...prev, project_name }))} />
          <Select label="Tur" value={form.project_type} options={projectTypes} onChange={project_type => setForm(prev => ({ ...prev, project_type }))} />
          <Select label="Durum" value={form.status} options={projectStatuses} onChange={status => setForm(prev => ({ ...prev, status }))} />
          <Select label="Oncelik" value={form.priority} options={priorities} onChange={priority => setForm(prev => ({ ...prev, priority }))} />
          <Input label="Proje Yoneticisi ID" value={form.project_manager_id} onChange={project_manager_id => setForm(prev => ({ ...prev, project_manager_id }))} />
          <Input label="Hedef Bitis" type="date" value={form.target_end_date} onChange={target_end_date => setForm(prev => ({ ...prev, target_end_date }))} />
        </div>
        <textarea value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} placeholder="Aciklama" className={formControlClass()} />
        <ModalActions saving={saving} onClose={onClose} saveLabel="Projeyi Kaydet" />
      </form>
    </Modal>
  )
}

function TaskCreateModal({ projects, onClose, onSaved }: { projects: ProjectRecord[]; onClose: () => void; onSaved: (task: ProjectTaskRecord) => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TaskForm>({
    company_id: '',
    project_id: '',
    issue_key: '',
    title: '',
    description: '',
    issue_type: 'task',
    status: 'todo',
    priority: 'medium',
    assignee_user_id: '',
    assignee_employee_id: '',
    reporter_user_id: '',
    due_date: '',
    start_date: '',
    related_module: '',
    related_entity_type: '',
    related_entity_id: '',
    labels_text: '',
  })
  const selectedProject = projects.find(project => project.id === form.project_id)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const saved = await projectTasksService.create(cleanPayload({
        ...form,
        company_id: form.company_id || selectedProject?.company_id,
        labels: splitList(form.labels_text),
      }))
      onSaved(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Gorev Olustur" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Hint>Bu gorev proje gorevidir; resmi islem sureci veya process task yerine gecmez.</Hint>
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={form.project_id} onChange={event => setForm(prev => ({ ...prev, project_id: event.target.value, company_id: projects.find(project => project.id === event.target.value)?.company_id || prev.company_id }))} className={formControlClass()}>
            <option value="">Bagimsiz gorev</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}
          </select>
          <Input label="Sirket ID" required value={form.company_id || selectedProject?.company_id || ''} onChange={company_id => setForm(prev => ({ ...prev, company_id }))} />
          <Input label="Baslik" required value={form.title} onChange={title => setForm(prev => ({ ...prev, title }))} />
          <Input label="Gorev Anahtari" value={form.issue_key} onChange={issue_key => setForm(prev => ({ ...prev, issue_key }))} />
          <Select label="Tip" value={form.issue_type} options={issueTypes} onChange={issue_type => setForm(prev => ({ ...prev, issue_type }))} />
          <Select label="Durum" value={form.status} options={issueStatuses} onChange={status => setForm(prev => ({ ...prev, status }))} />
          <Select label="Oncelik" value={form.priority} options={priorities} onChange={priority => setForm(prev => ({ ...prev, priority }))} />
          <Input label="Atanan User ID" value={form.assignee_user_id} onChange={assignee_user_id => setForm(prev => ({ ...prev, assignee_user_id }))} />
          <Input label="Atanan Calisan ID" value={form.assignee_employee_id} onChange={assignee_employee_id => setForm(prev => ({ ...prev, assignee_employee_id }))} />
          <Input label="Son Tarih" type="date" value={form.due_date} onChange={due_date => setForm(prev => ({ ...prev, due_date }))} />
          <Input label="Ilgili Modul" value={form.related_module} onChange={related_module => setForm(prev => ({ ...prev, related_module }))} />
          <Input label="Ilgili Kayit Tipi" value={form.related_entity_type} onChange={related_entity_type => setForm(prev => ({ ...prev, related_entity_type }))} />
          <Input label="Ilgili Kayit ID" value={form.related_entity_id} onChange={related_entity_id => setForm(prev => ({ ...prev, related_entity_id }))} />
          <Input label="Etiketler" value={form.labels_text} onChange={labels_text => setForm(prev => ({ ...prev, labels_text }))} />
        </div>
        <textarea value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} placeholder="Aciklama" className={formControlClass()} />
        <ModalActions saving={saving} onClose={onClose} saveLabel="Gorevi Kaydet" />
      </form>
    </Modal>
  )
}

function TaskSummary({ rows }: { rows: ProjectTaskRecord[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryTile label="Toplam" value={rows.length} />
      <SummaryTile label="Acik" value={rows.filter(row => openStatuses.has(String(row.status))).length} tone="emerald" />
      <SummaryTile label="Bloke" value={rows.filter(row => row.status === 'blocked').length} tone="amber" />
      <SummaryTile label="Geciken" value={rows.filter(isOverdue).length} tone="red" />
      <SummaryTile label="Yorum/Ek" value={rows.reduce((total, row) => total + Number(row.comment_count || 0) + Number(row.attachment_count || 0), 0)} />
    </section>
  )
}

function SummaryTile({ label, value, tone = 'blue' }: { label: string; value: number; tone?: 'blue' | 'emerald' | 'amber' | 'red' }) {
  return (
    <div className={`rounded-lg border p-4 ${toneClass(tone)}`}>
      <div className="text-xs font-medium opacity-75">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}

function HomeLink({ href, icon, title, text }: { href: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-eden-blue hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-50 p-3 text-eden-blue dark:bg-blue-950/40">{icon}</div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{text}</p>
        </div>
      </div>
    </Link>
  )
}

function Drawer({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-4">
      <div className="ml-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700">Kapat</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700">Kapat</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ saving, onClose, saveLabel }: { saving: boolean; onClose: () => void; saveLabel: string }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold dark:border-gray-700">Vazgec</button>
      <button type="submit" disabled={saving} className="rounded-md bg-eden-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Kaydediliyor...' : saveLabel}</button>
    </div>
  )
}

function Input({ label, value, onChange, placeholder, required, type = 'text' }: { label?: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">{label}</span>}
      <input required={required} type={type} value={value} placeholder={placeholder || label} onChange={event => onChange(event.target.value)} className={formControlClass()} />
    </label>
  )
}

function Select({ label, value, options, onChange, placeholder }: { label?: string; value: string; options: readonly string[]; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">{label}</span>}
      <select value={value} onChange={event => onChange(event.target.value)} className={formControlClass()}>
        <option value="">{placeholder || label || 'Seciniz'}</option>
        {options.map(option => <option key={option} value={option}>{statusLabel(option)}</option>)}
      </select>
    </label>
  )
}

function HeroLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="truncate font-medium text-gray-900 dark:text-white">{value || '-'}</span>
    </div>
  )
}

function Badge({ label, tone = 'gray' }: { label: unknown; tone?: 'gray' | 'emerald' | 'amber' | 'red' }) {
  const className = tone === 'red'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{statusLabel(String(label || '-'))}</span>
}

function InlineToast({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const className = toast.type === 'error'
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200'
    : toast.type === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200'
  return <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${className}`}><span>{toast.message}</span><button onClick={onClose}>Kapat</button></div>
}

function Alert({ text }: { text: string }) {
  return <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200"><AlertTriangle size={16} /> {text}</div>
}

function Hint({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">{children}</div>
}

function Empty({ text }: { text: string }) {
  return <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">{text}</div>
}

function sum(rows: ProjectRecord[], key: keyof ProjectRecord) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0)
}

function splitList(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function cleanPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '' && value !== undefined && value !== null))
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR')
}

function shortId(value?: string | null) {
  if (!value) return '-'
  return value.length > 12 ? `${value.slice(0, 8)}...` : value
}

function isOverdue(task: ProjectTaskRecord) {
  if (!task.due_date || !openStatuses.has(String(task.status))) return false
  const due = new Date(task.due_date)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: 'Taslak',
    active: 'Aktif',
    on_hold: 'Beklemede',
    completed: 'Tamamlandi',
    cancelled: 'Iptal',
    backlog: 'Backlog',
    todo: 'Yapilacak',
    in_progress: 'Devam Ediyor',
    blocked: 'Bloke',
    review: 'Incelemede',
    done: 'Tamamlandi',
    task: 'Gorev',
    bug: 'Hata',
    improvement: 'Iyilestirme',
    support: 'Destek',
    incident: 'Olay',
    research: 'Arastirma',
    documentation: 'Dokumantasyon',
    checklist: 'Checklist',
    lowest: 'En Dusuk',
    low: 'Dusuk',
    medium: 'Orta',
    high: 'Yuksek',
    highest: 'En Yuksek',
    urgent: 'Acil',
  }
  return labels[value] || value
}

function statusTone(value: unknown): 'gray' | 'emerald' | 'amber' | 'red' {
  if (['active', 'done', 'completed'].includes(String(value))) return 'emerald'
  if (['blocked', 'on_hold', 'review'].includes(String(value))) return 'amber'
  if (['urgent', 'cancelled'].includes(String(value))) return 'red'
  return 'gray'
}

function priorityTone(value: unknown): 'gray' | 'emerald' | 'amber' | 'red' {
  if (['urgent', 'highest'].includes(String(value))) return 'red'
  if (String(value) === 'high') return 'amber'
  if (['low', 'lowest'].includes(String(value))) return 'emerald'
  return 'gray'
}

function toneClass(tone: 'blue' | 'emerald' | 'amber' | 'red') {
  if (tone === 'red') return 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
  if (tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
  if (tone === 'emerald') return 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
  return 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300'
}

function nextStatuses(status: string) {
  const map: Record<string, string[]> = {
    backlog: ['todo', 'in_progress', 'blocked', 'cancelled'],
    todo: ['in_progress', 'blocked', 'cancelled'],
    in_progress: ['review', 'done', 'blocked', 'cancelled'],
    blocked: ['todo', 'in_progress', 'cancelled'],
    review: ['in_progress', 'done', 'blocked', 'cancelled'],
    done: [],
    cancelled: [],
  }
  return map[status] || []
}
