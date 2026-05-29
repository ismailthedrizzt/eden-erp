'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { ApiEnvelope, HRListResponse } from './hrService'
import { unwrapData, unwrapList } from './hrService'

type QueryParams = Record<string, string | number | boolean | null | undefined>

export type HRLeaveType = {
  id: string
  company_id?: string | null
  leave_type_key: string
  leave_type_name: string
  category: string
  paid: boolean
  requires_document: boolean
  requires_approval: boolean
  affects_payroll: boolean
  affects_attendance: boolean
  default_days_per_year: number
  carry_over_allowed: boolean
  max_carry_over_days: number
  negative_balance_allowed: boolean
  active: boolean
  notes?: string | null
  version?: number
}

export type HRLeaveBalance = {
  id: string
  company_id: string
  employee_id: string
  leave_type_id: string
  leave_type_name?: string
  category?: string
  period_year: number
  entitled_days: number
  carried_over_days: number
  used_days: number
  pending_days: number
  remaining_days: number
  adjusted_days: number
  adjustment_reason?: string | null
  status: string
  version?: number
}

export type HRLeaveRequest = {
  id: string
  company_id: string
  employee_id: string
  employee_name?: string
  employee_no?: string
  leave_type_id: string
  leave_type_name?: string
  leave_type_key?: string
  category?: string
  request_no: string
  start_date: string
  end_date: string
  start_half_day?: boolean | null
  end_half_day?: boolean | null
  total_days: number
  reason?: string | null
  status: string
  requested_by?: string | null
  approver_id?: string | null
  approved_by?: string | null
  rejected_by?: string | null
  rejection_reason?: string | null
  document_required: boolean
  document_id?: string | null
  notes?: string | null
  warnings?: string[]
  created_at?: string
  updated_at?: string
  version?: number
}

export type HRAttendanceRecord = {
  id: string
  company_id: string
  employee_id: string
  employee_name?: string
  employee_no?: string
  work_date: string
  status: string
  check_in_time?: string | null
  check_out_time?: string | null
  planned_hours: number
  actual_hours: number
  overtime_hours: number
  missing_hours: number
  source: string
  related_leave_request_id?: string | null
  related_shift_id?: string | null
  notes?: string | null
  approved: boolean
  version?: number
}

export type HRWorkSchedule = {
  id: string
  company_id: string
  schedule_name: string
  weekly_pattern: Record<string, unknown>
  daily_hours: number
  active: boolean
  notes?: string | null
  version?: number
}

export type HRWorkScheduleAssignment = {
  id: string
  employee_id: string
  work_schedule_id: string
  effective_date: string
  end_date?: string | null
}

export type HRTimesheetRow = {
  id: string
  period_id: string
  employee_id: string
  employee_name?: string
  employee_no?: string
  planned_days: number
  worked_days: number
  leave_days: number
  unpaid_leave_days: number
  sick_leave_days: number
  absent_days: number
  overtime_hours: number
  missing_hours: number
  notes?: string | null
  status: string
}

export type HRTimesheetPeriod = {
  id: string
  company_id: string
  period_key: string
  period_start: string
  period_end: string
  status: string
  employee_count: number
  total_work_days: number
  total_leave_days: number
  total_absent_days: number
  total_overtime_hours: number
  rows?: HRTimesheetRow[]
  version?: number
}

export type HRPayrollPrepRow = {
  id: string
  company_id: string
  period_id: string
  employee_id: string
  employee_name?: string
  period_key?: string
  worked_days: number
  leave_days: number
  unpaid_leave_days: number
  sick_leave_days: number
  absent_days: number
  overtime_hours: number
  base_salary?: number | null
  currency?: string | null
  payroll_status: string
}

export const leaveTypesService = {
  async list(query: QueryParams = {}) {
    const response = await apiClient.get<ApiEnvelope<HRListResponse<HRLeaveType>>>('/api/hr/leave-types', { query, staleTime: 60_000 })
    return unwrapList<HRLeaveType>(response)
  },
  async detail(id: string) {
    const response = await apiClient.get<ApiEnvelope<HRLeaveType>>(`/api/hr/leave-types/${id}`, { staleTime: 60_000 })
    return unwrapData(response)
  },
  async create(payload: Partial<HRLeaveType>) {
    const response = await apiClient.post<ApiEnvelope<HRLeaveType>>('/api/hr/leave-types', payload, { useCache: false })
    apiClient.invalidate('/api/hr/leave-types')
    return unwrapData(response)
  },
  async update(id: string, payload: Partial<HRLeaveType>) {
    const response = await apiClient.patch<ApiEnvelope<HRLeaveType>>(`/api/hr/leave-types/${id}`, payload, { useCache: false })
    apiClient.invalidate('/api/hr/leave-types')
    return unwrapData(response)
  },
}

