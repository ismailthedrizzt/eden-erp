import type { ColumnDef } from '@/components/ui/SmartDataTable'
import type { FormField, FormTab } from '@/components/ui/EntityForm'
import type {
  ProjectManagementAreaConfig,
  ProjectManagementAreaKey,
  ProjectManagementEditableAreaKey,
  ProjectManagementEditableRecord,
  ProjectManagementPriority,
  ProjectManagementProject,
  ProjectManagementProjectStatus,
  ProjectManagementProjectType,
  ProjectManagementSprint,
  ProjectManagementSprintStatus,
  ProjectManagementTask,
  ProjectManagementTaskStatus,
  ProjectManagementTaskType,
  ProjectManagementTimeLog,
  ProjectManagementWorkflow,
} from './projectManagement.types'

export const PROJECT_MANAGEMENT_MODULE_KEY = 'project_management'

export const projectManagementAreas: ProjectManagementAreaConfig[] = [
  {
    key: 'gorevler',
    title: 'Görevler',
    singularTitle: 'Görev',
    shortTitle: 'Görev',
    description: 'Günlük işler, müşteri aksiyonları, servis görevleri ve proje alt görevlerini yönetin.',
    href: '/app/gorev-ve-proje-yonetimi/gorevler',
    emptyText: 'Görev bulunamadı',
  },
  {
    key: 'projeler',
    title: 'Projeler',
    singularTitle: 'Proje',
    shortTitle: 'Proje',
    description: 'Şirket içi ve müşteri bazlı işleri proje yapısı altında takip edin.',
    href: '/app/gorev-ve-proje-yonetimi/projeler',
    emptyText: 'Proje bulunamadı',
  },
  {
    key: 'kanban-board',
    title: 'Kanban Board',
    singularTitle: 'Board',
    shortTitle: 'Board',
    description: 'Görevleri workflow durumlarına göre kolonlar halinde görselleştirin.',
    href: '/app/gorev-ve-proje-yonetimi/kanban-board',
    emptyText: 'Board üzerinde gösterilecek görev yok',
  },
  {
    key: 'backlog',
    title: 'Backlog',
    singularTitle: 'Backlog Kaydı',
    shortTitle: 'Backlog',
    description: 'Henüz sprint veya aktif plana alınmamış işleri önceliklendirin.',
    href: '/app/gorev-ve-proje-yonetimi/backlog',
    emptyText: 'Backlog kaydı bulunamadı',
  },
  {
    key: 'sprintler',
    title: 'Sprintler',
    singularTitle: 'Sprint',
    shortTitle: 'Sprint',
    description: 'Belirli çalışma dönemlerinde tamamlanacak görevleri planlayın.',
    href: '/app/gorev-ve-proje-yonetimi/sprintler',
    emptyText: 'Sprint bulunamadı',
  },
  {
    key: 'takvim',
    title: 'Takvim',
    singularTitle: 'Takvim Kaydı',
    shortTitle: 'Takvim',
    description: 'Görev son tarihleri, proje kilometre taşları ve takip tarihlerini görün.',
    href: '/app/gorev-ve-proje-yonetimi/takvim',
    emptyText: 'Takvim kaydı bulunamadı',
  },
  {
    key: 'zaman-takibi',
    title: 'Zaman Takibi',
    singularTitle: 'Zaman Kaydı',
    shortTitle: 'Zaman',
    description: 'Görev, proje, müşteri ve personel bazında harcanan süreleri izleyin.',
    href: '/app/gorev-ve-proje-yonetimi/zaman-takibi',
    emptyText: 'Zaman kaydı bulunamadı',
  },
  {
    key: 'is-akislari',
    title: 'İş Akışları',
    singularTitle: 'Workflow',
    shortTitle: 'Workflow',
    description: 'Görev durumları, geçişleri ve temel workflow kurallarını yönetin.',
    href: '/app/gorev-ve-proje-yonetimi/is-akislari',
    emptyText: 'Workflow bulunamadı',
  },
  {
    key: 'raporlar',
    title: 'Raporlar',
    singularTitle: 'Rapor',
    shortTitle: 'Rapor',
    description: 'Görev, proje, ekip, müşteri ve zaman performansını izleyin.',
    href: '/app/gorev-ve-proje-yonetimi/raporlar',
    emptyText: 'Rapor verisi bulunamadı',
  },
]

export const projectManagementAreaByKey = Object.fromEntries(
  projectManagementAreas.map(area => [area.key, area]),
) as Record<ProjectManagementAreaKey, ProjectManagementAreaConfig>

export const editableProjectManagementAreaKeys: ProjectManagementEditableAreaKey[] = [
  'gorevler',
  'projeler',
  'sprintler',
  'zaman-takibi',
  'is-akislari',
]

