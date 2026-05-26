import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditActionType =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'hard_delete'
  | 'soft_delete'
  | 'restore'
  | 'operation_start'
  | 'operation_complete'
  | 'operation_fail'
  | 'process_start'
  | 'process_step_complete'
  | 'process_approve'
  | 'process_reject'
  | 'process_cancel'
  | 'permission_denied'
  | 'policy_denied'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'document_upload'
  | 'document_delete'
  | 'document_version_update'
  | 'system_event'

export type AuditResultStatus = 'success' | 'failed' | 'denied' | 'pending'
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface AuditContext {
  tenantId?: string | null
  companyId?: string | null
  branchId?: string | null
  moduleKey?: string | null
  entityType?: string | null
  entityId?: string | null
  userId?: string | null
  userLabel?: string | null
  operationId?: string | null
  processInstanceId?: string | null
  taskId?: string | null
  approvalId?: string | null
  outboxEventId?: string | null
  requestId?: string | null
  sessionId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  permissionKey?: string | null
  policyKey?: string | null
}

export interface AuditLogRecord {
  id: string
  tenant_id: string
  company_id?: string | null
  branch_id?: string | null
  module_key?: string | null
  entity_type?: string | null
  entity_id?: string | null
  action_type: AuditActionType
  action_key?: string | null
  operation_id?: string | null
  process_instance_id?: string | null
  task_id?: string | null
  approval_id?: string | null
  outbox_event_id?: string | null
  user_id?: string | null
  user_label?: string | null
  permission_key?: string | null
  policy_key?: string | null
  request_id?: string | null
  session_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  old_values?: Record<string, any> | null
  new_values?: Record<string, any> | null
  changed_fields?: string[]
  summary?: string | null
  reason?: string | null
  result_status: AuditResultStatus
  severity: AuditSeverity
  metadata_json?: Record<string, any>
  created_at: string
}

export interface RecordAuditInput {
  context: AuditContext
  actionType: AuditActionType
  actionKey?: string | null
  oldValues?: Record<string, any> | null
  newValues?: Record<string, any> | null
  changedFields?: string[]
  summary?: string | null
  reason?: string | null
  resultStatus?: AuditResultStatus
  severity?: AuditSeverity
  metadata?: Record<string, any>
}

export interface AuditQuery {
  tenantId: string
  entityType?: string | null
  entityId?: string | null
  companyId?: string | null
  branchId?: string | null
  moduleKey?: string | null
  actionType?: string | null
  userId?: string | null
  operationId?: string | null
  processInstanceId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  page?: number
  pageSize?: number
}

export interface AuditWriteResult {
  ok: boolean
  id?: string
  code?: string
  error?: string
}

export type AuditSupabase = SupabaseClient<any, any, any>
