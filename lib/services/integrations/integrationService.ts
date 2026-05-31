'use client'

export type ApiEnvelope<T> = { data: T; message?: string | null; warnings?: string[] }

export type ListResult<T> = {
  items: T[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
}

export type IntegrationApp = {
  id: string
  tenant_id: string
  app_key: string
  app_name: string
  description?: string | null
  app_type: string
  status: 'draft' | 'active' | 'suspended' | 'revoked'
  owner_user_id?: string | null
  allowed_scopes: Record<string, unknown>
  allowed_event_types: string[]
  allowed_inbound_events: string[]
  rate_limit_per_minute?: number | null
  ip_allowlist: string[]
  metadata_json: Record<string, unknown>
  created_at: string
  updated_at: string
  version: number
}

export type IntegrationCredential = {
  id: string
  integration_app_id: string
  credential_type: string
  name: string
  secret_preview: string
  secret?: string
  expires_at?: string | null
  last_used_at?: string | null
  status: string
  created_at: string
}

export type WebhookSubscription = {
  id: string
  integration_app_id: string
  app_key?: string | null
  app_name?: string | null
  subscription_name: string
  target_url: string
  event_types: string[]
  status: string
  signing_secret_id?: string | null
  headers_json: Record<string, string>
  retry_policy_json: Record<string, unknown>
  filter_config_json: Record<string, unknown>
  last_delivery_at?: string | null
  last_success_at?: string | null
  last_failure_at?: string | null
  failure_count: number
  created_at: string
  updated_at: string
  version: number
}

export type WebhookDelivery = {
  id: string
  subscription_id: string
  integration_app_id: string
  app_name?: string | null
  subscription_name?: string | null
  event_type: string
  event_id: string
  target_url: string
  status: string
  attempt_count: number
  response_status_code?: number | null
  response_body_excerpt?: string | null
  error_message?: string | null
  created_at: string
  last_attempt_at?: string | null
  delivered_at?: string | null
}

export type InboundEvent = {
  id: string
  integration_app_id: string
  app_name?: string | null
  inbound_event_type: string
  source_event_id?: string | null
  signature_valid: boolean
  status: string
  error_message?: string | null
  related_entity_type?: string | null
  related_entity_id?: string | null
  created_at: string
  updated_at: string
}

export type IntegrationEventType = {
  event_type: string
  module_key: string
  aggregate_type: string
  description: string
  sensitive: boolean
  required_permission: string
}

export const integrationApps = {
  async list(query: Record<string, string | number | boolean | null | undefined> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<IntegrationApp>>>(`/api/integrations/apps${toQueryString(query)}`)
    return payload.data
  },
  async create(input: Partial<IntegrationApp>) {
    const payload = await requestJson<ApiEnvelope<IntegrationApp>>('/api/integrations/apps', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async update(id: string, input: Partial<IntegrationApp>) {
    const payload = await requestJson<ApiEnvelope<IntegrationApp>>(`/api/integrations/apps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async suspend(id: string) {
    const payload = await requestJson<ApiEnvelope<IntegrationApp>>(`/api/integrations/apps/${id}/suspend`, { method: 'POST' })
    return payload.data
  },
  async revoke(id: string) {
    const payload = await requestJson<ApiEnvelope<IntegrationApp>>(`/api/integrations/apps/${id}/revoke`, { method: 'POST' })
    return payload.data
  },
}

export const integrationCredentials = {
  async list(appId: string) {
    const payload = await requestJson<ApiEnvelope<IntegrationCredential[]>>(`/api/integrations/apps/${appId}/credentials`)
    return payload.data
  },
  async create(appId: string, input: { credential_type?: string; name: string; secret?: string; expires_at?: string | null }) {
    const payload = await requestJson<ApiEnvelope<IntegrationCredential>>(`/api/integrations/apps/${appId}/credentials`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async rotate(id: string) {
    const payload = await requestJson<ApiEnvelope<IntegrationCredential>>(`/api/integrations/credentials/${id}/rotate`, { method: 'POST' })
    return payload.data
  },
  async revoke(id: string) {
    const payload = await requestJson<ApiEnvelope<IntegrationCredential>>(`/api/integrations/credentials/${id}/revoke`, { method: 'POST' })
    return payload.data
  },
}

export const webhookSubscriptions = {
  async list(query: Record<string, string | number | boolean | null | undefined> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<WebhookSubscription>>>(`/api/integrations/webhook-subscriptions${toQueryString(query)}`)
    return payload.data
  },
  async create(input: Partial<WebhookSubscription>) {
    const payload = await requestJson<ApiEnvelope<WebhookSubscription>>('/api/integrations/webhook-subscriptions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async update(id: string, input: Partial<WebhookSubscription>) {
    const payload = await requestJson<ApiEnvelope<WebhookSubscription>>(`/api/integrations/webhook-subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async pause(id: string) {
    const payload = await requestJson<ApiEnvelope<WebhookSubscription>>(`/api/integrations/webhook-subscriptions/${id}/pause`, { method: 'POST' })
    return payload.data
  },
  async resume(id: string) {
    const payload = await requestJson<ApiEnvelope<WebhookSubscription>>(`/api/integrations/webhook-subscriptions/${id}/resume`, { method: 'POST' })
    return payload.data
  },
  async test(id: string) {
    const payload = await requestJson<ApiEnvelope<WebhookDelivery>>(`/api/integrations/webhook-subscriptions/${id}/test`, { method: 'POST' })
    return payload.data
  },
}

export const webhookDeliveries = {
  async list(query: Record<string, string | number | boolean | null | undefined> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<WebhookDelivery>>>(`/api/integrations/webhook-deliveries${toQueryString(query)}`)
    return payload.data
  },
  async retry(id: string) {
    const payload = await requestJson<ApiEnvelope<WebhookDelivery>>(`/api/integrations/webhook-deliveries/${id}/retry`, { method: 'POST' })
    return payload.data
  },
}

export const inboundEvents = {
  async list(query: Record<string, string | number | boolean | null | undefined> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<InboundEvent>>>(`/api/integrations/inbound-events${toQueryString(query)}`)
    return payload.data
  },
}

export const integrationRegistry = {
  async eventTypes() {
    const payload = await requestJson<ApiEnvelope<IntegrationEventType[]>>('/api/integrations/event-types')
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
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Entegrasyon islemi tamamlanamadi.')
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
