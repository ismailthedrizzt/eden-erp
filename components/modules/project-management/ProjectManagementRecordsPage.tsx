'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  GitBranch,
  Plus,
  Timer,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { EntityForm, type FormMode } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { usePermissions } from '@/lib/security/permissionStore'
import {
  PROJECT_MANAGEMENT_MODULE_KEY,
  decorateProjectManagementRecord,
  formatDuration,
  getProjectHealth,
  getProjectManagementColumns,
  getProjectManagementHeroFields,
  getProjectManagementRecordTitle,
  getProjectManagementTabs,
  getTaskHealth,
  normalizeProjectManagementRecord,
  projectManagementAreaByKey,
  validateProjectManagementRecord,
} from '@/lib/modules/project-management/projectManagement.config'
import { PROJECT_MANAGEMENT_PERMISSIONS } from '@/lib/modules/project-management/projectManagement.permissions'
import {
  buildProjectCode,
  buildTaskNo,
  createProjectManagementRecordSeed,
  getProjectManagementRecordsByArea,
} from '@/lib/modules/project-management/projectManagement.mock'
import type {
  ProjectManagementEditableAreaKey,
  ProjectManagementEditableRecord,
  ProjectManagementProject,
  ProjectManagementTask,
  ProjectManagementTimeLog,
} from '@/lib/modules/project-management/projectManagement.types'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }

const AREA_ICON = {
  gorevler: CheckCircle2,
  projeler: FolderOpen,
  sprintler: Clock,
  'zaman-takibi': Timer,
  'is-akislari': GitBranch,
} satisfies Record<ProjectManagementEditableAreaKey, LucideIcon>

