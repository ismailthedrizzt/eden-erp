export type ProjectManagementAreaKey =
  | 'gorevler'
  | 'projeler'
  | 'kanban-board'
  | 'backlog'
  | 'sprintler'
  | 'takvim'
  | 'zaman-takibi'
  | 'is-akislari'
  | 'raporlar'

export type ProjectManagementEditableAreaKey =
  | 'gorevler'
  | 'projeler'
  | 'sprintler'
  | 'zaman-takibi'
  | 'is-akislari'

export type ProjectManagementTaskType =
  | 'gorev'
  | 'alt_gorev'
  | 'is_paketi'
  | 'hata_problem'
  | 'talep'
  | 'servis_gorevi'
  | 'satis_takip_gorevi'
  | 'dokuman_takip_gorevi'
  | 'onay_gorevi'
  | 'toplanti_aksiyonu'
  | 'risk'
  | 'karar'
  | 'hatirlatma'

export type ProjectManagementTaskStatus =
  | 'yeni'
  | 'yapilacak'
  | 'devam_ediyor'
  | 'beklemede'
  | 'incelemede'
  | 'tamamlandi'
  | 'iptal_edildi'

export type ProjectManagementPriority = 'dusuk' | 'normal' | 'yuksek' | 'kritik' | 'acil'

export type ProjectManagementProjectType =
  | 'sirket_ici'
  | 'musteri_projesi'
  | 'urun_gelistirme'
  | 'satis_projesi'
  | 'satis_sonrasi_hizmet'
  | 'yazilim_gelistirme'
  | 'kurulum'
  | 'bakim'
  | 'kosgeb_tesvik'
  | 'danismanlik'
  | 'ihale_teklif'
  | 'diger'

export type ProjectManagementProjectStatus =
  | 'taslak'
  | 'planlandi'
  | 'devam_ediyor'
  | 'riskli'
  | 'beklemede'
  | 'tamamlandi'
  | 'iptal_edildi'
  | 'arsivlendi'

export type ProjectManagementSprintStatus = 'planlandi' | 'aktif' | 'tamamlandi' | 'iptal_edildi'

export type ProjectManagementRelatedEntityType =
  | 'company'
  | 'customer'
  | 'sales_opportunity'
  | 'sales_quote'
  | 'product_service_item'
  | 'customer_asset'
  | 'after_sales_record'
  | 'contract'
  | 'document'
  | 'employee'

export type ProjectManagementTaskLinkType =
  | 'blocked_by'
  | 'blocks'
  | 'related'
  | 'duplicate'
  | 'subtask'
  | 'parent'
  | 'same_customer_work'
  | 'same_service_process'
  | 'same_sales_process'

export interface ProjectManagementAreaConfig {
  key: ProjectManagementAreaKey
  title: string
  singularTitle: string
  shortTitle: string
  description: string
  href: string
  emptyText: string
}

