'use client'

import type { ListMeta } from '@/lib/api/listEndpoint'

export type ApiEnvelope<T> = { data: T; message?: string | null }
export type ListResponse<T> = { data: T[]; meta: ListMeta }

export type MasterEntityType = 'person' | 'organization'

export type MasterPersonRecord = {
  id: string
  nationality?: string | null
  identity_number?: string | null
  masked_identity_number?: string | null
  passport_no?: string | null
  first_name: string
  last_name: string
  full_name: string
  birth_date?: string | null
  gender?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  country?: string | null
  notes?: string | null
}

export type MasterOrganizationRecord = {
  id: string
  country?: string | null
  tax_number?: string | null
  trade_name: string
  short_name?: string | null
  tax_office?: string | null
  mersis_number?: string | null
  registry_number?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  notes?: string | null
}

export type CRMStakeholderRecord = {
  id: string
  company_id: string
  master_entity_type: MasterEntityType
  master_entity_id: string
  display_name: string
  master_display_name?: string | null
  stakeholder_type: string
  relationship_status: string
  customer_status?: string | null
  supplier_status?: string | null
  related_cari_account_id?: string | null
  primary_contact_person_id?: string | null
  assigned_owner_user_id?: string | null
  source?: string | null
  sector?: string | null
  tags?: string[]
  lead_status?: string | null
  lead_source?: string | null
  potential_value?: string | number | null
  expected_close_date?: string | null
  next_followup_date?: string | null
  lost_reason?: string | null
  phone?: string | null
  email?: string | null
  master_city?: string | null
  master_country?: string | null
  master_address?: string | null
  tax_number?: string | null
  tax_office?: string | null
  masked_identity_number?: string | null
  passport_no?: string | null
  has_cari_account?: boolean
  notes?: string | null
  created_at?: string
  updated_at?: string
  version?: number
}

export type CRMInteractionRecord = {
  id: string
  stakeholder_id: string
  interaction_type: string
  subject: string
  body?: string | null
  interaction_date: string
  next_followup_date?: string | null
  related_task_id?: string | null
  attachments?: Record<string, unknown>[]
  created_by?: string | null
  created_at?: string
}

export type CRMRelatedRecords = {
  stakeholder: CRMStakeholderRecord
  roles: Record<string, number | boolean>
  counts: Record<string, number>
}

export type CRMStakeholderSummary = {
  interaction_count: number
  open_task_count: number
  completed_task_count: number
  overdue_task_count: number
  cari_account_linked: boolean
  installed_asset_count: number
  open_service_request_count: number
  related_partner_count: number
  related_representative_count: number
  related_employee_count: number
}

export type StakeholderCreateInput = {
  company_id: string
  master_entity_type: MasterEntityType
  master_entity_id?: string | null
  master_person?: Partial<MasterPersonRecord>
  master_organization?: Partial<MasterOrganizationRecord>
  display_name?: string | null
  stakeholder_type: string
  relationship_status?: string
  customer_status?: string | null
  supplier_status?: string | null
  assigned_owner_user_id?: string | null
  source?: string | null
  sector?: string | null
  tags?: string[]
  lead_status?: string | null
  lead_source?: string | null
  potential_value?: string | number | null
  expected_close_date?: string | null
  next_followup_date?: string | null
  notes?: string | null
}

export const crmStakeholders = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<CRMStakeholderRecord>>>(`/api/crm/stakeholders${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<CRMStakeholderRecord>>(`/api/crm/stakeholders/${id}`)
    return payload.data
  },
  async create(input: StakeholderCreateInput) {
    const payload = await requestJson<ApiEnvelope<CRMStakeholderRecord>>('/api/crm/stakeholders', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async update(id: string, input: Partial<CRMStakeholderRecord> & { base_version?: number }) {
    const payload = await requestJson<ApiEnvelope<CRMStakeholderRecord>>(`/api/crm/stakeholders/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
    return payload.data
  },
  async remove(id: string) {
    const payload = await requestJson<ApiEnvelope<{ id: string }>>(`/api/crm/stakeholders/${id}`, { method: 'DELETE' })
    return payload.data
  },
  async relatedRecords(id: string) {
    const payload = await requestJson<ApiEnvelope<CRMRelatedRecords>>(`/api/crm/stakeholders/${id}/related-records`)
    return payload.data
  },
  async summary(id: string) {
    const payload = await requestJson<ApiEnvelope<CRMStakeholderSummary>>(`/api/crm/stakeholders/${id}/summary`)
    return payload.data
  },
  async createCariAccount(id: string, input: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<{ stakeholder: CRMStakeholderRecord; cari_account: Record<string, unknown> }>>(`/api/crm/stakeholders/${id}/create-cari-account`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async createFollowupTask(id: string, input: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<{ stakeholder: CRMStakeholderRecord; task: Record<string, unknown> }>>(`/api/crm/stakeholders/${id}/create-followup-task`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
}

export const crmMasterData = {
  async searchPersons(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<MasterPersonRecord>>>(`/api/crm/master/persons/search${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async createPerson(input: Partial<MasterPersonRecord>) {
    const payload = await requestJson<ApiEnvelope<MasterPersonRecord>>('/api/crm/master/persons', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async searchOrganizations(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<MasterOrganizationRecord>>>(`/api/crm/master/organizations/search${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async createOrganization(input: Partial<MasterOrganizationRecord>) {
    const payload = await requestJson<ApiEnvelope<MasterOrganizationRecord>>('/api/crm/master/organizations', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
}

export const crmInteractions = {
  async list(stakeholderId: string) {
    const payload = await requestJson<ApiEnvelope<CRMInteractionRecord[]>>(`/api/crm/stakeholders/${stakeholderId}/interactions`)
    return payload.data
  },
  async create(stakeholderId: string, input: Partial<CRMInteractionRecord>) {
    const payload = await requestJson<ApiEnvelope<CRMInteractionRecord>>(`/api/crm/stakeholders/${stakeholderId}/interactions`, { method: 'POST', body: JSON.stringify(input) })
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
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'CRM islemi tamamlanamadi.')
  return payload as T
}

export function unwrapList<T>(response: ApiEnvelope<ListResponse<T>> | ListResponse<T>): ListResponse<T> {
  if ('data' in response && Array.isArray((response as ListResponse<T>).data)) return response as ListResponse<T>
  const envelope = response as ApiEnvelope<ListResponse<T>>
  return {
    data: envelope.data?.data || [],
    meta: envelope.data?.meta || { page: 1, pageSize: 50, total: 0, totalPages: 1 },
  }
}

export function toQueryString(query: Record<string, unknown>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}
