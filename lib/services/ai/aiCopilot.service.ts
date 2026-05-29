'use client'

export type ApiEnvelope<T> = { data: T; message?: string | null; warnings?: string[] }

export type CopilotMode =
  | 'explain'
  | 'record_summary'
  | 'action_guidance'
  | 'form_assist'
  | 'document_intelligence'
  | 'insight'
  | 'admin_assist'

export type CopilotContextRequest = {
  current_page?: string | null
  module_key?: string | null
  selected_entity_type?: string | null
  selected_entity_id?: string | null
  selected_record_label?: string | null
  selected_record_status?: string | null
  include_audit?: boolean
  include_documents?: boolean
  include_action_center?: boolean
  extra_context?: Record<string, unknown>
}

export type CopilotQueryRequest = CopilotContextRequest & {
  query: string
  mode?: CopilotMode | null
}

export type SuggestedAction = {
  label: string
  action_key: string
  target_page?: string | null
  wizard_key?: string | null
  enabled: boolean
  disabled_reason?: string | null
  requires_confirmation: boolean
  preview_endpoint?: string | null
  safety_level: number
}

export type FormSuggestion = {
  field: string
  label: string
  suggested_value: unknown
  confidence: number
  reason: string
  source: string
  user_editable: boolean
}

export type DocumentFinding = {
  field: string
  value: unknown
  confidence: number
  source_excerpt?: string | null
  warning?: string | null
  requires_verification: boolean
}

export type CopilotResponse = {
  mode: CopilotMode
  title: string
  answer: string
  confidence: number
  citations: Array<Record<string, unknown>>
  suggested_actions: SuggestedAction[]
  warnings: string[]
  blocking_reasons: string[]
  next_steps: string[]
  form_suggestions: FormSuggestion[]
  document_findings: DocumentFinding[]
  requires_user_confirmation: boolean
  can_start_now: boolean
  safe_to_execute: boolean
  target_page?: string | null
  wizard_key?: string | null
  action_key?: string | null
  history_id?: string | null
}

export type CopilotContextPayload = CopilotContextRequest & {
  tenant_id: string
  user_id?: string | null
  permissions_summary: Record<string, unknown>
  company_scope_summary: Record<string, unknown>
  available_actions: SuggestedAction[]
  disabled_actions_with_reasons: SuggestedAction[]
  module_readiness_summary: Record<string, unknown>
  feature_flags_summary: Record<string, unknown>
  pending_actions_summary: Record<string, unknown>
  recent_audit_summary: Array<Record<string, unknown>>
  document_summary: Array<Record<string, unknown>>
  data_quality_summary: Record<string, unknown>
  field_lock_context: Record<string, unknown>
  warnings: string[]
}

export type ActionPreviewRequest = CopilotContextRequest & {
  action_key: string
  form_payload?: Record<string, unknown>
}

export type FormAssistRequest = CopilotContextRequest & {
  intent_text: string
  form_key?: string | null
  current_values?: Record<string, unknown>
}

export type DocumentIntelligenceRequest = CopilotContextRequest & {
  document_id?: string | null
  document_text?: string | null
  document_name?: string | null
  document_type_hint?: string | null
}

export const aiCopilotService = {
  async query(input: CopilotQueryRequest) {
    const payload = await requestJson<ApiEnvelope<CopilotResponse>>('/api/ai/copilot/query', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async context(input: CopilotContextRequest) {
    const payload = await requestJson<ApiEnvelope<CopilotContextPayload>>('/api/ai/copilot/context', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async actionPreview(input: ActionPreviewRequest) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>('/api/ai/copilot/action-preview', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async formAssist(input: FormAssistRequest) {
    const payload = await requestJson<ApiEnvelope<CopilotResponse>>('/api/ai/copilot/form-assist', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async documentSummary(input: DocumentIntelligenceRequest) {
    const payload = await requestJson<ApiEnvelope<CopilotResponse>>('/api/ai/copilot/document-summary', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async documentExtract(input: DocumentIntelligenceRequest) {
    const payload = await requestJson<ApiEnvelope<CopilotResponse>>('/api/ai/copilot/document-extract', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async suggestions() {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>('/api/ai/copilot/suggestions')
    return payload.data
  },
  async history(limit = 25) {
    const payload = await requestJson<ApiEnvelope<Array<Record<string, unknown>>>>(`/api/ai/copilot/history?limit=${limit}`)
    return payload.data
  },
  async feedback(input: { history_id?: string | null; rating: 'positive' | 'negative' | 'neutral'; comment?: string | null; metadata?: Record<string, unknown> }) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>('/api/ai/copilot/feedback', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'AI Copilot islemi tamamlanamadi.')
  return payload as T
}