export const taskTypeLabels: Record<ProjectManagementTaskType, string> = {
  gorev: 'Görev',
  alt_gorev: 'Alt görev',
  is_paketi: 'İş paketi',
  hata_problem: 'Hata / problem',
  talep: 'Talep',
  servis_gorevi: 'Servis görevi',
  satis_takip_gorevi: 'Satış takip görevi',
  dokuman_takip_gorevi: 'Doküman takip görevi',
  onay_gorevi: 'Onay görevi',
  toplanti_aksiyonu: 'Toplantı aksiyonu',
  risk: 'Risk',
  karar: 'Karar',
  hatirlatma: 'Hatırlatma',
}

export const taskStatusLabels: Record<ProjectManagementTaskStatus, string> = {
  yeni: 'Yeni',
  yapilacak: 'Yapılacak',
  devam_ediyor: 'Devam Ediyor',
  beklemede: 'Beklemede',
  incelemede: 'İncelemede',
  tamamlandi: 'Tamamlandı',
  iptal_edildi: 'İptal Edildi',
}

export const taskWorkflowColumns: ProjectManagementTaskStatus[] = [
  'yeni',
  'yapilacak',
  'devam_ediyor',
  'beklemede',
  'incelemede',
  'tamamlandi',
]

export const priorityLabels: Record<ProjectManagementPriority, string> = {
  dusuk: 'Düşük',
  normal: 'Normal',
  yuksek: 'Yüksek',
  kritik: 'Kritik',
  acil: 'Acil',
}

export const projectTypeLabels: Record<ProjectManagementProjectType, string> = {
  sirket_ici: 'Şirket içi proje',
  musteri_projesi: 'Müşteri projesi',
  urun_gelistirme: 'Ürün geliştirme projesi',
  satis_projesi: 'Satış projesi',
  satis_sonrasi_hizmet: 'Satış sonrası hizmet projesi',
  yazilim_gelistirme: 'Yazılım geliştirme projesi',
  kurulum: 'Kurulum projesi',
  bakim: 'Bakım projesi',
  kosgeb_tesvik: 'KOSGEB / teşvik projesi',
  danismanlik: 'Danışmanlık projesi',
  ihale_teklif: 'İhale / teklif projesi',
  diger: 'Diğer',
}

export const projectStatusLabels: Record<ProjectManagementProjectStatus, string> = {
  taslak: 'Taslak',
  planlandi: 'Planlandı',
  devam_ediyor: 'Devam Ediyor',
  riskli: 'Riskli',
  beklemede: 'Beklemede',
  tamamlandi: 'Tamamlandı',
  iptal_edildi: 'İptal Edildi',
  arsivlendi: 'Arşivlendi',
}

export const sprintStatusLabels: Record<ProjectManagementSprintStatus, string> = {
  planlandi: 'Planlandı',
  aktif: 'Aktif',
  tamamlandi: 'Tamamlandı',
  iptal_edildi: 'İptal Edildi',
}

export const relatedEntityOptions = [
  { value: 'company', label: 'Şirket' },
  { value: 'customer', label: 'Müşteri / cari' },
  { value: 'sales_opportunity', label: 'Satış fırsatı' },
  { value: 'sales_quote', label: 'Teklif' },
  { value: 'product_service_item', label: 'Ürün / hizmet kaydı' },
  { value: 'customer_asset', label: 'Müşterideki ürün' },
  { value: 'after_sales_record', label: 'Satış sonrası kayıt' },
  { value: 'contract', label: 'Sözleşme' },
  { value: 'document', label: 'Doküman' },
  { value: 'employee', label: 'Personel' },
]

export const taskTypeOptions = toOptions(taskTypeLabels)
export const taskStatusOptions = toOptions(taskStatusLabels)
export const priorityOptions = toOptions(priorityLabels)
export const projectTypeOptions = toOptions(projectTypeLabels)
export const projectStatusOptions = toOptions(projectStatusLabels)
export const sprintStatusOptions = toOptions(sprintStatusLabels)

export function getProjectManagementColumns(areaKey: ProjectManagementEditableAreaKey): ColumnDef[] {
  if (areaKey === 'gorevler') return getTaskColumns()
  if (areaKey === 'projeler') return getProjectColumns()
  if (areaKey === 'sprintler') return getSprintColumns()
  if (areaKey === 'zaman-takibi') return getTimeLogColumns()
  return getWorkflowColumns()
}

