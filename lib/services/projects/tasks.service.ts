'use client'

import {
  requestJson,
  toQueryString,
  unwrapData,
  unwrapList,
  type ApiEnvelope,
  type ProjectListResponse,
  type ProjectTaskAttachment,
  type ProjectTaskComment,
  type ProjectTaskRecord,
} from './projectService'

export type ProjectTaskListQuery = {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  direction?: 'asc' | 'desc'
  company_id?: string
  project_id?: string
  branch_id?: string
  organization_unit_id?: string
  facility_id?: string
  status?: string
  priority?: string
  issue_type?: string
  assignee_user_id?: string
  assignee_employee_id?: string
  related_module?: string
  related_entity_type?: string
  related_entity_id?: string
  dueFrom?: string
  dueTo?: string
  overdue?: boolean
  label?: string
}

export const projectTasksService = {
  async list(query: ProjectTaskListQuery = {}): Promise<ProjectListResponse<ProjectTaskRecord>> {
    const response = await requestJson<ApiEnvelope<ProjectListResponse<ProjectTaskRecord>>>(`/api/project-tasks${toQueryString(query)}`)
    return unwrapList(response)
  },

  async mine(query: ProjectTaskListQuery = {}): Promise<ProjectListResponse<ProjectTaskRecord>> {
    const response = await requestJson<ApiEnvelope<ProjectListResponse<ProjectTaskRecord>>>(`/api/tasks/my-project-tasks${toQueryString(query)}`)
    return unwrapList(response)
  },

  async get(id: string): Promise<ProjectTaskRecord> {
    const response = await requestJson<ApiEnvelope<ProjectTaskRecord>>(`/api/project-tasks/${id}`)
    return unwrapData(response)
  },

  async create(payload: Record<string, unknown>): Promise<ProjectTaskRecord> {
    const response = await requestJson<ApiEnvelope<ProjectTaskRecord>>('/api/project-tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return unwrapData(response)
  },

  async update(id: string, payload: Record<string, unknown>): Promise<ProjectTaskRecord> {
    const response = await requestJson<ApiEnvelope<ProjectTaskRecord>>(`/api/project-tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return unwrapData(response)
  },

  async delete(id: string): Promise<Record<string, unknown>> {
    const response = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/project-tasks/${id}`, {
      method: 'DELETE',
    })
    return unwrapData(response)
  },

  async transition(id: string, payload: Record<string, unknown>): Promise<ProjectTaskRecord> {
    const response = await requestJson<ApiEnvelope<ProjectTaskRecord>>(`/api/project-tasks/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return unwrapData(response)
  },

  async assign(id: string, payload: Record<string, unknown>): Promise<ProjectTaskRecord> {
    const response = await requestJson<ApiEnvelope<ProjectTaskRecord>>(`/api/project-tasks/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return unwrapData(response)
  },

  async comments(id: string): Promise<ProjectTaskComment[]> {
    const response = await requestJson<ApiEnvelope<ProjectTaskComment[]>>(`/api/project-tasks/${id}/comments`)
    return unwrapData(response)
  },

  async addComment(id: string, body: string): Promise<ProjectTaskComment> {
    const response = await requestJson<ApiEnvelope<ProjectTaskComment>>(`/api/project-tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    return unwrapData(response)
  },

  async attachments(id: string): Promise<ProjectTaskAttachment[]> {
    const response = await requestJson<ApiEnvelope<ProjectTaskAttachment[]>>(`/api/project-tasks/${id}/attachments`)
    return unwrapData(response)
  },

  async addAttachment(id: string, payload: Record<string, unknown>): Promise<ProjectTaskAttachment> {
    const response = await requestJson<ApiEnvelope<ProjectTaskAttachment>>(`/api/project-tasks/${id}/attachments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return unwrapData(response)
  },
}
