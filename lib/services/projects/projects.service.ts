'use client'

import {
  requestJson,
  toQueryString,
  unwrapData,
  unwrapList,
  type ApiEnvelope,
  type ProjectListResponse,
  type ProjectRecord,
  type ProjectsSummary,
} from './projectService'

export type ProjectListQuery = {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  direction?: 'asc' | 'desc'
  company_id?: string
  branch_id?: string
  organization_unit_id?: string
  status?: string
  project_type?: string
  priority?: string
  manager_id?: string
  dateFrom?: string
  dateTo?: string
}

export const projectsService = {
  async list(query: ProjectListQuery = {}): Promise<ProjectListResponse<ProjectRecord>> {
    const response = await requestJson<ApiEnvelope<ProjectListResponse<ProjectRecord>>>(`/api/projects${toQueryString(query)}`)
    return unwrapList(response)
  },

  async summary(): Promise<ProjectsSummary> {
    const response = await requestJson<ApiEnvelope<ProjectsSummary>>('/api/projects/summary')
    return unwrapData(response)
  },

  async get(id: string): Promise<ProjectRecord> {
    const response = await requestJson<ApiEnvelope<ProjectRecord>>(`/api/projects/${id}`)
    return unwrapData(response)
  },

  async create(payload: Record<string, unknown>): Promise<ProjectRecord> {
    const response = await requestJson<ApiEnvelope<ProjectRecord>>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return unwrapData(response)
  },

  async update(id: string, payload: Record<string, unknown>): Promise<ProjectRecord> {
    const response = await requestJson<ApiEnvelope<ProjectRecord>>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return unwrapData(response)
  },

  async delete(id: string): Promise<Record<string, unknown>> {
    const response = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/projects/${id}`, {
      method: 'DELETE',
    })
    return unwrapData(response)
  },
}
