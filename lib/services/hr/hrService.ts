'use client'

import type { ListMeta } from '@/lib/api/listEndpoint'

export type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown> | null
  message?: string | null
  warnings?: string[]
}

export type HRListResponse<T> = {
  data: T[]
  meta: ListMeta
}

export type EmployeeRecordStatus = 'draft' | 'active' | 'passive'
export type EmploymentStatus = 'draft' | 'active' | 'suspended' | 'terminated' | 'passive'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'temporary' | 'consultant'
export type SgkStatus = 'not_required' | 'pending' | 'submitted' | 'completed' | 'failed'
export type WorkLocationType = 'office' | 'remote' | 'hybrid' | 'field'
export type DocumentStatus = 'missing' | 'uploaded' | 'expired' | 'rejected' | 'verified'

export type HREmployee = {
  id: string
  tenant_id?: string
  company_id: string
  person_id?: string | null
  employee_no: string
  first_name: string
  last_name: string
  full_name: string
  display_name?: string | null
  identity_number?: string | null
  masked_identity_number?: string | null
  passport_no?: string | null
  nationality?: string | null
  birth_date?: string | null
  gender?: string | null
  marital_status?: string | null
  education_level?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  country?: string | null
  emergency_contact?: Record<string, unknown> | null
  photo_url?: string | null
  record_status: EmployeeRecordStatus | string
  employment_status: EmploymentStatus | string
  notes?: string | null
  employment_record_id?: string | null
  branch_id?: string | null
  organization_unit_id?: string | null
  position_id?: string | null
  job_title?: string | null
  employment_type?: EmploymentType | string | null
  start_date?: string | null
  end_date?: string | null
  trial_period_end_date?: string | null
  termination_reason?: string | null
  sgk_status?: SgkStatus | string | null
  sgk_workplace_registry_no?: string | null
  work_location_type?: WorkLocationType | string | null
  manager_employee_id?: string | null
  salary_type?: string | null
  currency?: string | null
  document_missing_count?: number
  warnings?: string[]
  created_at?: string
  updated_at?: string
  version?: number
}

export type HREmployeeDocument = {
  id: string
  employee_id: string
  company_id: string
  document_type: string
  file_ref: Record<string, unknown>
  issue_date?: string | null
  expiry_date?: string | null
  status: DocumentStatus | string
  required: boolean
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export type HREmployeeSummary = {
  total_employees: number
  active_employees: number
  draft_employees: number
  terminated_employees: number
  pending_sgk: number
  branch_distribution: Record<string, number>
  gender_distribution: Record<string, number>
  education_distribution: Record<string, number>
  employment_type_distribution: Record<string, number>
}

export type HREmployeeListQuery = {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  direction?: 'asc' | 'desc'
  company_id?: string
  branch_id?: string
  organization_unit_id?: string
  position_id?: string
  employment_status?: string
  employment_type?: string
  sgk_status?: string
  gender?: string
  education_level?: string
  record_status?: string
  startDateFrom?: string
  startDateTo?: string
}

export function unwrapList<T>(response: ApiEnvelope<HRListResponse<T>> | HRListResponse<T>): HRListResponse<T> {
  if ('data' in response && Array.isArray((response as HRListResponse<T>).data)) {
    return response as HRListResponse<T>
  }
  const envelope = response as ApiEnvelope<HRListResponse<T>>
  return {
    data: envelope.data?.data || [],
    meta: envelope.data?.meta || { page: 1, pageSize: 50, total: 0, totalPages: 1 },
  }
}

export function unwrapData<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}