export function getProjectManagementHeroFields(areaKey: ProjectManagementEditableAreaKey): FormField[] {
  if (areaKey === 'gorevler') return getTaskHeroFields()
  if (areaKey === 'projeler') return getProjectHeroFields()
  if (areaKey === 'sprintler') return getSprintHeroFields()
  if (areaKey === 'zaman-takibi') return getTimeLogHeroFields()
  return getWorkflowHeroFields()
}

export function getProjectManagementTabs(areaKey: ProjectManagementEditableAreaKey): FormTab[] {
  if (areaKey === 'gorevler') return getTaskTabs()
  if (areaKey === 'projeler') return getProjectTabs()
  if (areaKey === 'sprintler') return getSprintTabs()
  if (areaKey === 'zaman-takibi') return getTimeLogTabs()
  return getWorkflowTabs()
}

export function decorateProjectManagementRecord(areaKey: ProjectManagementEditableAreaKey, record: ProjectManagementEditableRecord) {
  if (areaKey === 'gorevler') return decorateTask(record as ProjectManagementTask)
  if (areaKey === 'projeler') return decorateProject(record as ProjectManagementProject)
  if (areaKey === 'sprintler') return decorateSprint(record as ProjectManagementSprint)
  if (areaKey === 'zaman-takibi') return decorateTimeLog(record as ProjectManagementTimeLog)
  return decorateWorkflow(record as ProjectManagementWorkflow)
}

export function getProjectManagementRecordTitle(areaKey: ProjectManagementEditableAreaKey, record: ProjectManagementEditableRecord) {
  if (areaKey === 'gorevler') return (record as ProjectManagementTask).title
  if (areaKey === 'projeler') return (record as ProjectManagementProject).name
  if (areaKey === 'sprintler') return (record as ProjectManagementSprint).name
  if (areaKey === 'zaman-takibi') return `${(record as ProjectManagementTimeLog).task_no} zaman kaydı`
  return (record as ProjectManagementWorkflow).name
}

export function validateProjectManagementRecord(areaKey: ProjectManagementEditableAreaKey, data: Record<string, any>) {
  const fields = [
    ...getProjectManagementHeroFields(areaKey),
    ...getProjectManagementTabs(areaKey).flatMap(tab => tab.fields),
  ]
  return fields
    .filter(field => field.required)
    .filter(field => !hasValue(data[field.name]))
    .map(field => field.label)
}

export function isTaskOpen(task: ProjectManagementTask) {
  return !task.is_deleted && !['tamamlandi', 'iptal_edildi'].includes(task.status)
}

export function isTaskOverdue(task: ProjectManagementTask, now = new Date()) {
  if (!isTaskOpen(task) || !task.due_date) return false
  const due = new Date(task.due_date)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  return target < today
}

export function isTaskDueToday(task: ProjectManagementTask, now = new Date()) {
  if (!isTaskOpen(task) || !task.due_date) return false
  const due = new Date(task.due_date)
  if (Number.isNaN(due.getTime())) return false
  return due.getFullYear() === now.getFullYear()
    && due.getMonth() === now.getMonth()
    && due.getDate() === now.getDate()
}

export function getTaskHealth(task: ProjectManagementTask) {
  if (task.is_deleted || task.record_status === 'passive') return 'passive'
  if (isTaskOverdue(task) || task.priority === 'acil') return 'critical'
  if (task.priority === 'kritik' || isTaskDueToday(task) || task.blocker_count > 0) return 'warning'
  return 'ok'
}

export function getTaskHealthLabel(task: ProjectManagementTask) {
  const health = getTaskHealth(task)
  if (health === 'critical') return 'Kritik'
  if (health === 'warning') return 'Uyarı'
  if (health === 'passive') return 'Pasif'
  return 'Sağlıklı'
}

export function getProjectHealth(project: ProjectManagementProject) {
  if (project.is_deleted || project.record_status === 'passive' || project.status === 'arsivlendi') return 'passive'
  if (project.status === 'riskli' || project.overdue_task_count > 0) return 'warning'
  if (project.priority === 'acil' || project.priority === 'kritik') return 'warning'
  return 'ok'
}

export function formatProjectManagementDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR')
}

export function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, Number(minutes) || 0)
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  if (hours === 0) return `${mins} dk`
  if (mins === 0) return `${hours} sa`
  return `${hours} sa ${mins} dk`
}

