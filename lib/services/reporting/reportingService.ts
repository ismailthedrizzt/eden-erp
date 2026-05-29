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

export type ListResult<T> = {
  items: T[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
}

export type SavedView = {
  id: string
  tenant_id: string
  owner_user_id: string
  module_key: string
  entity_type?: string | null
  report_key?: string | null
  view_name: string
  description?: string | null
  visibility: 'private' | 'shared_with_role' | 'shared_with_users' | 'tenant_shared'
  filters_json: Record<string, unknown>
  columns_json: unknown[]
  sort_json: Record<string, unknown>
  group_by_json: unknown[]
  chart_config_json: Record<string, unknown>
  default_view: boolean
  pinned: boolean
  shared_role_ids: unknown[]
  shared_user_ids: unknown[]
  created_at: string
  updated_at: string
  version: number
}

export type SavedViewInput = Partial<Omit<SavedView, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'version'>> & {
  module_key?: string
  view_name?: string
}

export type CustomReport = {
  id: string
  tenant_id: string
  report_key: string
  report_name: string
  description?: string | null
  module_key: string
  report_type: 'table' | 'summary' | 'chart' | 'hybrid'
  source_type: 'predefined_projection' | 'predefined_report' | 'saved_view'
  source_key: string
  allowed_filters_json: Record<string, unknown>
  default_filters_json: Record<string, unknown>
  columns_json: unknown[]
  default_sort_json: Record<string, unknown>
  chart_config_json: Record<string, unknown>
  required_permissions: string[]
  export_enabled: boolean
  schedule_enabled: boolean
  active: boolean
  created_by: string
  created_at: string
  updated_at: string
  version: number
}

export type CustomReportInput = Partial<Omit<CustomReport, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'version'>> & {
  report_name?: string
  module_key?: string
  source_type?: CustomReport['source_type']
  source_key?: string
}

export type ScheduledReport = {
  id: string
  tenant_id: string
  report_key: string
  saved_view_id?: string | null
  schedule_name: string
  description?: string | null
  owner_user_id: string
  recipients_json: unknown[]
  schedule_rule: 'daily' | 'weekly' | 'monthly'
  timezone: string
  next_run_at: string
  last_run_at?: string | null
  status: 'active' | 'paused' | 'failed' | 'disabled'
  export_format: 'csv' | 'xlsx' | 'pdf'
  email_enabled: boolean
  email_subject_template?: string | null
  email_body_template?: string | null
  last_result_status?: string | null
  last_error?: string | null
  created_at: string
  updated_at: string
  version: number
}

export type ScheduledReportInput = Partial<Omit<ScheduledReport, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'version'>> & {
  report_key?: string
  schedule_name?: string
  schedule_rule?: ScheduledReport['schedule_rule']
}

export type ExportJob = {
  id: string
  tenant_id: string
  report_key: string
  saved_view_id?: string | null
  requested_by: string
  export_format: 'csv' | 'xlsx' | 'pdf'
  filters_json: Record<string, unknown>
  columns_json: unknown[]
  status: 'queued' | 'running' | 'completed' | 'failed' | 'expired'
  row_count?: number | null
  file_document_id?: string | null
  file_ref?: Record<string, unknown> | null
  expires_at?: string | null
  error_message?: string | null
  created_at: string
  completed_at?: string | null
}

export type DashboardPreferences = {
  user_id: string
  tenant_id: string
  layout_json: unknown[]
  hidden_widgets: unknown[]
  pinned_reports: unknown[]
  default_filters: Record<string, unknown>
  updated_at?: string
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

export const reportingSavedViews = {
  async list(query: ReportingFilter & { module_key?: string; entity_type?: string; report_key?: string; visibility?: string } = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<SavedView>>>(`/api/reporting/saved-views${toQueryString(query)}`)
    return payload.data
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<SavedView>>(`/api/reporting/saved-views/${id}`)
    return payload.data
  },
  async create(input: SavedViewInput) {
    const payload = await requestJson<ApiEnvelope<SavedView>>('/api/reporting/saved-views', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async update(id: string, input: SavedViewInput) {
    const payload = await requestJson<ApiEnvelope<SavedView>>(`/api/reporting/saved-views/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async remove(id: string) {
    const payload = await requestJson<ApiEnvelope<SavedView>>(`/api/reporting/saved-views/${id}`, {
      method: 'DELETE',
    })
    return payload.data
  },
  async setDefault(id: string) {
    const payload = await requestJson<ApiEnvelope<SavedView>>(`/api/reporting/saved-views/${id}/set-default`, { method: 'POST' })
    return payload.data
  },
  async pin(id: string, pinned: boolean) {
    const payload = await requestJson<ApiEnvelope<SavedView>>(`/api/reporting/saved-views/${id}/pin`, {
      method: 'POST',
      body: JSON.stringify({ pinned }),
    })
    return payload.data
  },
}

export const reportingReports = {
  async list() {
    const payload = await requestJson<ApiEnvelope<ReportDefinitionRecord[]>>('/api/reporting/reports')
    return payload.data
  },
  async catalog() {
    const payload = await requestJson<ApiEnvelope<ReportDefinitionRecord[]>>('/api/reporting/reports/catalog')
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
    const payload = await requestJson<ApiEnvelope<ExportJob>>(`/api/reporting/reports/${reportKey}/export`, {
      method: 'POST',
      body: JSON.stringify({ format: 'csv', filters }),
    })
    return payload.data
  },
}

export const reportingCustomReports = {
  async list(query: ReportingFilter & { module_key?: string; active?: boolean } = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<CustomReport>>>(`/api/reporting/custom-reports${toQueryString(query)}`)
    return payload.data
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<CustomReport>>(`/api/reporting/custom-reports/${id}`)
    return payload.data
  },
  async create(input: CustomReportInput) {
    const payload = await requestJson<ApiEnvelope<CustomReport>>('/api/reporting/custom-reports', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async update(id: string, input: CustomReportInput) {
    const payload = await requestJson<ApiEnvelope<CustomReport>>(`/api/reporting/custom-reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async remove(id: string) {
    const payload = await requestJson<ApiEnvelope<CustomReport>>(`/api/reporting/custom-reports/${id}`, {
      method: 'DELETE',
    })
    return payload.data
  },
}

export const reportingScheduledReports = {
  async list(query: ReportingFilter & { status?: string } = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<ScheduledReport>>>(`/api/reporting/scheduled-reports${toQueryString(query)}`)
    return payload.data
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<ScheduledReport>>(`/api/reporting/scheduled-reports/${id}`)
    return payload.data
  },
  async create(input: ScheduledReportInput) {
    const payload = await requestJson<ApiEnvelope<ScheduledReport>>('/api/reporting/scheduled-reports', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async update(id: string, input: ScheduledReportInput) {
    const payload = await requestJson<ApiEnvelope<ScheduledReport>>(`/api/reporting/scheduled-reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return payload.data
  },
  async pause(id: string) {
    const payload = await requestJson<ApiEnvelope<ScheduledReport>>(`/api/reporting/scheduled-reports/${id}/pause`, { method: 'POST' })
    return payload.data
  },
  async resume(id: string) {
    const payload = await requestJson<ApiEnvelope<ScheduledReport>>(`/api/reporting/scheduled-reports/${id}/resume`, { method: 'POST' })
    return payload.data
  },
  async runNow(id: string) {
    const payload = await requestJson<ApiEnvelope<ScheduledReport>>(`/api/reporting/scheduled-reports/${id}/run-now`, { method: 'POST' })
    return payload.data
  },
}

export const reportingExportJobs = {
  async list(query: ReportingFilter & { status?: string; report_key?: string } = {}) {
    const payload = await requestJson<ApiEnvelope<ListResult<ExportJob>>>(`/api/reporting/exports${toQueryString(query)}`)
    return payload.data
  },
  async get(id: string) {
    const payload = await requestJson<ApiEnvelope<ExportJob>>(`/api/reporting/exports/${id}`)
    return payload.data
  },
  async downloadUrl(id: string) {
    const payload = await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/reporting/exports/${id}/download-url`)
    return payload.data
  },
}

export const reportingDashboardPreferences = {
  async get() {
    const payload = await requestJson<ApiEnvelope<DashboardPreferences>>('/api/reporting/dashboard/preferences')
    return payload.data
  },
  async update(input: Partial<DashboardPreferences>) {
    const payload = await requestJson<ApiEnvelope<DashboardPreferences>>('/api/reporting/dashboard/preferences', {
      method: 'PATCH',
      body: JSON.stringify(input),
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
