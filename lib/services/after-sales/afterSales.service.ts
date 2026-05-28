'use client'

import type { ListMeta } from '@/lib/api/listEndpoint'

export type ApiEnvelope<T> = { data: T; message?: string | null }
export type ListResponse<T> = { data: T[]; meta: ListMeta }

export type InstalledAssetRecord = {
  id: string
  owning_company_id: string
  customer_account_id?: string | null
  customer_company_id?: string | null
  customer_name: string
  product_id: string
  product_code: string
  product_name: string
  serial_no?: string | null
  asset_tag?: string | null
  installation_date?: string | null
  warranty_start_date?: string | null
  warranty_end_date?: string | null
  warranty_status: string
  maintenance_required: boolean
  next_maintenance_date?: string | null
  last_service_date?: string | null
  facility_id?: string | null
  branch_id?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  contact_person?: string | null
  contact_phone?: string | null
  status: string
  service_count?: number
  open_request_count?: number
  notes?: string | null
  updated_at?: string
  version?: number
}

export type ServiceRequestRecord = {
  id: string
  company_id: string
  customer_account_id?: string | null
  customer_name: string
  installed_asset_id?: string | null
  product_id?: string | null
  request_no: string
  request_type: string
  priority: string
  status: string
  subject: string
  description?: string | null
  reported_at?: string
  requested_date?: string | null
  due_date?: string | null
  assigned_user_id?: string | null
  assigned_employee_id?: string | null
  project_task_id?: string | null
  source?: string | null
  notes?: string | null
  updated_at?: string
  version?: number
}

export type ServiceRecordRecord = {
  id: string
  company_id: string
  service_request_id?: string | null
  installed_asset_id?: string | null
  product_id?: string | null
  service_no: string
  service_type: string
  service_date: string
  technician_user_id?: string | null
  technician_employee_id?: string | null
  duration_minutes?: number | null
  status: string
  fault_description?: string | null
  work_performed?: string | null
  parts_used?: Record<string, unknown>[]
  result?: string | null
  warranty_covered?: boolean | null
  next_action?: string | null
  next_service_date?: string | null
  updated_at?: string
  version?: number
}

export type AfterSalesSummary = {
  installed_assets: number
  open_service_requests: number
  overdue_service_requests: number
  maintenance_due: number
  completed_services: number
  by_request_status: Record<string, number>
}

export const afterSalesAssets = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<InstalledAssetRecord>>>(`/api/after-sales/assets${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async create(input: Partial<InstalledAssetRecord>) {
    const payload = await requestJson<ApiEnvelope<InstalledAssetRecord>>('/api/after-sales/assets', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async update(id: string, input: Partial<InstalledAssetRecord>) {
    const payload = await requestJson<ApiEnvelope<InstalledAssetRecord>>(`/api/after-sales/assets/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
    return payload.data
  },
  async serviceHistory(id: string) {
    const payload = await requestJson<ApiEnvelope<ServiceRecordRecord[]>>(`/api/after-sales/assets/${id}/service-history`)
    return payload.data
  },
}

export const afterSalesRequests = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<ServiceRequestRecord>>>(`/api/after-sales/service-requests${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async create(input: Partial<ServiceRequestRecord> & { create_project_task?: boolean }) {
    const payload = await requestJson<ApiEnvelope<ServiceRequestRecord>>('/api/after-sales/service-requests', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async assign(id: string, input: { assigned_user_id?: string | null; assigned_employee_id?: string | null; create_project_task?: boolean; notes?: string | null }) {
    const payload = await requestJson<ApiEnvelope<ServiceRequestRecord>>(`/api/after-sales/service-requests/${id}/assign`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async close(id: string, input: { status?: string; notes?: string | null }) {
    const payload = await requestJson<ApiEnvelope<ServiceRequestRecord>>(`/api/after-sales/service-requests/${id}/close`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
}

export const afterSalesRecords = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<ServiceRecordRecord>>>(`/api/after-sales/service-records${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async create(input: Partial<ServiceRecordRecord>) {
    const payload = await requestJson<ApiEnvelope<ServiceRecordRecord>>('/api/after-sales/service-records', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async complete(id: string, input: { result?: string; work_performed?: string | null; warranty_covered?: boolean | null; next_action?: string | null; next_service_date?: string | null; create_followup_task?: boolean }) {
    const payload = await requestJson<ApiEnvelope<ServiceRecordRecord>>(`/api/after-sales/service-records/${id}/complete`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
}

export async function getAfterSalesSummary(companyId: string) {
  const payload = await requestJson<ApiEnvelope<AfterSalesSummary>>(`/api/after-sales/company/${companyId}/summary`)
  return payload.data
}

export async function listMaintenanceDue(query: Record<string, unknown> = {}) {
  const payload = await requestJson<ApiEnvelope<InstalledAssetRecord[]>>(`/api/after-sales/maintenance-due${toQueryString(query)}`)
  return payload.data
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
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Satis sonrasi islemi tamamlanamadi.')
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
