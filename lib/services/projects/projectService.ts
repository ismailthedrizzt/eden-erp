'use client'

import type { ListMeta } from '@/lib/api/listEndpoint'

export type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown> | null
  message?: string | null
  warnings?: string[]
}

export type ProjectListResponse<T> = {
  data: T[]
  meta: ListMeta
}

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type ProjectType = 'internal' | 'customer' | 'implementation' | 'support' | 'rnd' | 'maintenance' | 'other'
export type ProjectPriority = 'lowest' | 'low' | 'medium' | 'high' | 'highest' | 'urgent'
export type IssueType = 'task' | 'bug' | 'improvement' | 'support' | 'incident' | 'research' | 'documentation' | 'checklist'
export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled'

export type ProjectRecord = {
  id: string
  tenant_id?: string
  company_id: string
  branch_id?: string | null
  organization_unit_id?: string | null
  facility_id?: string | null
  project_key: string
  project_name: string
  project_type: ProjectType | string
  description?: string | null
  project_owner_id?: string | null
  project_manager_id?: string | null
  start_date?: string | null
  target_end_date?: string | null
  actual_end_date?: string | null
  status: ProjectStatus | string
  priority: ProjectPriority | string
  progress_percent?: number | string | null
  budget_amount?: number | string | null
  currency?: string | null
  tags?: string[]
  total_tasks?: number
  open_tasks?: number
  done_tasks?: number
  overdue_tasks?: number
  created_at?: string
  updated_at?: string
  version?: number
}

export type ProjectTaskRecord = {
  id: string
  tenant_id?: string
  company_id: string
  project_id?: string | null
  branch_id?: string | null
  organization_unit_id?: string | null
  facility_id?: string | null
  issue_key: string
  title: string
  description?: string | null
  issue_type: IssueType | string
  status: IssueStatus | string
  priority: ProjectPriority | string
  assignee_user_id?: string | null
  assignee_employee_id?: string | null
  reporter_user_id?: string | null
  due_date?: string | null
  start_date?: string | null
  completed_at?: string | null
  estimated_hours?: number | string | null
  spent_hours?: number | string | null
  labels?: string[]
  related_module?: string | null
  related_entity_type?: string | null
  related_entity_id?: string | null
  parent_task_id?: string | null
  project_key?: string | null
  project_name?: string | null
  comment_count?: number
  attachment_count?: number
  created_at?: string
  updated_at?: string
  version?: number
}

export type ProjectTaskComment = {
  id: string
  task_id: string
  body: string
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type ProjectTaskAttachment = {
  id: string
  task_id: string
  file_ref: Record<string, unknown>
  file_name: string
  file_type?: string | null
  uploaded_by?: string | null
  created_at?: string
}

export type ProjectsSummary = {
  total_projects: number
  active_projects: number
  open_tasks: number
  overdue_tasks: number
  urgent_tasks: number
  tasks_by_status: Record<string, number>
}

export function unwrapList<T>(response: ApiEnvelope<ProjectListResponse<T>> | ProjectListResponse<T>): ProjectListResponse<T> {
  if ('data' in response && Array.isArray((response as ProjectListResponse<T>).data)) {
    return response as ProjectListResponse<T>
  }
  const envelope = response as ApiEnvelope<ProjectListResponse<T>>
  return {
    data: envelope.data?.data || [],
    meta: envelope.data?.meta || { page: 1, pageSize: 50, total: 0, totalPages: 1 },
  }
}

export function unwrapData<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Proje/Gorev islemi tamamlanamadi.')
  }
  return payload as T
}

export function toQueryString(query: Record<string, unknown>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}
