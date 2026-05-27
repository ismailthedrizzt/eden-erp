// BACKEND_MIGRATION_STATUS: keep_upload_adapter
// TARGET_BACKEND_MODULE: documents
// TARGET_FASTAPI_ENDPOINT: n/a
// NOTES: Upload adapter may stay in Next while document business policy moves to FastAPI.

import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { createAndUploadDocumentThumbnail, DOCUMENT_BUCKET } from '@/lib/documents/documentThumbnails.server'

export const runtime = 'nodejs'

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
])

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'documents.export')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)

  const formData = await request.formData()
  const file = formData.get('file')
  const slotId = safePathPart(String(formData.get('slotId') || 'document'))

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Dosya bulunamadı', code: 'FILE_REQUIRED' }, { status: 400 })
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: 'Dosya cok buyuk', code: 'FILE_TOO_LARGE' }, { status: 413 })
  }

  if (!ALLOWED_DOCUMENT_TYPES.has(file.type || '')) {
    return NextResponse.json({ error: 'Dosya turu desteklenmiyor', code: 'INVALID_FILE_TYPE' }, { status: 400 })
  }

  const fileName = safeFileName(file.name || 'document')
  const storagePath = `form-documents/${tenantContext.tenantId}/${slotId}/${Date.now()}-${crypto.randomUUID()}-${fileName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (error) {
    return NextResponse.json({ error: error.message, code: 'UPLOAD_FAILED' }, { status: 500 })
  }

  const { data, error: signedError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24)

  if (signedError) {
    return NextResponse.json({ error: signedError.message, code: 'SIGNED_URL_FAILED' }, { status: 500 })
  }

  const thumbnail = await createDocumentThumbnailSafely(supabase, {
    buffer,
    mimeType: file.type || 'application/octet-stream',
    storagePath,
    tenantId: tenantContext.tenantId,
    fileName: file.name,
  })

  return NextResponse.json({
    storagePath,
    url: data.signedUrl,
    thumbnailPath: thumbnail?.storagePath,
    thumbnailUrl: thumbnail?.signedUrl,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  })
}

async function createDocumentThumbnailSafely(
  supabase: ReturnType<typeof createServiceClient>,
  input: {
    buffer: Buffer
    mimeType: string
    storagePath: string
    tenantId: string
    fileName: string
  }
) {
  try {
    return await createAndUploadDocumentThumbnail(supabase, {
      buffer: input.buffer,
      mimeType: input.mimeType,
      sourceStoragePath: input.storagePath,
      tenantId: input.tenantId,
      fileName: input.fileName,
    })
  } catch (error) {
    console.warn('Document thumbnail could not be generated', error)
    return null
  }
}

function safePathPart(value: string) {
  return toAsciiSafe(value).replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'document'
}

function safeFileName(value: string) {
  const normalized = toAsciiSafe(value)
  const cleaned = normalized
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  return cleaned || 'document'
}

function toAsciiSafe(value: string) {
  return value
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}