export function ProjectManagementRecordsPage({ areaKey }: { areaKey: ProjectManagementEditableAreaKey }) {
  const area = projectManagementAreaByKey[areaKey]
  const Icon = AREA_ICON[areaKey]
  const permissions = usePermissions()
  const { isModuleActive, isSubmoduleActive } = useModuleLicense()
  const [rows, setRows] = useState<ProjectManagementEditableRecord[]>(() => getProjectManagementRecordsByArea(areaKey))
  const [pageState, setPageState] = useState<PageState>('list')
  const [selected, setSelected] = useState<ProjectManagementEditableRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [includePassive, setIncludePassive] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const canManage = permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.manageAll)
  const canView = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.view)
  const canCreate = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.createTask) || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.manageProjects)
  const canEdit = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.editTask) || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.manageProjects)
  const canDelete = canManage || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.deleteTask) || permissions.can(PROJECT_MANAGEMENT_PERMISSIONS.manageProjects)
  const moduleAvailable = isModuleActive(PROJECT_MANAGEMENT_MODULE_KEY) && isSubmoduleActive(PROJECT_MANAGEMENT_MODULE_KEY, areaKey)

  const activeRows = rows.filter(row => !row.is_deleted && row.record_status !== 'passive')
  const visibleRows = includePassive ? rows : activeRows
  const decoratedRows = useMemo(() => visibleRows.map(row => decorateProjectManagementRecord(areaKey, row)), [areaKey, visibleRows])
  const formMode: FormMode = pageState === 'create'
    ? 'create'
    : selected?.is_deleted || selected?.record_status === 'passive'
      ? 'passive'
      : pageState === 'edit'
        ? 'edit'
        : 'view'
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create' && !!selected,
    detailReady: pageState !== 'create' && !!selected,
    referencesReady: true,
  })

  function startCreate() {
    setSelected(createProjectManagementRecordSeed(areaKey))
    setPageState('create')
  }

  function openRow(row: ProjectManagementEditableRecord) {
    setSelected(rows.find(item => item.id === row.id) || row)
    setPageState('view')
  }

  async function saveRecord(data: Record<string, any>, mode: FormMode) {
    if (!selected) return
    const missing = validateProjectManagementRecord(areaKey, data)
    if (missing.length > 0) {
      setToast({ type: 'error', title: 'Zorunlu alanlar eksik', message: missing.join(', ') })
      return
    }

    setSaving(true)
    try {
      const timestamp = new Date().toISOString()
      if (mode === 'create') {
        const nextRecord = normalizeProjectManagementRecord(areaKey, {
          ...selected,
          ...data,
          id: crypto.randomUUID?.() || `${areaKey}-${Date.now()}`,
          ...buildCreateDefaults(areaKey, rows, data),
          record_status: 'active',
          is_deleted: false,
          created_at: timestamp,
          updated_at: timestamp,
        } as ProjectManagementEditableRecord)
        setRows(current => [nextRecord, ...current])
        setSelected(nextRecord)
        setPageState('view')
        setToast({ type: 'success', title: 'Kaydedildi', message: `${area.singularTitle} oluşturuldu.` })
        return
      }

      const nextRecord = normalizeProjectManagementRecord(areaKey, {
        ...selected,
        ...data,
        updated_at: timestamp,
      } as ProjectManagementEditableRecord)
      setRows(current => current.map(row => row.id === nextRecord.id ? nextRecord : row))
      setSelected(nextRecord)
      setPageState('view')
      setToast({ type: 'success', title: 'Güncellendi', message: `${area.singularTitle} güncellendi.` })
    } finally {
      setSaving(false)
    }
  }

  async function passivateRecord() {
    if (!selected) return
    setDeleting(true)
    try {
      const nextRecord = {
        ...selected,
        record_status: 'passive' as const,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setRows(current => current.map(row => row.id === nextRecord.id ? nextRecord : row))
      setSelected(nextRecord)
      setToast({ type: 'warning', title: 'Pasife alındı', message: `${area.singularTitle} soft-delete ile pasife alındı.` })
    } finally {
      setDeleting(false)
    }
  }

  async function activateRecord() {
    if (!selected) return
    setDeleting(true)
    try {
      const nextRecord = {
        ...selected,
        record_status: 'active' as const,
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      }
      setRows(current => current.map(row => row.id === nextRecord.id ? nextRecord : row))
      setSelected(nextRecord)
      setToast({ type: 'success', title: 'Aktif edildi', message: `${area.singularTitle} tekrar aktif edildi.` })
    } finally {
      setDeleting(false)
    }
  }

  if (!moduleAvailable) {
    return <UnavailableState title={area.title} icon={<Icon size={24} />} />
  }

  if (!canView) {
    return <PermissionState title={area.title} icon={<Icon size={24} />} />
  }

  return (
    <div className="relative space-y-5">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        formMode={formMode === 'edit' ? 'edit' : formMode === 'create' ? 'create' : 'view'}
        title={pageState === 'list' ? area.title : pageState === 'create' ? `Yeni ${area.singularTitle}` : selected ? getProjectManagementRecordTitle(areaKey, selected) : area.singularTitle}
        subtitle={pageState === 'list' ? area.description : 'ERP kayıtlarıyla ilişkili iş takip kaydını yönetin.'}
        icon={<Icon size={24} />}
        onAddClick={pageState === 'list' ? startCreate : undefined}
        addButtonText="Yeni Kayıt"
        addButtonDisabled={!canCreate}
        customButtonIcon={<Plus size={16} />}
        onBackClick={pageState === 'list' ? undefined : () => { setPageState('list'); setSelected(null) }}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' ? (
        <>
          <RecordsSummaryStrip areaKey={areaKey} rows={rows} activeCount={activeRows.length} />
          <SmartDataTable
            columns={getProjectManagementColumns(areaKey)}
            data={decoratedRows as any[]}
            loading={false}
            defaultView="list"
            storageKey={`project-management-${areaKey}`}
            emptyText={area.emptyText}
            onRowClick={(row: any) => openRow(row)}
            showPassiveToggle
            includePassive={includePassive}
            includePassiveLabel="Pasif kayıtları göster"
            onIncludePassiveChange={setIncludePassive}
          />
        </>
      ) : selected ? (
        <EntityForm
          mode={formMode}
          entityName={area.title}
          entityNameSingular={area.singularTitle}
          heroFields={getProjectManagementHeroFields(areaKey)}
          tabs={getProjectManagementTabs(areaKey)}
          data={decorateProjectManagementRecord(areaKey, selected)}
          saving={saving}
          deleting={deleting}
          loadStages={formLoadStages}
          canCreate={canCreate}
          canEdit={canEdit}
          access={{
            canInsert: canCreate,
            canEdit,
            canPassivate: canDelete,
          }}
          heroLeftPanel={<RecordHeroPanel areaKey={areaKey} record={selected} />}
          showHeroHeader
          onSave={saveRecord}
          onCancel={() => pageState === 'edit' ? setPageState('view') : setPageState('list')}
          onModeChange={(nextMode) => setPageState(nextMode === 'create' ? 'create' : nextMode)}
          onDelete={canDelete ? passivateRecord : undefined}
          onActivate={canDelete ? activateRecord : undefined}
          enableHistory
        />
      ) : null}
    </div>
  )
}