function getTaskColumns(): ColumnDef[] {
  return [
    { key: 'task_no', label: 'Görev No', type: 'text', width: 130, sortable: true, filterable: true },
    { key: 'title', label: 'Başlık', type: 'text', width: 260, sortable: true, filterable: true },
    { key: 'task_type_label', label: 'Görev Tipi', type: 'badge', width: 150, sortable: true, filterable: true },
    { key: 'project_name', label: 'Proje', type: 'text', width: 190, sortable: true, filterable: true },
    { key: 'company_name', label: 'İlgili Şirket', type: 'text', width: 160, sortable: true, filterable: true },
    { key: 'customer_display_name', label: 'Müşteri / Cari', type: 'text', width: 190, sortable: true, filterable: true },
    { key: 'assignee_name', label: 'Sorumlu', type: 'text', width: 150, sortable: true, filterable: true },
    { key: 'reporter_name', label: 'Raporlayan', type: 'text', width: 150, sortable: true, filterable: true },
    { key: 'priority_label', label: 'Öncelik', type: 'badge', width: 110, sortable: true, filterable: true },
    { key: 'status_label', label: 'Durum', type: 'badge', width: 140, sortable: true, filterable: true },
    { key: 'start_date_display', label: 'Başlangıç', type: 'text', width: 120, sortable: true },
    { key: 'due_date_display', label: 'Son Tarih', type: 'text', width: 120, sortable: true },
    { key: 'delay_label', label: 'Gecikme', type: 'badge', width: 110, sortable: true, filterable: true },
    { key: 'tags_display', label: 'Etiketler', type: 'text', width: 180, filterable: true },
    { key: 'created_at_display', label: 'Oluşturulma', type: 'text', width: 130, sortable: true },
  ]
}

function getProjectColumns(): ColumnDef[] {
  return [
    { key: 'code', label: 'Proje Kodu', type: 'text', width: 140, sortable: true, filterable: true },
    { key: 'name', label: 'Proje Adı', type: 'text', width: 250, sortable: true, filterable: true },
    { key: 'project_type_label', label: 'Proje Tipi', type: 'badge', width: 190, sortable: true, filterable: true },
    { key: 'company_name', label: 'İlgili Şirket', type: 'text', width: 170, sortable: true, filterable: true },
    { key: 'customer_display_name', label: 'İlgili Müşteri', type: 'text', width: 190, sortable: true, filterable: true },
    { key: 'project_manager_name', label: 'Proje Yöneticisi', type: 'text', width: 170, sortable: true, filterable: true },
    { key: 'start_date_display', label: 'Başlangıç', type: 'text', width: 120, sortable: true },
    { key: 'target_end_date_display', label: 'Hedef Bitiş', type: 'text', width: 130, sortable: true },
    { key: 'status_label', label: 'Durum', type: 'badge', width: 130, sortable: true, filterable: true },
    { key: 'priority_label', label: 'Öncelik', type: 'badge', width: 110, sortable: true, filterable: true },
    { key: 'completion_display', label: 'Tamamlanma', type: 'text', width: 130, sortable: true },
    { key: 'open_task_count', label: 'Açık Görev', type: 'number', width: 110, sortable: true },
    { key: 'overdue_task_count', label: 'Geciken', type: 'number', width: 100, sortable: true },
  ]
}

function getSprintColumns(): ColumnDef[] {
  return [
    { key: 'name', label: 'Sprint Adı', type: 'text', width: 230, sortable: true, filterable: true },
    { key: 'project_name', label: 'Proje', type: 'text', width: 210, sortable: true, filterable: true },
    { key: 'start_date_display', label: 'Başlangıç', type: 'text', width: 120, sortable: true },
    { key: 'end_date_display', label: 'Bitiş', type: 'text', width: 120, sortable: true },
    { key: 'status_label', label: 'Durum', type: 'badge', width: 120, sortable: true, filterable: true },
    { key: 'progress_display', label: 'İlerleme', type: 'text', width: 120, sortable: true },
    { key: 'total_task_count', label: 'Toplam Görev', type: 'number', width: 130, sortable: true },
    { key: 'completed_task_count', label: 'Tamamlanan', type: 'number', width: 120, sortable: true },
    { key: 'open_task_count', label: 'Açık', type: 'number', width: 90, sortable: true },
    { key: 'overdue_task_count', label: 'Geciken', type: 'number', width: 100, sortable: true },
  ]
}

function getTimeLogColumns(): ColumnDef[] {
  return [
    { key: 'work_date_display', label: 'Tarih', type: 'text', width: 120, sortable: true },
    { key: 'user_name', label: 'Personel', type: 'text', width: 160, sortable: true, filterable: true },
    { key: 'project_name', label: 'Proje', type: 'text', width: 210, sortable: true, filterable: true },
    { key: 'task_no', label: 'Görev', type: 'text', width: 120, sortable: true, filterable: true },
    { key: 'task_title', label: 'Görev Başlığı', type: 'text', width: 240, sortable: true, filterable: true },
    { key: 'duration_display', label: 'Süre', type: 'text', width: 110, sortable: true },
    { key: 'billable_label', label: 'Faturalandırılır', type: 'badge', width: 150, sortable: true, filterable: true },
    { key: 'description', label: 'Açıklama', type: 'text', width: 240, filterable: true },
  ]
}

