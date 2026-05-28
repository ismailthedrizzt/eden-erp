'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { ApiEnvelope } from './importService'

export type BulkActionJob = {
  id: string
  tenant_id?: string
  module_key: string
  entity_type: string
  action_key: string
  selected_ids: string[]
  payload?: Record<string, unknown> | null
  status: string
  total_count?: number
  success_count?: number
  failed_count?: number
  skipped_count?: number
  created_at?: string
  completed_at?: string | null
  results?: BulkActionResult[]
}

export type BulkActionResult = {
  id?: string
  entity_id: string
  status: string
  error?: string | null
  warnings?: Record<string, unknown>[] | null
}

export type BulkActionCreateInput = {
  module_key: string
  entity_type: string
  action_key: string
  selected_ids: string[]
  payload?: Record<string, unknown>
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const bulkService = {
  async createJob(payload: BulkActionCreateInput) {
    const response = await apiClient.post<ApiEnvelope<BulkActionJob>>('/api/bulk/actions', payload, { useCache: false })
    return unwrap(response)
  },
  async getJob(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<BulkActionJob>>(`/api/bulk/actions/${jobId}`, { useCache: false })
    return unwrap(response)
  },
  async confirm(jobId: string, expectedTotal?: number) {
    const response = await apiClient.post<ApiEnvelope<BulkActionJob>>(`/api/bulk/actions/${jobId}/confirm`, {
      expected_total: expectedTotal,
    }, { useCache: false })
    return unwrap(response)
  },
  async report(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<BulkActionJob>>(`/api/bulk/actions/${jobId}/report`, { useCache: false })
    return unwrap(response)
  },
}
