'use client'

import { apiClient } from '@/lib/api/apiClient'
import type {
  ApiEnvelope,
  HREmployee,
  HREmployeeDocument,
  HREmployeeListQuery,
  HREmployeeSummary,
  HRListResponse,
} from './hrService'
import { unwrapData, unwrapList } from './hrService'

export const employeesService = {
  async list(query: HREmployeeListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<HRListResponse<HREmployee>>>('/api/hr/employees', {
      query,
      staleTime: 60_000,
    })
    return unwrapList<HREmployee>(response)
  },
  async detail(id: string) {
    const response = await apiClient.get<ApiEnvelope<HREmployee>>(`/api/hr/employees/${id}`, {
      staleTime: 60_000,
    })
    return unwrapData(response)
  },
  async create(payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<HREmployee>>('/api/hr/employees', payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/hr/employees')
    return unwrapData(response)
  },
  async update(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.patch<ApiEnvelope<HREmployee>>(`/api/hr/employees/${id}`, payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/hr/employees')
    apiClient.invalidate(`/api/hr/employees/${id}`)
    return unwrapData(response)
  },
  async delete(id: string) {
    const response = await apiClient.delete<ApiEnvelope<{ id: string; deleted: boolean }>>(`/api/hr/employees/${id}`, {
      useCache: false,
    })
    apiClient.invalidate('/api/hr/employees')
    return unwrapData(response)
  },
  async summary() {
    const response = await apiClient.get<ApiEnvelope<HREmployeeSummary>>('/api/hr/employees/summary', {
      useCache: false,
    })
    return unwrapData(response)
  },
  async companySummary(companyId: string) {
    const response = await apiClient.get<ApiEnvelope<HREmployeeSummary>>(`/api/hr/company/${companyId}/summary`, {
      useCache: false,
    })
    return unwrapData(response)
  },
  async documents(employeeId: string) {
    const response = await apiClient.get<ApiEnvelope<HREmployeeDocument[]>>(`/api/hr/employees/${employeeId}/documents`, {
      useCache: false,
    })
    return unwrapData(response)
  },
  async createDocument(employeeId: string, payload: Record<string, unknown>) {
    const response = await apiClient.post<ApiEnvelope<HREmployeeDocument>>(`/api/hr/employees/${employeeId}/documents`, payload, {
      useCache: false,
    })
    apiClient.invalidate(`/api/hr/employees/${employeeId}/documents`)
    return unwrapData(response)
  },
  async updateDocument(employeeId: string, documentId: string, payload: Record<string, unknown>) {
    const response = await apiClient.patch<ApiEnvelope<HREmployeeDocument>>(`/api/hr/employees/${employeeId}/documents/${documentId}`, payload, {
      useCache: false,
    })
    apiClient.invalidate(`/api/hr/employees/${employeeId}/documents`)
    return unwrapData(response)
  },
}