function getWorkflowColumns(): ColumnDef[] {
  return [
    { key: 'name', label: 'Workflow Adı', type: 'text', width: 230, sortable: true, filterable: true },
    { key: 'description', label: 'Açıklama', type: 'text', width: 260, filterable: true },
    { key: 'applicable_project_type_label', label: 'Geçerli Proje Tipi', type: 'badge', width: 190, sortable: true, filterable: true },
    { key: 'status_count', label: 'Durum', type: 'number', width: 90, sortable: true },
    { key: 'transition_count', label: 'Geçiş', type: 'number', width: 90, sortable: true },
    { key: 'initial_status_label', label: 'Başlangıç', type: 'badge', width: 130, sortable: true },
    { key: 'closing_status_label', label: 'Kapanış', type: 'badge', width: 120, sortable: true },
    { key: 'active_label', label: 'Aktif mi?', type: 'badge', width: 110, sortable: true, filterable: true },
    { key: 'requires_approval_count', label: 'Onaylı Geçiş', type: 'number', width: 130, sortable: true },
  ]
}

function getTaskHeroFields(): FormField[] {
  return [
    { name: 'task_no', label: 'Görev No', type: 'text' },
    { name: 'title', label: 'Görev başlığı', type: 'text', required: true, colSpan: 2 },
    { name: 'task_type', label: 'Görev tipi', type: 'select', required: true, options: taskTypeOptions },
    { name: 'status', label: 'Durum', type: 'select', required: true, options: taskStatusOptions },
    { name: 'priority', label: 'Öncelik', type: 'select', required: true, options: priorityOptions },
    { name: 'assignee_name', label: 'Sorumlu kişi', type: 'text', required: true },
    { name: 'company_name', label: 'İlgili şirket', type: 'text', required: true },
    { name: 'due_date', label: 'Son tarih', type: 'date' },
  ]
}

function getTaskTabs(): FormTab[] {
  return [
    {
      id: 'temel',
      label: 'Temel Bilgiler',
      fields: [
        { name: 'description', label: 'Açıklama', type: 'textarea', colSpan: 3 },
        { name: 'project_name', label: 'Proje', type: 'text' },
        { name: 'epic_name', label: 'İş paketi / Epic', type: 'text' },
        { name: 'parent_task_no', label: 'Üst görev', type: 'text' },
        { name: 'customer_display_name', label: 'İlgili müşteri / cari', type: 'text' },
        { name: 'reporter_name', label: 'Raporlayan kişi', type: 'text', required: true },
        { name: 'helper_names_text', label: 'Yardımcı kişiler', type: 'text', placeholder: 'Virgülle ayırın' },
      ],
    },
    {
      id: 'iliski',
      label: 'ERP İlişkisi',
      fields: [
        { name: 'related_entity_type', label: 'İlgili ERP kaydı tipi', type: 'select', options: relatedEntityOptions },
        { name: 'related_entity_id', label: 'İlgili ERP kaydı ID', type: 'text' },
        { name: 'related_entity_label', label: 'İlgili ERP kaydı', type: 'text', colSpan: 2 },
        { name: 'dependent_task_nos', label: 'Bağımlı görevler', type: 'text', placeholder: 'GV-2026-001, GV-2026-002' },
        { name: 'blocking_task_nos', label: 'Engelleyen görevler', type: 'text' },
        { name: 'link_summary', label: 'Görev ilişkileri', type: 'textarea', colSpan: 3 },
      ],
    },
    {
      id: 'tarihler',
      label: 'Tarih ve Süre',
      fields: [
        { name: 'start_date', label: 'Başlangıç tarihi', type: 'date' },
        { name: 'end_date', label: 'Bitiş tarihi', type: 'date' },
        { name: 'completed_at', label: 'Tamamlanma tarihi', type: 'date' },
        { name: 'estimated_hours', label: 'Tahmini süre', type: 'number' },
        { name: 'spent_hours', label: 'Harcanan süre', type: 'number' },
        { name: 'sprint_name', label: 'Sprint / dönem', type: 'text' },
      ],
    },
    {
      id: 'notlar',
      label: 'Notlar ve Dosyalar',
      fields: [
        { name: 'tags_text', label: 'Etiketler', type: 'text', placeholder: 'teklif, servis, kritik' },
        { name: 'attachments_json', label: 'Dosya ekleri', type: 'document', colSpan: 3 },
        { name: 'internal_notes', label: 'İç notlar', type: 'textarea', colSpan: 3 },
        { name: 'customer_visible_notes', label: 'Müşteriye gösterilecek notlar', type: 'textarea', colSpan: 3 },
        { name: 'activity_summary', label: 'Aktivite geçmişi', type: 'textarea', colSpan: 3 },
      ],
    },
  ]
}