export const leaveBalancesService = {
  async list(employeeId: string, query: QueryParams = {}) {
    const response = await apiClient.get<ApiEnvelope<HRLeaveBalance[]>>(`/api/hr/employees/${employeeId}/leave-balances`, { query, useCache: false })
    return unwrapData(response)
  },
  async recalculate(employeeId: string, query: QueryParams = {}) {
    const response = await apiClient.post<ApiEnvelope<HRLeaveBalance[]>>(`/api/hr/employees/${employeeId}/leave-balances/recalculate${toQueryString(query)}`, {}, { useCache: false })
    apiClient.invalidate(`/api/hr/employees/${employeeId}/leave-balances`)
    return unwrapData(response)
  },
  async adjust(id: string, payload: Partial<HRLeaveBalance>) {
    const response = await apiClient.patch<ApiEnvelope<HRLeaveBalance>>(`/api/hr/leave-balances/${id}/adjust`, payload, { useCache: false })
    return unwrapData(response)
  },
}

export const leaveRequestsService = {
  async list(query: QueryParams = {}) {
    const response = await apiClient.get<ApiEnvelope<HRListResponse<HRLeaveRequest>>>('/api/hr/leave-requests', { query, useCache: false })
    return unwrapList<HRLeaveRequest>(response)
  },
  async detail(id: string) {
    const response = await apiClient.get<ApiEnvelope<HRLeaveRequest>>(`/api/hr/leave-requests/${id}`, { useCache: false })
    return unwrapData(response)
  },
  async create(payload: Partial<HRLeaveRequest>) {
    const response = await apiClient.post<ApiEnvelope<HRLeaveRequest>>('/api/hr/leave-requests', payload, { useCache: false })
    apiClient.invalidate('/api/hr/leave-requests')
    return unwrapData(response)
  },
  async update(id: string, payload: Partial<HRLeaveRequest>) {
    const response = await apiClient.patch<ApiEnvelope<HRLeaveRequest>>(`/api/hr/leave-requests/${id}`, payload, { useCache: false })
    apiClient.invalidate('/api/hr/leave-requests')
    return unwrapData(response)
  },
  async submit(id: string) {
    return mutateLeaveRequest(id, 'submit')
  },
  async approve(id: string) {
    return mutateLeaveRequest(id, 'approve')
  },
  async reject(id: string, rejection_reason: string) {
    const response = await apiClient.post<ApiEnvelope<HRLeaveRequest>>(`/api/hr/leave-requests/${id}/reject`, { rejection_reason }, { useCache: false })
    apiClient.invalidate('/api/hr/leave-requests')
    return unwrapData(response)
  },
  async cancel(id: string, notes?: string | null) {
    const response = await apiClient.post<ApiEnvelope<HRLeaveRequest>>(`/api/hr/leave-requests/${id}/cancel`, { notes }, { useCache: false })
    apiClient.invalidate('/api/hr/leave-requests')
    return unwrapData(response)
  },
}

export const attendanceService = {
  async list(query: QueryParams = {}) {
    const response = await apiClient.get<ApiEnvelope<HRListResponse<HRAttendanceRecord>>>('/api/hr/attendance', { query, useCache: false })
    return unwrapList<HRAttendanceRecord>(response)
  },
  async create(payload: Partial<HRAttendanceRecord>) {
    const response = await apiClient.post<ApiEnvelope<HRAttendanceRecord>>('/api/hr/attendance', payload, { useCache: false })
    apiClient.invalidate('/api/hr/attendance')
    return unwrapData(response)
  },
  async update(id: string, payload: Partial<HRAttendanceRecord>) {
    const response = await apiClient.patch<ApiEnvelope<HRAttendanceRecord>>(`/api/hr/attendance/${id}`, payload, { useCache: false })
    apiClient.invalidate('/api/hr/attendance')
    return unwrapData(response)
  },
  async import(records: Partial<HRAttendanceRecord>[]) {
    const response = await apiClient.post<ApiEnvelope<{ inserted: number; records: HRAttendanceRecord[] }>>('/api/hr/attendance/import', { records }, { useCache: false })
    apiClient.invalidate('/api/hr/attendance')
    return unwrapData(response)
  },
}

