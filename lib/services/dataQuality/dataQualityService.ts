'use client'

import { apiClient } from '@/lib/api/apiClient'

export type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown> | null
  message?: string | null
  warnings?: string[]
}

export type DataQualityCounts = {
  open_findings?: number
  resolved_findings?: number
  duplicate_candidates?: number
  critical_findings?: number
  low_quality_records?: number
  last_scan_at?: string | null
}

export type DuplicateCandidateGroup = {
  id: string
  tenant_id?: string
  entity_type: string
  duplicate_group_key?: string
  match_score: number
  match_reason: string
  severity: 'exact' | 'strong' | 'weak' | string
  status: string
  suggested_master_id?: string | null
  candidate_count?: number
  created_at?: string
  updated_at?: string
  items?: DuplicateCandidateItem[]
}

export type DuplicateCandidateItem = {
  id: string
  entity_type: string
  entity_id: string
  display_name: string
  match_fields?: Record<string, unknown>
  is_suggested_master?: boolean
}

export type DataQualityFinding = {
  id: string
  entity_type: string
  entity_id: string
  rule_key: string
  severity: 'info' | 'warning' | 'critical' | string
  message: string
  status: string
  suggested_action?: Record<string, unknown>
  created_at?: string
}

export type QualityScore = {
  id?: string
  entity_type: string
  entity_id: string
  score: number
  status: 'good' | 'warning' | 'poor' | 'critical' | string
  missing_fields?: unknown
  duplicate_risk?: Record<string, unknown>
  relation_warnings?: unknown
  last_checked_at?: string
}

export type MergeOperation = {
  id: string
  entity_type: string
  source_entity_ids: unknown
  target_entity_id: string
  status: string
  impact_summary?: Record<string, unknown>
  result_json?: Record<string, unknown>
  created_at?: string
}

export type DataQualitySummary = {
  counts: DataQualityCounts
  duplicate_groups: DuplicateCandidateGroup[]
  open_findings: DataQualityFinding[]
  quality_scores: QualityScore[]
  merge_operations: MergeOperation[]
}

export type QualityCheckRequest = {
  entity_types?: string[]
  include_duplicates?: boolean
  include_scores?: boolean
  create_action_items?: boolean
  limit_per_entity?: number
}

export type DuplicateDetectRequest = {
  entity_types?: string[]
  limit_per_rule?: number
}

export type MergePreviewRequest = {
  entity_type: string
  source_entity_ids: string[]
  target_entity_id: string
  field_strategy?: Record<string, unknown>
  duplicate_group_id?: string | null
  reason?: string | null
}

export type MergePreview = {
  entity_type: string
  target_entity_id: string
  source_entity_ids: string[]
  safe_to_merge: boolean
  merge_allowed: boolean
  blocked_reason?: string | null
  field_comparison: {
    field: string
    target_value: unknown
    source_values: unknown[]
    winning_value: unknown
    strategy: string
    conflict?: boolean
  }[]
  relation_impact: {
    relation_entity_type: string
    relation_field?: string
    count: number
    action: string
    status?: string
    notes?: string
  }[]
  risks: string[]
  suggested_strategy: Record<string, unknown>
}

export type DataQualityRule = {
  id?: string
  rule_key: string
  entity_type: string
  label: string
  description?: string | null
  severity: string
  active: boolean
  config_json?: Record<string, unknown>
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const dataQualityService = {
  async summary() {
    const response = await apiClient.get<ApiEnvelope<DataQualitySummary>>('/api/data-quality/summary', {
      useCache: false,
    })
    return unwrap(response)
  },
  async runCheck(request: QualityCheckRequest = {}) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>('/api/data-quality/check', request, {
      useCache: false,
    })
    apiClient.invalidate('/api/data-quality')
    return unwrap(response)
  },
  async checkEntity(entityType: string, entityId: string) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/data-quality/check/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
      {},
      { useCache: false }
    )
    apiClient.invalidate('/api/data-quality')
    return unwrap(response)
  },
  async duplicates(query?: { entity_type?: string; status?: string; severity?: string; limit?: number }) {
    const response = await apiClient.get<ApiEnvelope<DuplicateCandidateGroup[]>>('/api/data-quality/duplicates', {
      query,
      useCache: false,
    })
    return unwrap(response)
  },
  async duplicateGroup(groupId: string) {
    const response = await apiClient.get<ApiEnvelope<DuplicateCandidateGroup>>(
      `/api/data-quality/duplicates/${encodeURIComponent(groupId)}`,
      { useCache: false }
    )
    return unwrap(response)
  },
  async detectDuplicates(request: DuplicateDetectRequest = {}) {
    const response = await apiClient.post<ApiEnvelope<{ detected_count: number; groups: DuplicateCandidateGroup[] }>>(
      '/api/data-quality/duplicates/detect',
      request,
      { useCache: false }
    )
    apiClient.invalidate('/api/data-quality')
    return unwrap(response)
  },
  async dismissDuplicate(groupId: string, resolutionNotes?: string) {
    const response = await apiClient.post<ApiEnvelope<DuplicateCandidateGroup>>(
      `/api/data-quality/duplicates/${encodeURIComponent(groupId)}/dismiss`,
      { resolution_notes: resolutionNotes || null },
      { useCache: false }
    )
    apiClient.invalidate('/api/data-quality')
    return unwrap(response)
  },
  async falsePositive(groupId: string, resolutionNotes?: string) {
    const response = await apiClient.post<ApiEnvelope<DuplicateCandidateGroup>>(
      `/api/data-quality/duplicates/${encodeURIComponent(groupId)}/false-positive`,
      { resolution_notes: resolutionNotes || null },
      { useCache: false }
    )
    apiClient.invalidate('/api/data-quality')
    return unwrap(response)
  },
  async mergePreview(request: MergePreviewRequest) {
    const response = await apiClient.post<ApiEnvelope<MergePreview>>('/api/data-quality/merge/preview', request, {
      useCache: false,
    })
    return unwrap(response)
  },
  async mergeConfirm(request: MergePreviewRequest & { confirmed_impact_ack: boolean }) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>('/api/data-quality/merge/confirm', request, {
      useCache: false,
    })
    apiClient.invalidate('/api/data-quality')
    return unwrap(response)
  },
  async rules(entityType?: string) {
    const response = await apiClient.get<ApiEnvelope<DataQualityRule[]>>('/api/data-quality/rules', {
      query: { entity_type: entityType },
      useCache: false,
    })
    return unwrap(response)
  },
  async updateRule(ruleKey: string, payload: Partial<Pick<DataQualityRule, 'active' | 'severity' | 'config_json' | 'description'>>) {
    const response = await apiClient.patch<ApiEnvelope<DataQualityRule>>(
      `/api/data-quality/rules/${encodeURIComponent(ruleKey)}`,
      payload,
      { useCache: false }
    )
    apiClient.invalidate('/api/data-quality/rules')
    return unwrap(response)
  },
}

