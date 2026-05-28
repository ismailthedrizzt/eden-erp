'use client'

import { apiClient } from '@/lib/api/apiClient'
import type { ApiEnvelope, HREmployee } from './hrService'
import { unwrapData } from './hrService'

export const employmentService = {
  async start(employeeId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<HREmployee>>(`/api/hr/employees/${employeeId}/employment/start`, payload, {
      useCache: false,
    })
    invalidateEmployee(employeeId)
    return unwrapData(response)
  },
  async terminate(employeeId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<HREmployee>>(`/api/hr/employees/${employeeId}/employment/terminate`, payload, {
      useCache: false,
    })
    invalidateEmployee(employeeId)
    return unwrapData(response)
  },
  async assignmentChange(employeeId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<HREmployee>>(`/api/hr/employees/${employeeId}/employment/assignment-change`, payload, {
      useCache: false,
    })
    invalidateEmployee(employeeId)
    return unwrapData(response)
  },
  async sgkEntryCompleted(employeeId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<HREmployee>>(`/api/hr/employees/${employeeId}/sgk/entry-completed`, payload, {
      useCache: false,
    })
    invalidateEmployee(employeeId)
    return unwrapData(response)
  },
  async sgkExitCompleted(employeeId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<HREmployee>>(`/api/hr/employees/${employeeId}/sgk/exit-completed`, payload, {
      useCache: false,
    })
    invalidateEmployee(employeeId)
    return unwrapData(response)
  },
}

function invalidateEmployee(employeeId: string) {
  apiClient.invalidate('/api/hr/employees')
  apiClient.invalidate(`/api/hr/employees/${employeeId}`)
  apiClient.invalidate('/api/hr/employees/summary')
}
