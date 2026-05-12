import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/server'

const DOCUMENT_BUCKET = 'eden-documents'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')
  const slotId = safePathPart(String(formData.get('slotId') || 'document'))

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Dosya bulunamadı', code: 'FILE_REQUIRED' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const fileName = safeFileName(file.name || 'document')
  const storagePath = `form-documents/${slotId}/${Date.now()}-${crypto.randomUUID()}-${fileName}`
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

  return NextResponse.json({
    storagePath,
    url: data.signedUrl,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  })
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