export const workSchedulesService = {
  async list(query: QueryParams = {}) {
    const response = await apiClient.get<ApiEnvelope<HRListResponse<HRWorkSchedule>>>('/api/hr/work-schedules', { query, useCache: false })
    return unwrapList<HRWorkSchedule>(response)
  },
  async create(payload: Partial<HRWorkSchedule>) {
    const response = await apiClient.post<ApiEnvelope<HRWorkSchedule>>('/api/hr/work-schedules', payload, { useCache: false })
    apiClient.invalidate('/api/hr/work-schedules')
    return unwrapData(response)
  },
  async update(id: string, payload: Partial<HRWorkSchedule>) {
    const response = await apiClient.patch<ApiEnvelope<HRWorkSchedule>>(`/api/hr/work-schedules/${id}`, payload, { useCache: false })
    apiClient.invalidate('/api/hr/work-schedules')
    return unwrapData(response)
  },
  async assign(employeeId: string, payload: Partial<HRWorkScheduleAssignment>) {
    const response = await apiClient.post<ApiEnvelope<HRWorkScheduleAssignment>>(`/api/hr/employees/${employeeId}/work-schedule-assignment`, payload, { useCache: false })
    return unwrapData(response)
  },
}

export const timesheetsService = {
  async list(query: QueryParams = {}) {
    const response = await apiClient.get<ApiEnvelope<HRListResponse<HRTimesheetPeriod>>>('/api/hr/timesheets', { query, useCache: false })
    return unwrapList<HRTimesheetPeriod>(response)
  },
  async detail(id: string) {
    const response = await apiClient.get<ApiEnvelope<HRTimesheetPeriod>>(`/api/hr/timesheets/${id}`, { useCache: false })
    return unwrapData(response)
  },
  async create(payload: Partial<HRTimesheetPeriod>) {
    const response = await apiClient.post<ApiEnvelope<HRTimesheetPeriod>>('/api/hr/timesheets', payload, { useCache: false })
    apiClient.invalidate('/api/hr/timesheets')
    return unwrapData(response)
  },
  async calculate(id: string) {
    return mutateTimesheet(id, 'calculate')
  },
  async approve(id: string) {
    return mutateTimesheet(id, 'approve')
  },
  async lock(id: string) {
    return mutateTimesheet(id, 'lock')
  },
}

export const payrollPrepService = {
  async list(query: QueryParams = {}) {
    const response = await apiClient.get<ApiEnvelope<HRListResponse<HRPayrollPrepRow>>>('/api/hr/payroll-prep', { query, useCache: false })
    return unwrapList<HRPayrollPrepRow>(response)
  },
  async period(periodId: string) {
    const response = await apiClient.get<ApiEnvelope<{ period: HRTimesheetPeriod; rows: HRPayrollPrepRow[]; notice: string }>>(`/api/hr/payroll-prep/${periodId}`, { useCache: false })
    return unwrapData(response)
  },
  async markReady(periodId: string) {
    const response = await apiClient.post<ApiEnvelope<{ period: HRTimesheetPeriod; rows: HRPayrollPrepRow[]; notice: string }>>(`/api/hr/payroll-prep/${periodId}/mark-ready`, {}, { useCache: false })
    apiClient.invalidate('/api/hr/payroll-prep')
    return unwrapData(response)
  },
}

async function mutateLeaveRequest(id: string, action: 'submit' | 'approve') {
  const response = await apiClient.post<ApiEnvelope<HRLeaveRequest>>(`/api/hr/leave-requests/${id}/${action}`, {}, { useCache: false })
  apiClient.invalidate('/api/hr/leave-requests')
  return unwrapData(response)
}

async function mutateTimesheet(id: string, action: 'calculate' | 'approve' | 'lock') {
  const response = await apiClient.post<ApiEnvelope<HRTimesheetPeriod>>(`/api/hr/timesheets/${id}/${action}`, {}, { useCache: false })
  apiClient.invalidate('/api/hr/timesheets')
  apiClient.invalidate(`/api/hr/timesheets/${id}`)
  return unwrapData(response)
}

function toQueryString(query: QueryParams) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const value = params.toString()
  return value ? `?${value}` : ''
}
