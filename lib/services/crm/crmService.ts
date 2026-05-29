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
  stakeholder_id?: string | null
  lead_id?: string | null
  opportunity_id?: string | null
  interaction_type: string
  subject: string
  body?: string | null
  interaction_date: string
  direction?: string
  contact_person?: string | null
  next_followup_date?: string | null
  related_task_id?: string | null
  related_document_id?: string | null
  attachments?: Record<string, unknown>[]
  outcome?: string | null
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

export type CRMLeadRecord = {
  id: string
  company_id: string
  stakeholder_id?: string | null
  master_entity_type?: MasterEntityType | null
  master_entity_id?: string | null
  lead_name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  company_name?: string | null
  sector?: string | null
  source: string
  lead_status: string
  qualification_score?: number | string | null
  interest_area?: string | null
  product_interest?: string | null
  estimated_value?: number | string | null
  currency?: string | null
  expected_close_date?: string | null
  assigned_owner_user_id?: string | null
  next_followup_date?: string | null
  last_contacted_at?: string | null
  lost_reason?: string | null
  notes?: string | null
  tags?: string[]
  duplicate_warnings?: Array<Record<string, unknown>>
  created_at?: string
  updated_at?: string
  version?: number
}

export type CRMPipelineRecord = {
  id: string
  company_id?: string | null
  pipeline_name: string
  active: boolean
  is_default: boolean
  stages?: CRMPipelineStageRecord[]
}

export type CRMPipelineStageRecord = {
  id: string
  pipeline_id: string
  stage_key: string
  stage_name: string
  order_index: number
  probability: number | string
  stage_type: string
  requires_next_action: boolean
  active: boolean
}

export type CRMOpportunityRecord = {
  id: string
  company_id: string
  stakeholder_id?: string | null
  lead_id?: string | null
  opportunity_no: string
  opportunity_name: string
  customer_name: string
  pipeline_id: string
  stage_id: string
  pipeline_name?: string | null
  stage_name?: string | null
  stage_key?: string | null
  stage_type?: string | null
  status: string
  estimated_value?: number | string | null
  weighted_value?: number | string | null
  probability?: number | string | null
  currency?: string | null
  expected_close_date?: string | null
  actual_close_date?: string | null
  assigned_owner_user_id?: string | null
  source?: string | null
  product_interest?: string | null
  related_product_ids?: string[]
  related_service_ids?: string[]
  next_followup_date?: string | null
  lost_reason?: string | null
  won_reason?: string | null
  competitor_name?: string | null
  proposal_status?: string
  proposal_document_id?: string | null
  proposal_amount?: number | string | null
  proposal_sent_at?: string | null
  proposal_valid_until?: string | null
  notes?: string | null
  tags?: string[]
  created_at?: string
  updated_at?: string
  version?: number
}

