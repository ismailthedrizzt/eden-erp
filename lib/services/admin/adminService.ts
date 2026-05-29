'use client'

import { apiClient } from '@/lib/api/apiClient'

export type ApiEnvelope<T> = {
  data: T
  message?: string | null
  warnings?: string[]
}

export type WorkspaceSettings = {
  id?: string
  tenant_id?: string
  workspace_name: string
  country: string
  default_language: string
  default_currency: string
  timezone: string
  date_format: string
  number_format: string
  logo_document_id?: string | null
  onboarding_version?: string | null
  metadata_json?: Record<string, unknown>
  updated_at?: string
}

export type AdminSummary = {
  modules_total: number
  modules_ready: number
  modules_setup_required: number
  feature_flags_total: number
  outbox_failed: number
  outbox_pending: number
  critical_warnings: number
}

export type AdminDashboard = {
  workspace: WorkspaceSettings
  summary: AdminSummary
  warnings: string[]
  quick_links: { label: string; href: string }[]
  safety: Record<string, unknown>
}

export type AdminModule = {
  module_key: string
  name: string
  category: string
  enabled: boolean
  license_status: string
  readiness_status: string
  status: string
  dependencies?: string[]
  warnings?: string[]
  blocking_reasons?: string[]
  setup_steps?: string[]
  feature_count?: number
  feature_flags?: AdminFeatureFlag[]
}

export type AdminFeatureFlag = {
  key: string
  module_key: string
  label: string
  description?: string
  enabled: boolean
  default_enabled?: boolean
  dependency_keys?: string[]
  risk?: string
}

export type AdminHealth = {
  status: string
  environment?: string
  service?: string
  version?: string
  checks: Record<string, { status: string; label?: string; message?: string; [key: string]: unknown }>
  module_readiness?: Record<string, unknown>
  pool?: Record<string, unknown>
  metrics?: Record<string, unknown>
  technical?: Record<string, unknown>
}

export type AdminIntegration = {
  integration_key: string
  label: string
  status: 'configured' | 'missing' | 'degraded' | 'disabled' | string
  description: string
  secret_visible?: boolean
  configured?: boolean
}

export type AdminOutbox = {
  available: boolean
  counts: Record<string, number>
  recent_failed: {
    id: string
    event_type?: string
    aggregate_type?: string
    aggregate_id?: string
    status?: string
    retry_count?: number
    created_at?: string
    updated_at?: string
  }[]
  oldest_pending_age_minutes?: number | null
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const adminService = {
  async dashboard() {
    const response = await apiClient.get<ApiEnvelope<AdminDashboard>>('/api/admin', { useCache: false })
    return unwrap(response)
  },
  async workspaceSettings() {
    const response = await apiClient.get<ApiEnvelope<WorkspaceSettings>>('/api/admin/workspace-settings', {
      useCache: false,
    })
    return unwrap(response)
  },
  async updateWorkspaceSettings(payload: Partial<WorkspaceSettings>) {
    const response = await apiClient.patch<ApiEnvelope<WorkspaceSettings>>('/api/admin/workspace-settings', payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/admin')
    return unwrap(response)
  },
  async modules() {
    const response = await apiClient.get<ApiEnvelope<{ modules: AdminModule[]; summary: Record<string, number> }>>(
      '/api/admin/modules',
      { useCache: false }
    )
    return unwrap(response)
  },
  async setModuleActivation(moduleKey: string, enabled: boolean, reason?: string) {
    const response = await apiClient.patch<ApiEnvelope<AdminModule>>(
      `/api/admin/modules/${encodeURIComponent(moduleKey)}/activation`,
      { enabled, reason: reason || null },
      { useCache: false }
    )
    apiClient.invalidate('/api/admin/modules')
    return unwrap(response)
  },
  async features() {
    const response = await apiClient.get<ApiEnvelope<{ features: AdminFeatureFlag[]; summary: Record<string, number> }>>(
      '/api/admin/features',
      { useCache: false }
    )
    return unwrap(response)
  },
  async setFeature(featureKey: string, enabled: boolean, reason?: string) {
    const response = await apiClient.patch<ApiEnvelope<AdminFeatureFlag>>(
      `/api/admin/features/${encodeURIComponent(featureKey)}`,
      { enabled, reason: reason || null },
      { useCache: false }
    )
    apiClient.invalidate('/api/admin/features')
    return unwrap(response)
  },
  async health(deep = false) {
    const response = await apiClient.get<ApiEnvelope<AdminHealth>>(
      deep ? '/api/admin/health/deep' : '/api/admin/health',
      { useCache: false }
    )
    return unwrap(response)
  },
  async integrations() {
    const response = await apiClient.get<ApiEnvelope<{ integrations: AdminIntegration[]; summary: Record<string, number> }>>(
      '/api/admin/integrations',
      { useCache: false }
    )
    return unwrap(response)
  },
  async testIntegration(integrationKey: string) {
    const response = await apiClient.post<ApiEnvelope<AdminIntegration>>(
      `/api/admin/integrations/${encodeURIComponent(integrationKey)}/test`,
      { force: true },
      { useCache: false }
    )
    return unwrap(response)
  },
  async outbox() {
    const response = await apiClient.get<ApiEnvelope<AdminOutbox>>('/api/admin/outbox', { useCache: false })
    return unwrap(response)
  },
  async retryOutbox(eventId: string) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/outbox/${encodeURIComponent(eventId)}/retry`,
      {},
      { useCache: false }
    )
    apiClient.invalidate('/api/admin/outbox')
    return unwrap(response)
  },
  async dispatchOutboxOnce() {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(
      '/api/admin/outbox/dispatch-once',
      {},
      { useCache: false }
    )
    apiClient.invalidate('/api/admin/outbox')
    return unwrap(response)
  },
  async settings() {
    const response = await apiClient.get<ApiEnvelope<Record<string, unknown>>>('/api/admin/settings', {
      useCache: false,
    })
    return unwrap(response)
  },
}