export interface ProjectManagementBaseRecord {
  id: string
  company_id?: string | null
  company_name?: string | null
  record_status?: 'active' | 'passive'
  is_deleted: boolean
  deleted_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface ProjectManagementTask extends ProjectManagementBaseRecord {
  project_id?: string | null
  project_code?: string | null
  project_name?: string | null
  parent_task_id?: string | null
  parent_task_no?: string | null
  epic_name?: string | null
  task_no: string
  title: string
  description?: string | null
  task_type: ProjectManagementTaskType
  status: ProjectManagementTaskStatus
  priority: ProjectManagementPriority
  assignee_id?: string | null
  assignee_name?: string | null
  assignee_avatar?: string | null
  helper_names?: string[]
  reporter_id?: string | null
  reporter_name?: string | null
  customer_id?: string | null
  customer_display_name?: string | null
  related_entity_type?: ProjectManagementRelatedEntityType | string | null
  related_entity_id?: string | null
  related_entity_label?: string | null
  start_date?: string | null
  end_date?: string | null
  due_date?: string | null
  completed_at?: string | null
  estimated_hours?: number | null
  spent_hours?: number | null
  sprint_id?: string | null
  sprint_name?: string | null
  backlog_order?: number | null
  board_order?: number | null
  tags: string[]
  comment_count: number
  attachment_count: number
  subtask_count: number
  blocker_count: number
  internal_notes?: string | null
  customer_visible_notes?: string | null
  links?: ProjectManagementTaskLink[]
  history?: ProjectManagementTaskHistory[]
}

export interface ProjectManagementProject extends ProjectManagementBaseRecord {
  customer_id?: string | null
  customer_display_name?: string | null
  code: string
  name: string
  description?: string | null
  project_type: ProjectManagementProjectType
  project_manager_id?: string | null
  project_manager_name?: string | null
  team_names: string[]
  status: ProjectManagementProjectStatus
  priority: ProjectManagementPriority
  start_date?: string | null
  target_end_date?: string | null
  actual_end_date?: string | null
  budget?: number | null
  currency?: string | null
  estimated_hours?: number | null
  spent_hours?: number | null
  completion_rate: number
  open_task_count: number
  overdue_task_count: number
  goals?: string | null
  scope?: string | null
  risks?: string | null
  notes?: string | null
  attachments_json?: unknown[]
}

export interface ProjectManagementSprint extends ProjectManagementBaseRecord {
  project_id?: string | null
  project_name?: string | null
  name: string
  goal?: string | null
  start_date: string
  end_date: string
  status: ProjectManagementSprintStatus
  total_task_count: number
  completed_task_count: number
  open_task_count: number
  overdue_task_count: number
}

export interface ProjectManagementTimeLog extends ProjectManagementBaseRecord {
  task_id: string
  task_no: string
  task_title: string
  project_id?: string | null
  project_name?: string | null
  user_id: string
  user_name: string
  work_date: string
  start_time?: string | null
  end_time?: string | null
  duration_minutes: number
  description?: string | null
  is_billable: boolean
  is_customer_visible: boolean
}

export interface ProjectManagementWorkflow extends ProjectManagementBaseRecord {
  name: string
  description?: string | null
  applicable_project_type?: ProjectManagementProjectType | 'all' | null
  statuses: ProjectManagementTaskStatus[]
  transitions: ProjectManagementWorkflowTransition[]
  initial_status: ProjectManagementTaskStatus
  closing_status: ProjectManagementTaskStatus
  is_active: boolean
  requires_approval_count: number
}

export interface ProjectManagementWorkflowTransition {
  id: string
  from_status: ProjectManagementTaskStatus
  to_status: ProjectManagementTaskStatus
  allowed_roles: string[]
  require_description?: boolean
  require_attachment?: boolean
  require_approval?: boolean
  require_closing_note?: boolean
}

export interface ProjectManagementTaskComment {
  id: string
  task_id: string
  user_id: string
  user_name: string
  comment: string
  is_internal: boolean
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface ProjectManagementTaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_url: string
  file_type?: string | null
  uploaded_by?: string | null
  created_at: string
  deleted_at?: string | null
}

export interface ProjectManagementTaskLink {
  id: string
  source_task_id: string
  target_task_id: string
  target_task_no: string
  target_title: string
  link_type: ProjectManagementTaskLinkType
  created_by?: string | null
  created_at: string
}

export interface ProjectManagementTaskHistory {
  id: string
  task_id: string
  event_type: string
  from_value?: string | null
  to_value?: string | null
  actor_name?: string | null
  note?: string | null
  created_at: string
}

export type ProjectManagementEditableRecord =
  | ProjectManagementTask
  | ProjectManagementProject
  | ProjectManagementSprint
  | ProjectManagementTimeLog
  | ProjectManagementWorkflow

export interface ProjectManagementDashboardSummary {
  area: ProjectManagementAreaConfig
  totalCount: number
  openCount: number
  warningCount: number
}

export interface ProjectManagementCalendarEvent {
  id: string
  title: string
  date: string
  end_date?: string | null
  kind: 'task_due' | 'project_start' | 'project_end' | 'sprint_start' | 'sprint_end' | 'service' | 'license' | 'warranty' | 'meeting_action'
  priority?: ProjectManagementPriority
  status?: string
  project_name?: string | null
  company_name?: string | null
  customer_display_name?: string | null
  assignee_name?: string | null
}
