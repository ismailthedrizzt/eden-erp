import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantContext } from '@/lib/tenancy/server'

export type ProcessStepType = 'form' | 'review' | 'approval' | 'operation' | 'notification' | 'system'
export type ProcessInstanceStatus = 'draft' | 'active' | 'waiting_approval' | 'completed' | 'cancelled' | 'failed'
export type ProcessTaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
export type ProcessApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ProcessAssigneeStrategy = 'initiator' | 'role' | 'permission' | 'manager' | 'manual' | 'system'

export type ProcessDefinition = {
  key: string
  version: string
  moduleKey: string
  name: string
  description?: string
  entityType: string
  operationKey?: string
  startPermission?: string
  fallbackPermission?: string
  requiredModules?: string[]
  steps: ProcessStepDefinition[]
  transitions: ProcessTransitionDefinition[]
  cancelPolicy?: ProcessCancelPolicy
}

export type ProcessStepDefinition = {
  key: string
  name: string
  description?: string
  type: ProcessStepType
  required: boolean
  order: number
  assigneeStrategy?: ProcessAssigneeStrategy
  assigneeRole?: string
  assigneePermission?: string
  dueInHours?: number
  requiredFields?: string[]
  requiredDocuments?: string[]
  guardKey?: string
  operationKey?: string
  nextOnComplete?: string
}

export type ProcessTransitionDefinition = {
  from: string
  to: string
  action: string
  label: string
  guardKey?: string
  permission?: string
}

export type ProcessCancelPolicy = {
  allowedStatuses?: ProcessInstanceStatus[]
  permission?: string
  fallbackPermission?: string
}

export type ProcessInstance = {
  id: string
  tenant_id: string
  company_id?: string | null
  module_key: string
  process_key: string
  process_version: string
  entity_type: string
  entity_id?: string | null
  operation_key?: string | null
  operation_id?: string | null
  status: ProcessInstanceStatus
  current_step_key?: string | null
  payload_json: Record<string, any>
  result_json: Record<string, any>
  warnings: unknown[]
  started_by?: string | null
  completed_by?: string | null
  started_at?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  created_at: string
  updated_at: string
  version: number
  is_deleted: boolean
}

export type ProcessTask = {
  id: string
  tenant_id: string
  process_instance_id: string
  company_id?: string | null
  module_key: string
  entity_type?: string | null
  entity_id?: string | null
  step_key: string
  title: string
  description?: string | null
  status: ProcessTaskStatus
  assigned_to?: string | null
  assigned_role?: string | null
  assigned_permission?: string | null
  due_at?: string | null
  completed_by?: string | null
  completed_at?: string | null
  payload_json: Record<string, any>
  result_json: Record<string, any>
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export type ProcessApproval = {
  id: string
  tenant_id: string
  process_instance_id: string
  task_id?: string | null
  company_id?: string | null
  module_key: string
  approval_type: string
  status: ProcessApprovalStatus
  requested_by?: string | null
  approver_id?: string | null
  approver_role?: string | null
  approver_permission?: string | null
  decision_note?: string | null
  requested_at: string
  decided_at?: string | null
  payload_json: Record<string, any>
  created_at: string
  updated_at: string
}

export type ProcessEventType =
  | 'process.started'
  | 'process.step_completed'
  | 'process.task_created'
  | 'process.approval_requested'
  | 'process.approved'
  | 'process.rejected'
  | 'process.completed'
  | 'process.cancelled'
  | 'process.failed'

export type ProcessStartInput = {
  processKey: string
  moduleKey?: string
  companyId?: string | null
  entityType?: string
  entityId?: string | null
  operationKey?: string | null
  payload?: Record<string, any>
  startedBy?: string | null
  tenantContext: TenantContext
  request?: NextRequest
  autoRun?: boolean
}

export type ProcessEngineContext = {
  supabase: SupabaseClient
  request?: NextRequest
  tenantContext: TenantContext
  userId?: string | null
}

export type ProcessEngineResult<TData = any> = {
  ok: boolean
  status: number
  data?: TData
  error?: string
  code?: string
  details?: any
  warnings?: string[]
}
