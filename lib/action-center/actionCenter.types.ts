import type { SupabaseClient } from '@supabase/supabase-js'

export type ActionCenterSourceType =
  | 'process_task'
  | 'approval'
  | 'operation'
  | 'outbox'
  | 'projection'
  | 'integrity_warning'
  | 'module_readiness'
  | 'notification'
  | 'system'

export type ActionCenterItemStatus =
  | 'open'
  | 'in_progress'
  | 'waiting'
  | 'failed'
  | 'completed'
  | 'dismissed'

export type ActionCenterSeverity = 'info' | 'warning' | 'error' | 'critical'
export type ActionCenterPriority = 'low' | 'normal' | 'high' | 'urgent'

export type ActionCenterSuggestedAction = {
  label: string
  action_type: 'navigate' | 'open_record' | 'open_process' | 'open_wizard' | 'retry' | 'dismiss'
  target_page?: string
  record_id?: string
  process_instance_id?: string
  operation_id?: string
  disabled?: boolean
  disabled_reason?: string
}

export type UnifiedActionItem = {
  id: string
  tenant_id: string
  company_id?: string | null
  branch_id?: string | null
  module_key: string
  source_type: ActionCenterSourceType
  source_id: string
  title: string
  description?: string
  status: ActionCenterItemStatus
  severity: ActionCenterSeverity
  priority: ActionCenterPriority
  action_key?: string | null
  process_instance_id?: string | null
  task_id?: string | null
  approval_id?: string | null
  operation_id?: string | null
  outbox_event_id?: string | null
  entity_type?: string | null
  entity_id?: string | null
  record_label?: string | null
  due_at?: string | null
  created_at: string
  updated_at?: string | null
  target_page?: string | null
  suggested_actions?: ActionCenterSuggestedAction[]
}

export type ActionCenterSummary = {
  total_open: number
  urgent_count: number
  approval_count: number
  task_count: number
  failed_operation_count: number
  system_warning_count: number
  by_module: Record<string, number>
  by_severity: Record<string, number>
}

export type ActionCenterQuery = {
  module_key?: string | null
  source_type?: ActionCenterSourceType | null
  status?: ActionCenterItemStatus | null
  severity?: ActionCenterSeverity | null
  priority?: ActionCenterPriority | null
  company_id?: string | null
  branch_id?: string | null
  entity_type?: string | null
  entity_id?: string | null
  assigned_to_me?: boolean
  page?: number
  pageSize?: number
}

export type ActionCenterContext = {
  supabase: SupabaseClient
  tenantId: string
  userId: string | null
  permissions: string[]
  scopedCompanyIds: string[]
  isSystemUser: boolean
}

export type ActionCenterListResult = {
  data: UnifiedActionItem[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: ActionCenterSummary
  warnings?: string[]
}
