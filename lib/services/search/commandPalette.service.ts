'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { ApiEnvelope, SearchGroup, SearchRequest, SearchResult, SearchSuggestion } from './searchService'

export type CommandPaletteResponse = {
  query: string
  top_result?: SearchResult | null
  grouped_results: SearchGroup[]
  quick_actions: SearchResult[]
  recent_items: SearchResult[]
  suggestions: SearchSuggestion[]
  warnings: string[]
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const commandPaletteService = {
  async query(request: SearchRequest) {
    const response = await apiClient.post<ApiEnvelope<CommandPaletteResponse>>('/api/search/command-palette', {
      query: request.query || '',
      current_page: request.current_page || null,
      selected_record_type: request.selected_record_type || null,
      selected_record_id: request.selected_record_id || null,
      module_filter: request.module_filter || null,
      entity_types: request.entity_types || [],
      limit: request.limit || 25,
      include_actions: true,
      include_recent: true,
      include_commands: true,
    }, {
      useCache: false,
    })
    return unwrap(response)
  },
}
