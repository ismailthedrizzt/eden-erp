'use client'

import { apiClient } from '@/lib/api/apiClient'

export type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown> | null
  message?: string | null
  warnings?: string[]
}

export type DocumentRecord = {
  id: string
  tenant_id?: string
  company_id?: string | null
  branch_id?: string | null
  owner_entity_type: string
  owner_entity_id: string
  document_type: string
  document_category: string
  title: string
  description?: string | null
  file_name: string
  file_extension?: string | null
  mime_type: string
  file_size: number
  storage_bucket?: string
  storage_provider?: string
  storage_path_masked?: string
  checksum?: string | null
  version_no?: number
  parent_document_id?: string | null
  status: DocumentStatus
  verification_status: VerificationStatus
  required?: boolean
  issue_date?: string | null
  expiry_date?: string | null
  uploaded_by?: string | null
  verified_by?: string | null
  verified_at?: string | null
  rejected_reason?: string | null
  tags?: string[]
  metadata_json?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export type DocumentStatus = 'draft' | 'uploaded' | 'verified' | 'rejected' | 'expired' | 'archived' | 'deleted'
export type VerificationStatus = 'not_required' | 'pending' | 'verified' | 'rejected'
export type DocumentRelationType =
  | 'primary'
  | 'supporting'
  | 'evidence'
  | 'attachment'
  | 'generated_report'
  | 'import_file'
  | 'export_file'
  | 'service_photo'
  | 'identity_document'

export type DocumentListResult = {
  data: DocumentRecord[]
  meta: {
    page: number
    pageSize: number
    total: number
  }
}

export type DocumentListQuery = {
  document_type?: string
  document_category?: string
  status?: string
  verification_status?: string
  required?: boolean
  company_id?: string
  owner_entity_type?: string
  owner_entity_id?: string
  uploaded_by?: string
  search?: string
  page?: number
  pageSize?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export type CreateDocumentInput = {
  company_id?: string | null
  branch_id?: string | null
  owner_entity_type: string
  owner_entity_id: string
  document_type: string
  document_category: string
  title: string
  description?: string | null
  file_name: string
  mime_type?: string
  file_size?: number
  storage_bucket?: string | null
  storage_path?: string | null
  storage_provider?: string
  required?: boolean
  issue_date?: string | null
  expiry_date?: string | null
  tags?: string[]
  metadata_json?: Record<string, unknown>
  relation_type?: DocumentRelationType
}

export type UploadDocumentInput = Omit<CreateDocumentInput, 'title' | 'file_name' | 'mime_type' | 'file_size'> & {
  title?: string | null
  file: File
  verification_required?: boolean
}

export type DocumentUrl = {
  document_id: string
  action: string
  url: string
  expires_in: number
  storage_provider: string
}

function unwrap<T>(response: ApiEnvelope<T> | { data: T }): T {
  return response.data
}

export const documentService = {
  async list(query: DocumentListQuery = {}) {
    const response = await apiClient.get<ApiEnvelope<DocumentListResult>>('/api/documents', {
      query,
      useCache: false,
    })
    return unwrap(response)
  },
  async get(documentId: string) {
    const response = await apiClient.get<ApiEnvelope<DocumentRecord>>(`/api/documents/${documentId}`, {
      useCache: false,
    })
    return unwrap(response)
  },
  async create(payload: CreateDocumentInput) {
    const response = await apiClient.post<ApiEnvelope<DocumentRecord>>('/api/documents', payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/documents')
    return unwrap(response)
  },
  async upload(payload: UploadDocumentInput) {
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: uploadFormData(payload),
    })
    return unwrap(await parseEnvelope<DocumentRecord>(response))
  },
  async uploadForEntity(entityType: string, entityId: string, payload: UploadDocumentInput) {
    const response = await fetch(`/api/documents/by-entity/${entityType}/${entityId}/upload`, {
      method: 'POST',
      body: uploadFormData({ ...payload, owner_entity_type: entityType, owner_entity_id: entityId }),
    })
    return unwrap(await parseEnvelope<DocumentRecord>(response))
  },
  async byEntity(entityType: string, entityId: string) {
    const response = await apiClient.get<ApiEnvelope<DocumentRecord[]>>(
      `/api/documents/by-entity/${entityType}/${entityId}`,
      { useCache: false }
    )
    return unwrap(response)
  },
  async newVersion(documentId: string, payload: UploadDocumentInput) {
    const response = await fetch(`/api/documents/${documentId}/new-version`, {
      method: 'POST',
      body: uploadFormData(payload),
    })
    return unwrap(await parseEnvelope<DocumentRecord>(response))
  },
  async update(documentId: string, payload: Partial<CreateDocumentInput> & { status?: string; verification_status?: string }) {
    const response = await apiClient.patch<ApiEnvelope<DocumentRecord>>(`/api/documents/${documentId}`, payload, {
      useCache: false,
    })
    apiClient.invalidate('/api/documents')
    return unwrap(response)
  },
  async verify(documentId: string) {
    const response = await apiClient.post<ApiEnvelope<DocumentRecord>>(`/api/documents/${documentId}/verify`, {}, {
      useCache: false,
    })
    return unwrap(response)
  },
  async reject(documentId: string, rejectedReason: string) {
    const response = await apiClient.post<ApiEnvelope<DocumentRecord>>(`/api/documents/${documentId}/reject`, {
      rejected_reason: rejectedReason,
    }, { useCache: false })
    return unwrap(response)
  },
  async remove(documentId: string) {
    const response = await apiClient.delete<ApiEnvelope<DocumentRecord>>(`/api/documents/${documentId}`, {
      useCache: false,
    })
    return unwrap(response)
  },
  async downloadUrl(documentId: string) {
    const response = await apiClient.get<ApiEnvelope<DocumentUrl>>(`/api/documents/${documentId}/download-url`, {
      useCache: false,
    })
    return unwrap(response)
  },
  async previewUrl(documentId: string) {
    const response = await apiClient.get<ApiEnvelope<DocumentUrl>>(`/api/documents/${documentId}/preview-url`, {
      useCache: false,
    })
    return unwrap(response)
  },
  async expiring() {
    const response = await apiClient.get<ApiEnvelope<DocumentRecord[]>>('/api/documents/expiring', {
      useCache: false,
    })
    return unwrap(response)
  },
  async expired() {
    const response = await apiClient.get<ApiEnvelope<DocumentRecord[]>>('/api/documents/expired', {
      useCache: false,
    })
    return unwrap(response)
  },
  async accessLogs(documentId: string) {
    const response = await apiClient.get<ApiEnvelope<Record<string, unknown>[]>>(`/api/documents/${documentId}/access-logs`, {
      useCache: false,
    })
    return unwrap(response)
  },
}

function uploadFormData(payload: UploadDocumentInput) {
  const formData = new FormData()
  formData.set('file', payload.file)
  setFormValue(formData, 'company_id', payload.company_id)
  setFormValue(formData, 'branch_id', payload.branch_id)
  formData.set('owner_entity_type', payload.owner_entity_type)
  formData.set('owner_entity_id', payload.owner_entity_id)
  formData.set('document_type', payload.document_type)
  formData.set('document_category', payload.document_category)
  setFormValue(formData, 'title', payload.title || payload.file.name)
  setFormValue(formData, 'description', payload.description)
  setFormValue(formData, 'storage_bucket', payload.storage_bucket)
  setFormValue(formData, 'storage_path', payload.storage_path)
  formData.set('storage_provider', payload.storage_provider || 'supabase')
  formData.set('required', String(Boolean(payload.required)))
  formData.set('verification_required', String(Boolean(payload.verification_required)))
  setFormValue(formData, 'issue_date', payload.issue_date)
  setFormValue(formData, 'expiry_date', payload.expiry_date)
  formData.set('relation_type', payload.relation_type || 'attachment')
  if (payload.tags?.length) formData.set('tags', payload.tags.join(','))
  if (payload.metadata_json) formData.set('metadata_json', JSON.stringify(payload.metadata_json))
  return formData
}

function setFormValue(formData: FormData, key: string, value: string | null | undefined) {
  if (value !== null && value !== undefined && value !== '') formData.set(key, value)
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = body.detail || body
    const message = detail?.message || body.message || body.error || response.statusText
    throw new Error(message)
  }
  return body
}

