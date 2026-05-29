'use client'

import type { ListMeta } from '@/lib/api/listEndpoint'

export type ApiEnvelope<T> = { data: T; message?: string | null }
export type ListResponse<T> = { data: T[]; meta: ListMeta }

export type PortalMe = {
  id: string
  auth_user_id: string
  external_user_type: string
  stakeholder_id: string
  customer_account_id?: string | null
  portal_role: string
  status: string
  stakeholder?: Record<string, unknown>
  access_scope?: Record<string, unknown>
  preferences?: Record<string, unknown>
}

export type PortalDashboard = {
  customer?: Record<string, unknown>
  portal_role: string
  asset_count: number
  open_service_request_count: number
  maintenance_due_count: number
  pending_action_count: number
  recent_service_records: PortalServiceRecord[]
  notifications: PortalNotification[]
}

export type PortalProduct = {
  id: string
  product_name?: string | null
  product_code?: string | null
  serial_no?: string | null
  asset_tag?: string | null
  customer_name?: string | null
  warranty_status?: string | null
  warranty_end_date?: string | null
  last_service_date?: string | null
  next_maintenance_date?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  status?: string | null
  service_count?: number
  open_request_count?: number
  service_history?: PortalServiceRecord[]
}

export type PortalServiceRequest = {
  id: string
  request_no?: string
  request_type?: string
  priority?: string
  status?: string
  portal_status?: string
  subject?: string
  description?: string | null
  customer_name?: string | null
  installed_asset_id?: string | null
  asset_product_name?: string | null
  asset_serial_no?: string | null
  requested_date?: string | null
  reported_at?: string | null
  schedule_date?: string | null
  contact_person?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  document_files?: Record<string, unknown>[]
  service_records?: PortalServiceRecord[]
  updated_at?: string
}

export type PortalServiceRequestCreate = {
  installed_asset_id?: string | null
  request_type?: string
  priority?: string
  subject: string
  description?: string | null
  contact_person?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  requested_date?: string | null
  customer_availability?: string | null
  attachments?: Record<string, unknown>[]
}

export type PortalServiceRecord = {
  id?: string
  service_no?: string
  service_type?: string
  service_date?: string
  status?: string
  result?: string | null
  work_performed?: string | null
  warranty_covered?: boolean | null
  service_report_file?: Record<string, unknown> | null
  photos?: Record<string, unknown>[]
  parts_used?: Record<string, unknown>[]
}

export type PortalDocument = {
  id: string
  title: string
  document_type?: string
  document_category?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  status?: string
  issue_date?: string | null
  expiry_date?: string | null
  created_at?: string
}

export type PortalDocumentUpload = {
  owner_entity_type?: 'service_request' | 'installed_asset' | 'stakeholder'
  owner_entity_id?: string | null
  document_type?: string
  title: string
  file_name: string
  mime_type?: string
  file_size?: number
  storage_bucket?: string
  storage_path?: string | null
  metadata_json?: Record<string, unknown>
}

export type PortalNotification = {
  id: string
  notification_type?: string
  title?: string
  message?: string
  priority?: string
  read_at?: string | null
  created_at?: string
}

export const portalSession = {
  async me() {
    const payload = await requestJson<ApiEnvelope<PortalMe>>('/api/portal/me')
    return payload.data
  },
  async dashboard() {
    const payload = await requestJson<ApiEnvelope<PortalDashboard>>('/api/portal/dashboard')
    return payload.data
  },
}

export const portalProducts = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<PortalProduct>>>(`/api/portal/products${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<PortalProduct>>(`/api/portal/products/${id}`)
    return payload.data
  },
}

export const portalServiceRequests = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<PortalServiceRequest>>>(`/api/portal/service-requests${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<PortalServiceRequest>>(`/api/portal/service-requests/${id}`)
    return payload.data
  },
  async create(input: PortalServiceRequestCreate) {
    const payload = await requestJson<ApiEnvelope<PortalServiceRequest>>('/api/portal/service-requests', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async addComment(id: string, input: { comment: string; attachments?: Record<string, unknown>[] }) {
    const payload = await requestJson<ApiEnvelope<PortalServiceRequest>>(`/api/portal/service-requests/${id}/comments`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async addAttachments(id: string, attachments: Record<string, unknown>[]) {
    const payload = await requestJson<ApiEnvelope<PortalServiceRequest>>(`/api/portal/service-requests/${id}/attachments`, { method: 'POST', body: JSON.stringify({ attachments }) })
    return payload.data
  },
}

export const portalServiceRecords = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<PortalServiceRecord>>>(`/api/portal/service-records${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<PortalServiceRecord>>(`/api/portal/service-records/${id}`)
    return payload.data
  },
}

export const portalDocuments = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<PortalDocument>>>(`/api/portal/documents${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async upload(input: PortalDocumentUpload) {
    const payload = await requestJson<ApiEnvelope<PortalDocument>>('/api/portal/documents/upload', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async downloadUrl(id: string) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/portal/documents/${id}/download-url`)
    return payload.data
  },
}

export const portalNotifications = {
  async list() {
    const payload = await requestJson<ApiEnvelope<PortalNotification[]>>('/api/portal/notifications')
    return payload.data
  },
  async markRead(id: string) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/portal/notifications/${id}/read`, { method: 'POST', body: JSON.stringify({}) })
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
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Musteri portali islemi tamamlanamadi.')
  return payload as T
}

function unwrapList<T>(response: ApiEnvelope<ListResponse<T>> | ListResponse<T>): ListResponse<T> {
  if ('data' in response && Array.isArray((response as ListResponse<T>).data)) return response as ListResponse<T>
  const envelope = response as ApiEnvelope<ListResponse<T>>
  return {
    data: envelope.data?.data || [],
    meta: envelope.data?.meta || { page: 1, pageSize: 50, total: 0, totalPages: 1 },
  }
}

function toQueryString(query: Record<string, unknown>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}