function getProjectHeroFields(): FormField[] {
  return [
    { name: 'code', label: 'Proje kodu', type: 'text' },
    { name: 'name', label: 'Proje adı', type: 'text', required: true, colSpan: 2 },
    { name: 'project_type', label: 'Proje tipi', type: 'select', required: true, options: projectTypeOptions },
    { name: 'status', label: 'Durum', type: 'select', required: true, options: projectStatusOptions },
    { name: 'priority', label: 'Öncelik', type: 'select', required: true, options: priorityOptions },
    { name: 'project_manager_name', label: 'Proje yöneticisi', type: 'text', required: true },
    { name: 'company_name', label: 'İlgili şirket', type: 'text', required: true },
    { name: 'target_end_date', label: 'Hedef bitiş', type: 'date' },
  ]
}

function getProjectTabs(): FormTab[] {
  return [
    {
      id: 'genel',
      label: 'Genel Bilgiler',
      fields: [
        { name: 'description', label: 'Açıklama', type: 'textarea', colSpan: 3 },
        { name: 'customer_display_name', label: 'İlgili müşteri / cari', type: 'text' },
        { name: 'team_names_text', label: 'Proje ekibi', type: 'text', placeholder: 'Virgülle ayırın' },
        { name: 'start_date', label: 'Başlangıç tarihi', type: 'date' },
        { name: 'actual_end_date', label: 'Gerçek bitiş tarihi', type: 'date' },
        { name: 'completion_rate', label: 'Tamamlanma oranı', type: 'number' },
      ],
    },
    {
      id: 'butce',
      label: 'Bütçe ve Süre',
      fields: [
        { name: 'budget', label: 'Bütçe', type: 'number' },
        { name: 'currency', label: 'Para birimi', type: 'select', options: currencyOptions },
        { name: 'estimated_hours', label: 'Tahmini toplam süre', type: 'number' },
        { name: 'spent_hours', label: 'Harcanan toplam süre', type: 'number' },
        { name: 'open_task_count', label: 'Açık görev sayısı', type: 'number' },
        { name: 'overdue_task_count', label: 'Geciken görev sayısı', type: 'number' },
      ],
    },
    {
      id: 'kapsam',
      label: 'Hedefler ve Riskler',
      fields: [
        { name: 'goals', label: 'Proje hedefleri', type: 'textarea', colSpan: 3 },
        { name: 'scope', label: 'Proje kapsamı', type: 'textarea', colSpan: 3 },
        { name: 'risks', label: 'Riskler', type: 'textarea', colSpan: 3 },
        { name: 'attachments_json', label: 'Dosya ekleri', type: 'document', colSpan: 3 },
        { name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 },
      ],
    },
  ]
}

function getSprintHeroFields(): FormField[] {
  return [
    { name: 'name', label: 'Sprint adı', type: 'text', required: true, colSpan: 2 },
    { name: 'project_name', label: 'Proje', type: 'text' },
    { name: 'start_date', label: 'Başlangıç tarihi', type: 'date', required: true },
    { name: 'end_date', label: 'Bitiş tarihi', type: 'date', required: true },
    { name: 'status', label: 'Durum', type: 'select', required: true, options: sprintStatusOptions },
  ]
}

function getSprintTabs(): FormTab[] {
  return [
    {
      id: 'plan',
      label: 'Plan',
      fields: [
        { name: 'goal', label: 'Sprint hedefi', type: 'textarea', colSpan: 3 },
        { name: 'total_task_count', label: 'Toplam görev sayısı', type: 'number' },
        { name: 'completed_task_count', label: 'Tamamlanan görev sayısı', type: 'number' },
        { name: 'open_task_count', label: 'Açık görev sayısı', type: 'number' },
        { name: 'overdue_task_count', label: 'Geciken görev sayısı', type: 'number' },
      ],
    },
    {
      id: 'kapanis',
      label: 'Kapanış',
      fields: [
        { name: 'close_policy', label: 'Açık görev taşıma politikası', type: 'select', options: [
          { value: 'backlog', label: "Backlog'a taşı" },
          { value: 'next_sprint', label: "Yeni sprint'e taşı" },
          { value: 'keep', label: 'Sprint içinde bırak' },
        ] },
        { name: 'report_summary', label: 'Sprint raporu', type: 'textarea', colSpan: 3 },
      ],
    },
  ]
}

