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
  schedule_date?: string | null
  warranty_check_result?: string | null
  estimated_duration_minutes?: number | null
  required_skills?: string[]
  suggested_technician_user_id?: string | null
  suggested_technician_employee_id?: string | null
  required_parts_preview?: Record<string, unknown>[]
  customer_availability?: string | null
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
  customer_signature_file?: Record<string, unknown> | null
  service_report_file?: Record<string, unknown> | null
  photos?: Record<string, unknown>[]
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

export type MaintenancePlanRecord = {
  id: string
  company_id?: string | null
  product_id?: string | null
  installed_asset_id?: string | null
  plan_name: string
  maintenance_type: string
  interval_type: string
  interval_value: number
  checklist_template_id?: string | null
  active: boolean
  next_run_date?: string | null
  last_run_date?: string | null
  assigned_team_id?: string | null
  default_priority: string
  notes?: string | null
  version?: number
}

export type MaintenanceDueRecord = {
  id: string
  maintenance_due_item_id?: string
  company_id: string
  owning_company_id?: string
  maintenance_plan_id: string
  installed_asset_id: string
  due_date: string
  next_maintenance_date?: string
  status: string
  generated_service_request_id?: string | null
  generated_service_record_id?: string | null
  assigned_user_id?: string | null
  plan_name?: string | null
  maintenance_plan_name?: string | null
  maintenance_type?: string | null
  default_priority?: string | null
  customer_name?: string | null
  product_id?: string | null
  product_code?: string | null
  product_name?: string | null
  serial_no?: string | null
  warranty_status?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  contact_person?: string | null
  contact_phone?: string | null
  notes?: string | null
}

export type FieldAssignmentRecord = {
  id: string
  company_id: string
  service_request_id: string
  service_record_id?: string | null
  installed_asset_id?: string | null
  technician_user_id?: string | null
  technician_employee_id?: string | null
  assigned_by?: string | null
  assigned_at?: string
  scheduled_start?: string | null
  scheduled_end?: string | null
  status: string
  rejection_reason?: string | null
  notes?: string | null
  request_no?: string | null
  subject?: string | null
  customer_name?: string | null
  priority?: string | null
  product_name?: string | null
  serial_no?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
}

export type ChecklistTemplateRecord = {
  id: string
  company_id?: string | null
  product_id?: string | null
  service_type: string
  checklist_name: string
  items: Record<string, unknown>[]
  active: boolean
}

export type ServiceChecklistPayload = {
  service_record?: ServiceRecordRecord
  result?: Record<string, unknown> | null
  suggested_template?: ChecklistTemplateRecord | null
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
  async assignTechnician(id: string, input: { technician_user_id?: string | null; technician_employee_id?: string | null; scheduled_start?: string | null; scheduled_end?: string | null; create_project_task?: boolean; notes?: string | null }) {
    const payload = await requestJson<ApiEnvelope<FieldAssignmentRecord>>(`/api/after-sales/service-requests/${id}/assign-technician`, { method: 'POST', body: JSON.stringify(input) })
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
  async start(id: string, input: { start_time?: string | null; notes?: string | null } = {}) {
    const payload = await requestJson<ApiEnvelope<ServiceRecordRecord>>(`/api/after-sales/service-records/${id}/start`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async addPhotos(id: string, photos: Record<string, unknown>[]) {
    const payload = await requestJson<ApiEnvelope<ServiceRecordRecord>>(`/api/after-sales/service-records/${id}/photos`, { method: 'POST', body: JSON.stringify({ photos }) })
    return payload.data
  },
  async checklist(id: string) {
    const payload = await requestJson<ApiEnvelope<ServiceChecklistPayload>>(`/api/after-sales/service-records/${id}/checklist`)
    return payload.data
  },
  async patchChecklist(id: string, input: { checklist_template_id: string; results: Record<string, unknown>; completed?: boolean }) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/after-sales/service-records/${id}/checklist`, { method: 'PATCH', body: JSON.stringify(input) })
    return payload.data
  },
  async report(id: string) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/after-sales/service-records/${id}/report`)
    return payload.data
  },
}

export const afterSalesMaintenancePlans = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<MaintenancePlanRecord>>>(`/api/after-sales/maintenance-plans${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async create(input: Partial<MaintenancePlanRecord>) {
    const payload = await requestJson<ApiEnvelope<MaintenancePlanRecord>>('/api/after-sales/maintenance-plans', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async update(id: string, input: Partial<MaintenancePlanRecord>) {
    const payload = await requestJson<ApiEnvelope<MaintenancePlanRecord>>(`/api/after-sales/maintenance-plans/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
    return payload.data
  },
}

export const afterSalesMaintenanceDue = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<MaintenanceDueRecord[]>>(`/api/after-sales/maintenance-due${toQueryString(query)}`)
    return payload.data
  },
  async createServiceRequest(id: string, input: { assigned_user_id?: string | null; assigned_employee_id?: string | null; create_project_task?: boolean; notes?: string | null } = {}) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/after-sales/maintenance-due/${id}/create-service-request`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async skip(id: string, notes?: string | null) {
    const payload = await requestJson<ApiEnvelope<MaintenanceDueRecord>>(`/api/after-sales/maintenance-due/${id}/skip`, { method: 'POST', body: JSON.stringify({ notes }) })
    return payload.data
  },
}

export const afterSalesFieldAssignments = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<FieldAssignmentRecord>>>(`/api/after-sales/field-assignments${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<FieldAssignmentRecord>>(`/api/after-sales/field-assignments/${id}`)
    return payload.data
  },
  async accept(id: string) {
    const payload = await requestJson<ApiEnvelope<FieldAssignmentRecord>>(`/api/after-sales/field-assignments/${id}/accept`, { method: 'POST', body: JSON.stringify({}) })
    return payload.data
  },
  async reject(id: string, rejection_reason: string) {
    const payload = await requestJson<ApiEnvelope<FieldAssignmentRecord>>(`/api/after-sales/field-assignments/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason }) })
    return payload.data
  },
  async setStatus(id: string, input: { status: string; service_record_id?: string | null; notes?: string | null }) {
    const payload = await requestJson<ApiEnvelope<FieldAssignmentRecord>>(`/api/after-sales/field-assignments/${id}/status`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
}

export const afterSalesChecklistTemplates = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<ChecklistTemplateRecord>>>(`/api/after-sales/checklist-templates${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async create(input: Partial<ChecklistTemplateRecord>) {
    const payload = await requestJson<ApiEnvelope<ChecklistTemplateRecord>>('/api/after-sales/checklist-templates', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
}

export async function getAfterSalesSummary(companyId: string) {
  const payload = await requestJson<ApiEnvelope<AfterSalesSummary>>(`/api/after-sales/company/${companyId}/summary`)
  return payload.data
}

export async function listMaintenanceDue(query: Record<string, unknown> = {}) {
  const payload = await requestJson<ApiEnvelope<MaintenanceDueRecord[]>>(`/api/after-sales/maintenance-due${toQueryString(query)}`)
  return payload.data
}

export async function warrantyCheck(assetId: string, query: Record<string, unknown> = {}) {
  const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/after-sales/assets/${assetId}/warranty-check${toQueryString(query)}`)
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
