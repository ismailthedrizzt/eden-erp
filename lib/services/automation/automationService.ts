'use client'

export type ApiEnvelope<T> = { data: T; message?: string | null; warnings?: string[] }

export type ListResult<T> = {
  items: T[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
}

export type AutomationRule = {
  id: string
  tenant_id: string
  rule_key: string
  rule_name: string
  description?: string | null
  module_key: string
  trigger_type: 'event' | 'schedule' | 'condition' | 'manual'
  trigger_config: Record<string, unknown>
  condition_config: Record<string, unknown>
  action_config: Record<string, unknown>
  status: 'draft' | 'active' | 'paused' | 'disabled' | 'failed'
  priority: string
  run_mode: 'sync_safe' | 'async_worker'
  max_runs_per_day?: number | null
  cooldown_minutes?: number | null
  last_run_at?: string | null
  next_run_at?: string | null
  run_count: number
  failure_count: number
  created_by: string
  updated_by?: string | null
  created_at: string
  updated_at: string
  version: number
}

export type AutomationRuleInput = Partial<Omit<AutomationRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'version' | 'run_count' | 'failure_count'>> & {
  rule_name?: string
  module_key?: string
  trigger_type?: AutomationRule['trigger_type']
}

export type AutomationRun = {
  id: string
  tenant_id: string
  rule_id: string
  rule_name?: string | null
  rule_key?: string | null
  trigger_type: string
  trigger_event_id?: string | null
  status: string
  matched_count: number
  actions_created_count: number
  skipped_count: number
  failure_count: number
  error_message?: string | null
  started_at: string
  completed_at?: string | null
  duration_ms?: number | null
  metadata_json: Record<string, unknown>
}

export type AutomationTemplate = {
  template_key: string
  template_name: string
  description: string
  module_key: string
  trigger_config: Record<string, unknown>
  condition_config: Record<string, unknown>
  action_config: Record<string, unknown>
}

export type AutomationTriggerDefinition = {
  trigger_type: string
  label: string
  description: string
}

export type AutomationConditionRegistry = {
  operators: string[]
  entities: Array<{ key: string; label: string; module_key: string; fields: string[]; required_permission: string }>
}

export type AutomationActionDefinition = {
  action_type: string
  label: string
  module_key: string
  permission: string
  side_effect: string
}

export type AutomationSimulation = {
  rule: AutomationRule
  matched_count: number
  matched_preview: Record<string, unknown>[]
  action_preview: Record<string, unknown>[]
  warnings: string[]
  trigger_payload_masked: boolean
  simulation_only: boolean
}

export const automationRules = {
  async list(query: Record<string, string | number | boolean | null | undefined> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<AutomationRule>>>(`/api/automation/rules${toQueryString(query)}`)
    return payload.data
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<AutomationRule>>(`/api/automation/rules/${id}`)
    return payload.data
  },
  async create(input: AutomationRuleInput) {
    const payload = await requestJson<ApiEnvelope<AutomationRule>>('/api/automation/rules', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async update(id: string, input: AutomationRuleInput) {
    const payload = await requestJson<ApiEnvelope<AutomationRule>>(`/api/automation/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async remove(id: string) {
    const payload = await requestJson<ApiEnvelope<{ id: string; deleted: boolean }>>(`/api/automation/rules/${id}`, {
      method: 'DELETE',
    })
    return payload.data
  },
  async activate(id: string) {
    const payload = await requestJson<ApiEnvelope<AutomationRule>>(`/api/automation/rules/${id}/activate`, { method: 'POST' })
    return payload.data
  },
  async pause(id: string) {
    const payload = await requestJson<ApiEnvelope<AutomationRule>>(`/api/automation/rules/${id}/pause`, { method: 'POST' })
    return payload.data
  },
  async disable(id: string) {
    const payload = await requestJson<ApiEnvelope<AutomationRule>>(`/api/automation/rules/${id}/disable`, { method: 'POST' })
    return payload.data
  },
  async runNow(id: string) {
    const payload = await requestJson<ApiEnvelope<AutomationRun>>(`/api/automation/rules/${id}/run-now`, {
      method: 'POST',
      body: JSON.stringify({ trigger_payload: {} }),
    })
    return payload.data
  },
  async simulate(id: string) {
    const payload = await requestJson<ApiEnvelope<AutomationSimulation>>(`/api/automation/rules/${id}/simulate`, {
      method: 'POST',
      body: JSON.stringify({ limit: 20, trigger_payload: {} }),
    })
    return payload.data
  },
}

export const automationRegistry = {
  async triggers() {
    const payload = await requestJson<ApiEnvelope<AutomationTriggerDefinition[]>>('/api/automation/triggers')
    return payload.data
  },
  async conditions() {
    const payload = await requestJson<ApiEnvelope<AutomationConditionRegistry>>('/api/automation/conditions')
    return payload.data
  },
  async actions() {
    const payload = await requestJson<ApiEnvelope<AutomationActionDefinition[]>>('/api/automation/actions')
    return payload.data
  },
  async templates() {
    const payload = await requestJson<ApiEnvelope<AutomationTemplate[]>>('/api/automation/templates')
    return payload.data
  },
}

export const automationRuns = {
  async list(query: Record<string, string | number | boolean | null | undefined> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<AutomationRun>>>(`/api/automation/runs${toQueryString(query)}`)
    return payload.data
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<AutomationRun>>(`/api/automation/runs/${id}`)
    return payload.data
  },
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
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Otomasyon islemi tamamlanamadi.')
  return payload as T
}

export function toQueryString(query: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}
