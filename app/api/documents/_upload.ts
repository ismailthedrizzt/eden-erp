import { NextResponse } from 'next/server'
import { documentsBackendUnavailable, proxyToFastApiDocuments } from './_proxy'
import type { NextRequest } from 'next/server'

export async function proxyDocumentUpload(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApiDocuments(request, targetPath, { timeoutMs: 45000, internal: true })
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
  const url = stringRecordValue(data, 'url') || stringRecordValue(data, 'previewUrl') || stringRecordValue(data, 'preview_url') || (storagePath ? '/api/media/open?storageBucket=' + encodeURIComponent(storageBucket) + '&storagePath=' + encodeURIComponent(storagePath) + '&download=0' : '')
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
