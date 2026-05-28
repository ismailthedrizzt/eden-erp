import { tenantRequestHeaders } from '@/lib/tenancy/client'

export type ProcessStatus = 'draft' | 'active' | 'waiting_approval' | 'completed' | 'cancelled' | 'failed' | string
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'overdue' | string
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | string

export type ProcessRecord = {
  id: string
  company_id?: string | null
  module_key?: string | null
  process_key?: string | null
  entity_type?: string | null
  entity_id?: string | null
  operation_key?: string | null
  operation_id?: string | null
  status?: ProcessStatus
  current_step_key?: string | null
  started_by?: string | null
  started_at?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  warnings?: string[]
  payload_json?: Record<string, any>
  result_json?: Record<string, any>
}

export type ProcessTaskRecord = {
  id: string
  process_instance_id?: string | null
  company_id?: string | null
  module_key?: string | null
  entity_type?: string | null
  entity_id?: string | null
  step_key?: string | null
  title?: string | null
  description?: string | null
  status?: TaskStatus
  assigned_to?: string | null
  assigned_role?: string | null
  assigned_permission?: string | null
  due_at?: string | null
  completed_by?: string | null
  completed_at?: string | null
  payload_json?: Record<string, any>
  result_json?: Record<string, any>
  created_at?: string | null
  updated_at?: string | null
}

export type ProcessApprovalRecord = {
  id: string
  process_instance_id?: string | null
  task_id?: string | null
  company_id?: string | null
  module_key?: string | null
  approval_type?: string | null
  status?: ApprovalStatus
  requested_by?: string | null
  approver_id?: string | null
  approver_role?: string | null
  approver_permission?: string | null
  decision_note?: string | null
  requested_at?: string | null
  decided_at?: string | null
  payload_json?: Record<string, any>
  created_at?: string | null
  updated_at?: string | null
}

export type ProcessEventRecord = {
  id: string
  process_instance_id?: string | null
  module_key?: string | null
  event_type?: string | null
  step_key?: string | null
  old_status?: string | null
  new_status?: string | null
  payload_json?: Record<string, any>
  created_by?: string | null
  created_at?: string | null
}

export type ProcessDetail = {
  process: ProcessRecord
  tasks: ProcessTaskRecord[]
  approvals: ProcessApprovalRecord[]
  events: ProcessEventRecord[]
}

export async function listProcesses(params: URLSearchParams = new URLSearchParams()) {
  const payload = await requestJson(`/api/processes?${params.toString()}`)
  const root = payload?.data ?? payload
  return {
    data: Array.isArray(root) ? root as ProcessRecord[] : Array.isArray(root?.data) ? root.data as ProcessRecord[] : [],
    meta: payload?.meta ?? root?.meta ?? {},
    warning: payload?.warning ?? root?.warning ?? null,
  }
}

export async function getProcessDetail(processId: string): Promise<ProcessDetail> {
  const payload = await requestJson(`/api/processes/${processId}`)
  const root = payload?.data ?? payload
  const process = root?.process ?? root
  return {
    process,
    tasks: Array.isArray(root?.tasks) ? root.tasks : [],
    approvals: Array.isArray(root?.approvals) ? root.approvals : [],
    events: Array.isArray(root?.events) ? root.events : [],
  }
}

export async function listTasks(params: URLSearchParams = new URLSearchParams()) {
  const payload = await requestJson(`/api/tasks?${params.toString()}`)
  const root = payload?.data ?? payload
  return {
    data: Array.isArray(root) ? root as ProcessTaskRecord[] : Array.isArray(root?.data) ? root.data as ProcessTaskRecord[] : [],
    meta: payload?.meta ?? root?.meta ?? {},
    warning: payload?.warning ?? root?.warning ?? null,
  }
}

export async function listApprovals(params: URLSearchParams = new URLSearchParams()) {
  const payload = await requestJson(`/api/approvals?${params.toString()}`)
  const root = payload?.data ?? payload
  return {
    data: Array.isArray(root) ? root as ProcessApprovalRecord[] : Array.isArray(root?.data) ? root.data as ProcessApprovalRecord[] : [],
    meta: payload?.meta ?? root?.meta ?? {},
    warning: payload?.warning ?? root?.warning ?? null,
  }
}

export async function completeTask(taskId: string, result: Record<string, any> = {}) {
  return mutate(`/api/tasks/${taskId}/complete`, { result_json: result, result })
}

export async function assignTask(taskId: string, input: Record<string, any>) {
  return mutate(`/api/tasks/${taskId}/assign`, input)
}

export async function addTaskComment(taskId: string, comment: string) {
  return mutate(`/api/tasks/${taskId}/comment`, { comment, note: comment })
}

export async function approveApproval(approvalId: string, decisionNote?: string) {
  return mutate(`/api/approvals/${approvalId}/approve`, { decision_note: decisionNote || null, note: decisionNote || null })
}

export async function rejectApproval(approvalId: string, decisionNote: string) {
  return mutate(`/api/approvals/${approvalId}/reject`, { decision_note: decisionNote, note: decisionNote })
}

export async function cancelProcess(processId: string, reason?: string) {
  return mutate(`/api/processes/${processId}/cancel`, { reason: reason || null })
}

async function mutate(path: string, body: Record<string, any>) {
  return requestJson(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function requestJson(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      ...tenantRequestHeaders(),
      ...(init.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Surec merkezi istegi tamamlanamadi.')
  }
  return payload
}
