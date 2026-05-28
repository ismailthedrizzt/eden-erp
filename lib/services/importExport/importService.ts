'use client'

import { apiClient } from '@/lib/api/apiClient'

export type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown> | null
  message?: string | null
  warnings?: string[]
}

export type ImportColumnRule = {
  field: string
  label: string
  required?: boolean
  data_type?: string
  enum_values?: string[] | null
  description?: string | null
}

export type ImportTemplate = {
  template_key: string
  module_key: string
  entity_type: string
  label: string
  description?: string | null
  required_columns: ImportColumnRule[]
  optional_columns: ImportColumnRule[]
  sample_rows: Record<string, unknown>[]
  validation_rules: ImportColumnRule[]
  field_mapping_hints: Record<string, string[]>
  downloadable_template: boolean
  operation_controlled_fields?: string[]
}

export type ImportJob = {
  id: string
  tenant_id?: string
  company_id?: string | null
  module_key: string
  entity_type: string
  import_type: string
  source_file_name?: string | null
  source_file_ref?: {
    columns?: string[]
    sample_rows?: Record<string, unknown>[]
    [key: string]: unknown
  } | null
  file_type?: 'csv' | 'xlsx' | null
  status: string
  total_rows?: number
  valid_rows?: number
  invalid_rows?: number
  duplicate_rows?: number
  warning_rows?: number
  imported_rows?: number
  skipped_rows?: number
  failed_rows?: number
  field_mapping?: Record<string, string> | null
  validation_summary?: Record<string, unknown> | null
  dry_run_result?: Record<string, unknown> | null
  error_report_file_ref?: Record<string, unknown> | null
  created_at?: string
  completed_at?: string | null
}

export type CreateImportJobInput = {
  module_key: string
  entity_type: string
  import_type?: string
  company_id?: string | null
  template_key?: string | null
}

export type UploadImportFileInput = {
  source_file_name: string
  file_type?: 'csv' | 'xlsx'
  content_base64?: string
  content_text?: string
  rows?: Record<string, unknown>[]
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const importService = {
  async listTemplates() {
    const response = await apiClient.get<ApiEnvelope<ImportTemplate[]>>('/api/import/templates', { staleTime: 120_000 })
    return unwrap(response)
  },
  async getTemplate(templateKey: string) {
    const response = await apiClient.get<ApiEnvelope<ImportTemplate>>(`/api/import/templates/${templateKey}`, { staleTime: 120_000 })
    return unwrap(response)
  },
  templateDownloadUrl(templateKey: string) {
    return `/api/import/templates/${templateKey}/download`
  },
  async createJob(payload: CreateImportJobInput) {
    const response = await apiClient.post<ApiEnvelope<ImportJob>>('/api/import/jobs', {
      import_type: 'create',
      ...payload,
    }, { useCache: false })
    return unwrap(response)
  },
  async uploadRows(jobId: string, payload: UploadImportFileInput) {
    const response = await apiClient.post<ApiEnvelope<ImportJob>>(`/api/import/jobs/${jobId}/upload`, payload, { useCache: false })
    return unwrap(response)
  },
  async uploadFile(jobId: string, file: File) {
    const payload: UploadImportFileInput = {
      source_file_name: file.name,
      file_type: inferFileType(file.name),
      content_base64: await fileToBase64(file),
    }
    return this.uploadRows(jobId, payload)
  },
  async getJob(jobId: string) {
    const response = await apiClient.get<ApiEnvelope<ImportJob>>(`/api/import/jobs/${jobId}`, { useCache: false })
    return unwrap(response)
  },
  async saveMapping(jobId: string, fieldMapping: Record<string, string>) {
    const response = await apiClient.post<ApiEnvelope<ImportJob>>(`/api/import/jobs/${jobId}/mapping`, {
      field_mapping: fieldMapping,
    }, { useCache: false })
    return unwrap(response)
  },
  async validate(jobId: string, fieldMapping?: Record<string, string>) {
    const response = await apiClient.post<ApiEnvelope<ImportJob>>(`/api/import/jobs/${jobId}/validate`, {
      dry_run: true,
      field_mapping: fieldMapping,
    }, { useCache: false })
    return unwrap(response)
  },
  async confirm(jobId: string, options: { import_valid_rows_only?: boolean; skip_duplicates?: boolean } = {}) {
    const response = await apiClient.post<ApiEnvelope<ImportJob>>(`/api/import/jobs/${jobId}/confirm`, {
      import_valid_rows_only: options.import_valid_rows_only ?? true,
      skip_duplicates: options.skip_duplicates ?? true,
    }, { useCache: false })
    return unwrap(response)
  },
  async cancel(jobId: string) {
    const response = await apiClient.post<ApiEnvelope<ImportJob>>(`/api/import/jobs/${jobId}/cancel`, {}, { useCache: false })
    return unwrap(response)
  },
  errorReportUrl(jobId: string) {
    return `/api/import/jobs/${jobId}/error-report`
  },
}

function inferFileType(fileName: string): 'csv' | 'xlsx' {
  return fileName.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv'
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] || '' : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
