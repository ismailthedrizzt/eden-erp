'use client'

export type ApiEnvelope<T> = { data: T; message?: string | null; warnings?: string[] }

export type ReportingFilter = {
  company_id?: string | null
  branch_id?: string | null
  module_key?: string | null
  date_from?: string | null
  date_to?: string | null
  only_mine?: boolean
  status?: string | null
  group_by?: string | null
  page?: number
  page_size?: number
}

export type KpiCardRecord = {
  key: string
  title: string
  value: number | string | null
  unit?: string | null
  status: 'normal' | 'warning' | 'critical' | 'info'
  description: string
  target_page?: string | null
  module_key: string
  visible: boolean
  warnings: string[]
}

export type ChartDatasetRecord = {
  key: string
  title: string
  chart_type: 'bar' | 'stacked_bar' | 'donut' | 'line' | 'table'
  labels: string[]
  series: Record<string, unknown>[]
  data: Record<string, unknown>[]
  target_page?: string | null
}

export type DashboardResponse = {
  filters: ReportingFilter
  cards: KpiCardRecord[]
  charts: ChartDatasetRecord[]
  warnings: string[]
  generated_at: string
  permissions_summary: Record<string, boolean>
}

export type ReportDefinitionRecord = {
  report_key: string
  title: string
  description: string
  module_key: string
  required_permission: string
  filters: string[]
  columns: { key: string; label: string }[]
  default_sort?: string | null
  export_enabled: boolean
}

export type ReportResult = {
  data: Record<string, unknown>[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
  columns: { key: string; label: string }[]
  summary: Record<string, unknown>
  warnings: string[]
}

export const reportingDashboard = {
  async get(filters: ReportingFilter = {}) {
    const payload = await requestJson<ApiEnvelope<DashboardResponse>>(`/api/reporting/dashboard${toQueryString(filters)}`)
    return payload.data
  },
  async summary() {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>('/api/reporting/dashboard/summary')
    return payload.data
  },
  async module(moduleKey: string, filters: ReportingFilter = {}) {
    const payload = await requestJson<ApiEnvelope<DashboardResponse>>(`/api/reporting/dashboard/module/${moduleKey}${toQueryString(filters)}`)
    return payload.data
  },
  async kpis(moduleKey: string) {
    const payload = await requestJson<ApiEnvelope<KpiCardRecord[]>>(`/api/reporting/kpis/${moduleKey}`)
    return payload.data
  },
}

export const reportingReports = {
  async list() {
    const payload = await requestJson<ApiEnvelope<ReportDefinitionRecord[]>>('/api/reporting/reports')
    return payload.data
  },
  async get(reportKey: string) {
    const payload = await requestJson<ApiEnvelope<ReportDefinitionRecord>>(`/api/reporting/reports/${reportKey}`)
    return payload.data
  },
  async query(reportKey: string, filters: ReportingFilter = {}) {
    const payload = await requestJson<ApiEnvelope<ReportResult>>(`/api/reporting/reports/${reportKey}/query`, {
      method: 'POST',
      body: JSON.stringify({ page: 1, page_size: 50, ...filters }),
    })
    return payload.data
  },
  async export(reportKey: string, filters: ReportingFilter = {}) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/reporting/reports/${reportKey}/export`, {
      method: 'POST',
      body: JSON.stringify({ format: 'csv', filters }),
    })
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
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Raporlama islemi tamamlanamadi.')
  return payload as T
}

export function toQueryString(query: ReportingFilter) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}