function RecordsSummaryStrip({
  areaKey,
  rows,
  activeCount,
}: {
  areaKey: ProjectManagementEditableAreaKey
  rows: ProjectManagementEditableRecord[]
  activeCount: number
}) {
  const warningCount = rows.filter(row => {
    if (areaKey === 'gorevler') return ['critical', 'warning'].includes(getTaskHealth(row as ProjectManagementTask))
    if (areaKey === 'projeler') return getProjectHealth(row as ProjectManagementProject) === 'warning'
    return false
  }).length
  const passiveCount = rows.length - activeCount
  const timeMinutes = areaKey === 'zaman-takibi'
    ? rows.reduce((sum, row) => sum + Number((row as ProjectManagementTimeLog).duration_minutes || 0), 0)
    : 0

  const items = [
    { label: areaKey === 'zaman-takibi' ? 'Toplam Kayıt' : 'Aktif Kayıt', value: activeCount, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/60' },
    { label: areaKey === 'zaman-takibi' ? 'Toplam Süre' : 'Uyarı', value: areaKey === 'zaman-takibi' ? formatDuration(timeMinutes) : warningCount, icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900/60' },
    { label: 'Pasif', value: passiveCount, icon: Archive, color: 'text-slate-700 bg-slate-50 border-slate-100 dark:text-slate-300 dark:bg-slate-900/40 dark:border-slate-800' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(item => (
        <div key={item.label} className={`rounded-lg border p-4 ${item.color}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium opacity-75">{item.label}</p>
              <p className="mt-1 text-2xl font-bold">{item.value}</p>
            </div>
            <item.icon size={22} />
          </div>
        </div>
      ))}
    </div>
  )
}

function RecordHeroPanel({ areaKey, record }: { areaKey: ProjectManagementEditableAreaKey; record: ProjectManagementEditableRecord }) {
  const health = areaKey === 'gorevler'
    ? getTaskHealth(record as ProjectManagementTask)
    : areaKey === 'projeler'
      ? getProjectHealth(record as ProjectManagementProject)
      : record.is_deleted || record.record_status === 'passive'
        ? 'passive'
        : 'ok'
  const healthClass = health === 'critical'
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
    : health === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
      : health === 'passive'
        ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'

  const primary = getPrimaryMetric(areaKey, record)
  const secondary = getSecondaryMetric(areaKey, record)

  return (
    <div className={`rounded-lg border p-4 ${healthClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium opacity-70">İş Takip Durumu</p>
          <p className="mt-1 text-lg font-bold">
            {health === 'critical' ? 'Kritik' : health === 'warning' ? 'Uyarı' : health === 'passive' ? 'Pasif' : 'Sağlıklı'}
          </p>
        </div>
        <FileText size={22} />
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="opacity-70">{primary.label}</span>
          <span className="truncate font-medium">{primary.value}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="opacity-70">{secondary.label}</span>
          <span className="truncate font-medium">{secondary.value}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="opacity-70">Şirket</span>
          <span className="truncate font-medium">{record.company_name || '-'}</span>
        </div>
      </div>
    </div>
  )
}

function getPrimaryMetric(areaKey: ProjectManagementEditableAreaKey, record: ProjectManagementEditableRecord) {
  if (areaKey === 'gorevler') return { label: 'Sorumlu', value: (record as ProjectManagementTask).assignee_name || '-' }
  if (areaKey === 'projeler') return { label: 'Yönetici', value: (record as ProjectManagementProject).project_manager_name || '-' }
  if (areaKey === 'zaman-takibi') return { label: 'Personel', value: (record as ProjectManagementTimeLog).user_name || '-' }
  return { label: 'Kayıt', value: getProjectManagementRecordTitle(areaKey, record) || '-' }
}

function getSecondaryMetric(areaKey: ProjectManagementEditableAreaKey, record: ProjectManagementEditableRecord) {
  if (areaKey === 'gorevler') return { label: 'ERP İlişkisi', value: (record as ProjectManagementTask).related_entity_label || '-' }
  if (areaKey === 'projeler') return { label: 'Müşteri', value: (record as ProjectManagementProject).customer_display_name || '-' }
  if (areaKey === 'zaman-takibi') return { label: 'Süre', value: formatDuration((record as ProjectManagementTimeLog).duration_minutes) }
  return { label: 'Durum', value: record.record_status === 'passive' ? 'Pasif' : 'Aktif' }
}

function buildCreateDefaults(areaKey: ProjectManagementEditableAreaKey, rows: ProjectManagementEditableRecord[], data: Record<string, any>) {
  if (areaKey === 'gorevler') {
    const taskRows = rows as ProjectManagementTask[]
    return {
      task_no: data.task_no && data.task_no !== 'GV-YENI' ? data.task_no : buildTaskNo(taskRows),
    }
  }

  if (areaKey === 'projeler') {
    const projectRows = rows as ProjectManagementProject[]
    return {
      code: data.code && data.code !== 'PRJ-YENI' ? data.code : buildProjectCode(projectRows),
    }
  }

  return {}
}

function UnavailableState({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div>
      <PageBanner mode="list" title={title} subtitle="Modül lisansı pasif olduğu için sayfa kullanılamıyor." icon={icon} />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Bu alt modül sistem ayarlarından aktif edildiğinde kayıt ekranları kullanılabilir.
      </div>
    </div>
  )
}

function PermissionState({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div>
      <PageBanner mode="list" title={title} subtitle="Bu sayfayı görüntülemek için yetki gerekiyor." icon={icon} />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Gerekli izin: {PROJECT_MANAGEMENT_PERMISSIONS.view}
      </div>
    </div>
  )
}
