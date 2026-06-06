import { NextRequest, NextResponse } from 'next/server'
import { proxyJsonToFastApi } from '@/lib/backend/fastApiProxy'
import { documentsBackendUnavailable, proxyToFastApiDocuments } from './_proxy'

export async function proxyDocumentUpload(request: NextRequest, targetPath: string) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return proxyToFastApiDocuments(request, targetPath, { timeoutMs: 45000 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Dosya bulunamadi.', code: 'DOCUMENT_FILE_REQUIRED', message: 'Dosya bulunamadi.' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const payload = {
    company_id: nullableString(formData.get('company_id')),
    branch_id: nullableString(formData.get('branch_id')),
    owner_entity_type: stringValue(formData.get('owner_entity_type'), 'document'),
    owner_entity_id: stringValue(formData.get('owner_entity_id'), 'document'),
    document_type: stringValue(formData.get('document_type'), 'other'),
    document_category: stringValue(formData.get('document_category'), 'general'),
    title: nullableString(formData.get('title')) || file.name,
    description: nullableString(formData.get('description')),
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
    content_base64: buffer.toString('base64'),
    storage_bucket: nullableString(formData.get('storage_bucket')),
    storage_path: nullableString(formData.get('storage_path')),
    storage_provider: stringValue(formData.get('storage_provider'), 'local'),
    required: booleanValue(formData.get('required')),
    verification_required: booleanValue(formData.get('verification_required')),
    issue_date: nullableString(formData.get('issue_date')),
    expiry_date: nullableString(formData.get('expiry_date')),
    relation_type: stringValue(formData.get('relation_type'), 'attachment'),
    module_key: nullableString(formData.get('module_key')),
    operation_key: nullableString(formData.get('operation_key')),
    operation_id: nullableString(formData.get('operation_id')),
    document_slot_key: nullableString(formData.get('document_slot_key')),
    tags: listValue(formData.get('tags')),
    metadata_json: jsonValue(formData.get('metadata_json')),
  }

  const response = await proxyJsonToFastApi(request, targetPath, payload, { timeoutMs: 45000 })
  if (!response) return documentsBackendUnavailable()
  return normalizeUploadResponse(response)
}

async function normalizeUploadResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || !contentType.includes('application/json')) return response

  const payload = await response.clone().json().catch(() => null)
  if (!payload || typeof payload !== 'object') return response

  const data = payload.data && typeof payload.data === 'object' ? payload.data : payload
  const storageBucket = stringRecordValue(data, 'storageBucket') || stringRecordValue(data, 'storage_bucket') || 'eden-documents'
  const storagePath = stringRecordValue(data, 'storagePath') || stringRecordValue(data, 'storage_path')
  const documentId = stringRecordValue(data, 'documentId') || stringRecordValue(data, 'document_id') || stringRecordValue(data, 'id') || storagePath
  const name = stringRecordValue(data, 'name') || stringRecordValue(data, 'file_name') || stringRecordValue(data, 'fileName') || stringRecordValue(data, 'title')
  const size = numberRecordValue(data, 'size') || numberRecordValue(data, 'file_size')
  const type = stringRecordValue(data, 'type') || stringRecordValue(data, 'mime_type') || 'application/octet-stream'
  const url = stringRecordValue(data, 'url') || stringRecordValue(data, 'previewUrl') || stringRecordValue(data, 'preview_url') || (storagePath ? `/api/media/open?storageBucket=${encodeURIComponent(storageBucket)}&storagePath=${encodeURIComponent(storagePath)}&download=0` : '')
  const mediaAccessUrl = stringRecordValue(data, 'mediaAccessUrl') || stringRecordValue(data, 'media_access_url') || url
  const reusedExistingFile = Boolean(data.reused_existing_file || data.reusedExistingFile)
  const duplicateWarning = stringRecordValue(data, 'duplicate_warning') || stringRecordValue(data, 'duplicateWarning')

  const headers = new Headers()
  headers.set('cache-control', 'no-store, max-age=0')
  ;['x-request-id', 'x-correlation-id'].forEach(header => {
    const value = response.headers.get(header)
    if (value) headers.set(header, value)
  })

  return NextResponse.json(
    {
      ...payload,
      ...data,
      documentId,
      document_id: documentId,
      storageBucket,
      storage_bucket: storageBucket,
      storagePath,
      storage_path: storagePath,
      url,
      mediaAccessUrl,
      media_access_url: mediaAccessUrl,
      previewUrl: url,
      preview_url: url,
      reusedExistingFile,
      reused_existing_file: reusedExistingFile,
      duplicateWarning,
      duplicate_warning: duplicateWarning || null,
      name,
      fileName: name,
      file_name: name,
      size,
      file_size: size,
      type,
      mime_type: type,
    },
    { status: response.status, headers }
  )
}

function stringRecordValue(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return value === undefined || value === null ? '' : String(value)
}

function numberRecordValue(record: Record<string, unknown>, key: string) {
  const value = Number(record[key] || 0)
  return Number.isFinite(value) ? value : 0
}

function stringValue(value: FormDataEntryValue | null, fallback: string) {
  const next = typeof value === 'string' ? value.trim() : ''
  return next || fallback
}

function nullableString(value: FormDataEntryValue | null) {
  const next = typeof value === 'string' ? value.trim() : ''
  return next || null
}

function booleanValue(value: FormDataEntryValue | null) {
  return value === 'true' || value === '1' || value === 'on'
}

function listValue(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return []
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function jsonValue(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}