function getTimeLogHeroFields(): FormField[] {
  return [
    { name: 'task_no', label: 'Görev', type: 'text', required: true },
    { name: 'task_title', label: 'Görev başlığı', type: 'text', required: true, colSpan: 2 },
    { name: 'project_name', label: 'Proje', type: 'text' },
    { name: 'user_name', label: 'Personel', type: 'text', required: true },
    { name: 'work_date', label: 'Tarih', type: 'date', required: true },
    { name: 'duration_minutes', label: 'Süre (dk)', type: 'number', required: true },
  ]
}

function getTimeLogTabs(): FormTab[] {
  return [
    {
      id: 'detay',
      label: 'Detay',
      fields: [
        { name: 'start_time', label: 'Başlangıç saati', type: 'text', placeholder: '09:00' },
        { name: 'end_time', label: 'Bitiş saati', type: 'text', placeholder: '11:30' },
        { name: 'is_billable', label: 'Faturalandırılabilir mi?', type: 'checkbox' },
        { name: 'is_customer_visible', label: 'Müşteriye gösterilsin mi?', type: 'checkbox' },
        { name: 'description', label: 'Açıklama', type: 'textarea', colSpan: 3 },
      ],
    },
  ]
}

function getWorkflowHeroFields(): FormField[] {
  return [
    { name: 'name', label: 'Workflow adı', type: 'text', required: true, colSpan: 2 },
    { name: 'applicable_project_type', label: 'Geçerli proje tipi', type: 'select', options: [{ value: 'all', label: 'Tüm proje tipleri' }, ...projectTypeOptions] },
    { name: 'initial_status', label: 'Varsayılan başlangıç', type: 'select', required: true, options: taskStatusOptions },
    { name: 'closing_status', label: 'Varsayılan kapanış', type: 'select', required: true, options: taskStatusOptions },
    { name: 'is_active', label: 'Aktif mi?', type: 'checkbox' },
  ]
}

function getWorkflowTabs(): FormTab[] {
  return [
    {
      id: 'durumlar',
      label: 'Durumlar',
      fields: [
        { name: 'description', label: 'Açıklama', type: 'textarea', colSpan: 3 },
        { name: 'statuses_text', label: 'Durumlar', type: 'textarea', colSpan: 3 },
        { name: 'transitions_text', label: 'Geçişler', type: 'textarea', colSpan: 3 },
      ],
    },
    {
      id: 'kurallar',
      label: 'Geçiş Kuralları',
      fields: [
        { name: 'allowed_roles_text', label: 'Bu geçişi kim yapabilir?', type: 'text' },
        { name: 'requires_approval_count', label: 'Onay gerektiren geçiş sayısı', type: 'number' },
        { name: 'rule_summary', label: 'Zorunlu açıklama / dosya / kapanış notu', type: 'textarea', colSpan: 3 },
      ],
    },
  ]
}

export function decorateTask(task: ProjectManagementTask) {
  return {
    ...task,
    task_type_label: taskTypeLabels[task.task_type] || task.task_type,
    status_label: taskStatusLabels[task.status] || task.status,
    priority_label: priorityLabels[task.priority] || task.priority,
    start_date_display: formatProjectManagementDate(task.start_date),
    due_date_display: formatProjectManagementDate(task.due_date),
    created_at_display: formatProjectManagementDate(task.created_at),
    delay_label: isTaskOverdue(task) ? 'Gecikti' : isTaskDueToday(task) ? 'Bugün' : 'Zamanında',
    health_label: getTaskHealthLabel(task),
    tags_display: task.tags.join(', '),
    helper_names_text: task.helper_names?.join(', ') || '',
    tags_text: task.tags.join(', '),
    link_summary: task.links?.map(link => `${link.target_task_no} - ${link.target_title}`).join('\n') || '',
    activity_summary: task.history?.map(item => `${formatProjectManagementDate(item.created_at)}: ${item.note || item.event_type}`).join('\n') || '',
  }
}

export function decorateProject(project: ProjectManagementProject) {
  return {
    ...project,
    project_type_label: projectTypeLabels[project.project_type] || project.project_type,
    status_label: projectStatusLabels[project.status] || project.status,
    priority_label: priorityLabels[project.priority] || project.priority,
    start_date_display: formatProjectManagementDate(project.start_date),
    target_end_date_display: formatProjectManagementDate(project.target_end_date),
    completion_display: `%${project.completion_rate}`,
    team_names_text: project.team_names.join(', '),
  }
}

export function decorateSprint(sprint: ProjectManagementSprint) {
  const progress = sprint.total_task_count > 0
    ? Math.round((sprint.completed_task_count / sprint.total_task_count) * 100)
    : 0
  return {
    ...sprint,
    status_label: sprintStatusLabels[sprint.status] || sprint.status,
    start_date_display: formatProjectManagementDate(sprint.start_date),
    end_date_display: formatProjectManagementDate(sprint.end_date),
    progress_display: `%${progress}`,
  }
}

