'use client'

import { apiClient } from '@/lib/api/apiClient'

export type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown> | null
  message?: string | null
  warnings?: string[]
}

export type SearchResultType =
  | 'record'
  | 'action'
  | 'page'
  | 'report'
  | 'task'
  | 'document'
  | 'setting'
  | 'help'

export type SearchRequest = {
  query?: string
  current_page?: string | null
  selected_record_type?: string | null
  selected_record_id?: string | null
  module_filter?: string | null
  entity_types?: string[]
  limit?: number
  include_actions?: boolean
  include_recent?: boolean
  include_commands?: boolean
}

export type SearchResult = {
  id: string
  result_type: SearchResultType
  entity_type?: string | null
  entity_id?: string | null
  module_key: string
  title: string
  subtitle?: string | null
  description?: string | null
  status?: string | null
  badge?: string | null
  icon?: string | null
  target_page: string
  action_key?: string | null
  confidence: number
  matched_fields: string[]
  highlights: Record<string, string[]>
  metadata: Record<string, unknown>
  disabled?: boolean
  disabled_reason?: string | null
}

export type SearchGroup = {
  key: string
  label: string
  results: SearchResult[]
  total_count: number
}

export type SearchSuggestion = {
  text: string
  type: string
  reason?: string | null
}

export type SearchResponse = {
  query: string
  results: SearchResult[]
  groups: SearchGroup[]
  suggestions: SearchSuggestion[]
  actions: SearchResult[]
  recent: SearchResult[]
  warnings: string[]
}

export type RecentItemInput = {
  entity_type: string
  entity_id: string
  title: string
  target_page: string
  module_key: string
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const searchService = {
  async search(request: SearchRequest) {
    const response = await apiClient.post<ApiEnvelope<SearchResponse>>('/api/search/query', normalizeSearchRequest(request), {
      useCache: false,
    })
    return unwrap(response)
  },
  async searchGet(request: SearchRequest) {
    const response = await apiClient.get<ApiEnvelope<SearchResponse>>('/api/search', {
      query: toQuery(request),
      useCache: false,
    })
    return unwrap(response)
  },
  async suggestions(query: string, limit = 8) {
    const response = await apiClient.get<ApiEnvelope<SearchSuggestion[]>>('/api/search/suggestions', {
      query: { query, limit },
      useCache: false,
    })
    return unwrap(response)
  },
  async recent(limit = 8) {
    const response = await apiClient.get<ApiEnvelope<SearchResult[]>>('/api/search/recent', {
      query: { limit },
      useCache: false,
    })
    return unwrap(response)
  },
  async recordRecent(payload: RecentItemInput) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>('/api/search/recent', payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/search/recent')
    return unwrap(response)
  },
  async commands(query = '', currentPage?: string | null) {
    const response = await apiClient.get<ApiEnvelope<{ actions: SearchResult[] }>>('/api/search/commands', {
      query: { query, current_page: currentPage },
      useCache: false,
    })
    return unwrap(response).actions
  },
  async byEntity(entityType: string, entityId: string) {
    const response = await apiClient.get<ApiEnvelope<SearchResponse>>(
      `/api/search/by-entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
      { useCache: false }
    )
    return unwrap(response)
  },
}

function normalizeSearchRequest(request: SearchRequest): SearchRequest {
  return {
    query: request.query || '',
    current_page: request.current_page || null,
    selected_record_type: request.selected_record_type || null,
    selected_record_id: request.selected_record_id || null,
    module_filter: request.module_filter || null,
    entity_types: request.entity_types || [],
    limit: request.limit || 25,
    include_actions: request.include_actions ?? true,
    include_recent: request.include_recent ?? true,
    include_commands: request.include_commands ?? true,
  }
}

function toQuery(request: SearchRequest) {
  const normalized = normalizeSearchRequest(request)
  return {
    query: normalized.query,
    current_page: normalized.current_page,
    module_filter: normalized.module_filter,
    limit: normalized.limit,
    include_actions: normalized.include_actions,
    include_recent: normalized.include_recent,
    include_commands: normalized.include_commands,
  }
}
