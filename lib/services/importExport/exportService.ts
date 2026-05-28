'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { ApiEnvelope } from './importService'

export type ExportJob = {
  id: string
  tenant_id?: string
  module_key: string
  entity_type: string
  report_key?: string | null
  filters?: Record<string, unknown> | null
  columns?: string[] | null
  file_type: 'csv' | 'xlsx'
  status: string
  row_count?: number
  file_ref?: Record<string, unknown> | null
  created_at?: string
  completed_at?: string | null
}

export type ExportJobCreateInput = {
  entity_type: string
  report_key?: string | null
  filters?: Record<string, unknown>
  columns?: string[]
  file_type?: 'csv' | 'xlsx'
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const exportService = {
  async createJob(payload: ExportJobCreateInput) {
    const response = await apiClient.post<ApiEnvelope<ExportJob>>('/api/export/jobs', {
      file_type: 'csv',
      filters: {},
      columns: [],
      ...payload,
    }, { useCache: false })
    return unwrap(response)
  },
  async getJob(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<ExportJob>>(`/api/export/jobs/${jobId}`, { useCache: false })
    return unwrap(response)
  },
  downloadUrl(jobId: string) {
    return `/api/export/jobs/${jobId}/download`
  },
}