export function decorateTimeLog(log: ProjectManagementTimeLog) {
  return {
    ...log,
    work_date_display: formatProjectManagementDate(log.work_date),
    duration_display: formatDuration(log.duration_minutes),
    billable_label: log.is_billable ? 'Evet' : 'Hayır',
  }
}

export function decorateWorkflow(workflow: ProjectManagementWorkflow) {
  return {
    ...workflow,
    applicable_project_type_label: workflow.applicable_project_type === 'all' || !workflow.applicable_project_type
      ? 'Tüm proje tipleri'
      : projectTypeLabels[workflow.applicable_project_type],
    status_count: workflow.statuses.length,
    transition_count: workflow.transitions.length,
    initial_status_label: taskStatusLabels[workflow.initial_status],
    closing_status_label: taskStatusLabels[workflow.closing_status],
    active_label: workflow.is_active ? 'Aktif' : 'Pasif',
    statuses_text: workflow.statuses.map(status => taskStatusLabels[status]).join('\n'),
    transitions_text: workflow.transitions.map(transition => `${taskStatusLabels[transition.from_status]} -> ${taskStatusLabels[transition.to_status]}`).join('\n'),
    allowed_roles_text: Array.from(new Set(workflow.transitions.flatMap(transition => transition.allowed_roles))).join(', '),
    rule_summary: workflow.transitions
      .filter(transition => transition.require_description || transition.require_attachment || transition.require_approval || transition.require_closing_note)
      .map(transition => `${taskStatusLabels[transition.from_status]} -> ${taskStatusLabels[transition.to_status]}: ${[
        transition.require_description ? 'açıklama' : '',
        transition.require_attachment ? 'dosya' : '',
        transition.require_approval ? 'onay' : '',
        transition.require_closing_note ? 'kapanış notu' : '',
      ].filter(Boolean).join(', ')}`)
      .join('\n'),
  }
}

export function normalizeProjectManagementRecord(areaKey: ProjectManagementEditableAreaKey, record: ProjectManagementEditableRecord): ProjectManagementEditableRecord {
  if (areaKey === 'gorevler') {
    const task = record as ProjectManagementTask & Record<string, any>
    return {
      ...task,
      helper_names: splitList(task.helper_names_text) || task.helper_names || [],
      tags: splitList(task.tags_text) || task.tags || [],
      estimated_hours: numberOrNull(task.estimated_hours),
      spent_hours: numberOrNull(task.spent_hours),
      comment_count: Number(task.comment_count || 0),
      attachment_count: Number(task.attachment_count || 0),
      subtask_count: Number(task.subtask_count || 0),
      blocker_count: Number(task.blocker_count || 0),
    }
  }

  if (areaKey === 'projeler') {
    const project = record as ProjectManagementProject & Record<string, any>
    return {
      ...project,
      team_names: splitList(project.team_names_text) || project.team_names || [],
      completion_rate: clamp(Number(project.completion_rate || 0), 0, 100),
      open_task_count: Number(project.open_task_count || 0),
      overdue_task_count: Number(project.overdue_task_count || 0),
      estimated_hours: numberOrNull(project.estimated_hours),
      spent_hours: numberOrNull(project.spent_hours),
      budget: numberOrNull(project.budget),
    }
  }

  if (areaKey === 'sprintler') {
    const sprint = record as ProjectManagementSprint
    return {
      ...sprint,
      total_task_count: Number(sprint.total_task_count || 0),
      completed_task_count: Number(sprint.completed_task_count || 0),
      open_task_count: Number(sprint.open_task_count || 0),
      overdue_task_count: Number(sprint.overdue_task_count || 0),
    }
  }

  if (areaKey === 'zaman-takibi') {
    const log = record as ProjectManagementTimeLog
    return {
      ...log,
      duration_minutes: Number(log.duration_minutes || 0),
      is_billable: Boolean(log.is_billable),
      is_customer_visible: Boolean(log.is_customer_visible),
    }
  }

  return record
}

function toOptions<T extends string>(labels: Record<T, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label: String(label) }))
}

function hasValue(value: unknown) {
  if (typeof value === 'boolean') return true
  if (typeof value === 'number') return !Number.isNaN(value)
  if (Array.isArray(value)) return value.length > 0
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function splitList(value: unknown) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
  if (!value) return []
  return String(value).split(',').map(item => item.trim()).filter(Boolean)
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

const currencyOptions = [
  { value: 'TRY', label: 'TRY' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
]
