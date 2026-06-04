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
    tags: listValue(formData.get('tags')),
    metadata_json: jsonValue(formData.get('metadata_json')),
  }

  const response = await proxyJsonToFastApi(request, targetPath, payload, { timeoutMs: 45000 })
  return response || documentsBackendUnavailable()
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