export type CRMFollowupRecord = {
  entity_type: 'lead' | 'opportunity'
  id: string
  company_id: string
  title: string
  status: string
  assigned_owner_user_id?: string | null
  next_followup_date?: string | null
  expected_close_date?: string | null
  estimated_value?: number | string | null
  currency?: string | null
  followup_state: string
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

export const crmLeads = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<CRMLeadRecord>>>(`/api/crm/leads${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<CRMLeadRecord>>(`/api/crm/leads/${id}`)
    return payload.data
  },
  async create(input: Partial<CRMLeadRecord>) {
    const payload = await requestJson<ApiEnvelope<CRMLeadRecord>>('/api/crm/leads', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async update(id: string, input: Partial<CRMLeadRecord> & { base_version?: number }) {
    const payload = await requestJson<ApiEnvelope<CRMLeadRecord>>(`/api/crm/leads/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
    return payload.data
  },
  async qualify(id: string, input: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<CRMLeadRecord>>(`/api/crm/leads/${id}/qualify`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async convert(id: string, input: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/crm/leads/${id}/convert`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async markLost(id: string, lostReason: string) {
    const payload = await requestJson<ApiEnvelope<CRMLeadRecord>>(`/api/crm/leads/${id}/mark-lost`, { method: 'POST', body: JSON.stringify({ lost_reason: lostReason }) })
    return payload.data
  },
  async interactions(id: string) {
    const payload = await requestJson<ApiEnvelope<ListResponse<CRMInteractionRecord>>>(`/api/crm/leads/${id}/interactions`)
    return unwrapList(payload)
  },
  async addInteraction(id: string, input: Partial<CRMInteractionRecord>) {
    const payload = await requestJson<ApiEnvelope<CRMInteractionRecord>>(`/api/crm/leads/${id}/interactions`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
}

export const crmOpportunities = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<CRMOpportunityRecord>>>(`/api/crm/opportunities${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<CRMOpportunityRecord>>(`/api/crm/opportunities/${id}`)
    return payload.data
  },
  async create(input: Partial<CRMOpportunityRecord>) {
    const payload = await requestJson<ApiEnvelope<CRMOpportunityRecord>>('/api/crm/opportunities', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async update(id: string, input: Partial<CRMOpportunityRecord> & { base_version?: number }) {
    const payload = await requestJson<ApiEnvelope<CRMOpportunityRecord>>(`/api/crm/opportunities/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
    return payload.data
  },
  async changeStage(id: string, input: Record<string, unknown>) {
    const payload = await requestJson<ApiEnvelope<CRMOpportunityRecord>>(`/api/crm/opportunities/${id}/stage`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async markWon(id: string, input: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<CRMOpportunityRecord>>(`/api/crm/opportunities/${id}/mark-won`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async markLost(id: string, input: { lost_reason: string; competitor_name?: string; future_followup_date?: string }) {
    const payload = await requestJson<ApiEnvelope<CRMOpportunityRecord>>(`/api/crm/opportunities/${id}/mark-lost`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async createFollowupTask(id: string, input: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/crm/opportunities/${id}/create-followup-task`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async uploadProposal(id: string, input: Record<string, unknown>) {
    const payload = await requestJson<ApiEnvelope<CRMOpportunityRecord>>(`/api/crm/opportunities/${id}/upload-proposal`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async interactions(id: string) {
    const payload = await requestJson<ApiEnvelope<ListResponse<CRMInteractionRecord>>>(`/api/crm/opportunities/${id}/interactions`)
    return unwrapList(payload)
  },
  async addInteraction(id: string, input: Partial<CRMInteractionRecord>) {
    const payload = await requestJson<ApiEnvelope<CRMInteractionRecord>>(`/api/crm/opportunities/${id}/interactions`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
}

export const crmPipelines = {
  async list(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<ListResponse<CRMPipelineRecord>>>(`/api/crm/pipelines${toQueryString(query)}`)
    return unwrapList(payload)
  },
  async create(input: Partial<CRMPipelineRecord> & { stages?: Array<Record<string, unknown>> }) {
    const payload = await requestJson<ApiEnvelope<CRMPipelineRecord>>('/api/crm/pipelines', { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async stages(id: string) {
    const payload = await requestJson<ApiEnvelope<CRMPipelineStageRecord[]>>(`/api/crm/pipelines/${id}/stages`)
    return payload.data
  },
  async updateStage(id: string, input: Partial<CRMPipelineStageRecord>) {
    const payload = await requestJson<ApiEnvelope<CRMPipelineStageRecord>>(`/api/crm/pipeline-stages/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
    return payload.data
  },
}

export const crmFollowups = {
  async due(query: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<CRMFollowupRecord[]>>(`/api/crm/followups/due${toQueryString(query)}`)
    return payload.data
  },
  async complete(entityType: 'lead' | 'opportunity', entityId: string, input: Record<string, unknown> = {}) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/crm/followups/${entityType}/${entityId}/complete`, { method: 'POST', body: JSON.stringify(input) })
    return payload.data
  },
  async snooze(entityType: 'lead' | 'opportunity', entityId: string, input: { next_followup_date: string; notes?: string }) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/crm/followups/${entityType}/${entityId}/snooze`, { method: 'POST', body: JSON.stringify(input) })
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
