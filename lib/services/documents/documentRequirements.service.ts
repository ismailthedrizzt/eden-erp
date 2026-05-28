'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { ApiEnvelope } from './documentService'

export type DocumentRequirement = {
  requirement_key: string
  module_key: string
  operation_key?: string | null
  entity_type: string
  document_type: string
  required: boolean
  condition?: Record<string, unknown>
  description?: string | null
  accepted_file_types?: string[]
  max_file_size?: number | null
  expiry_required?: boolean
  verification_required?: boolean
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const documentRequirementsService = {
  async list(query: { module_key?: string; operation_key?: string; entity_type?: string } = {}) {
    const response = await apiClient.get<ApiEnvelope<DocumentRequirement[]>>('/api/documents/requirements', {
      query,
      staleTime: 120_000,
    })
    return unwrap(response)
  },
  async forOperation(moduleKey: string, operationKey: string) {
    const response = await apiClient.get<ApiEnvelope<DocumentRequirement[]>>(
      `/api/documents/requirements/${moduleKey}/${operationKey}`,
      { staleTime: 120_000 }
    )
    return unwrap(response)
  },
}

