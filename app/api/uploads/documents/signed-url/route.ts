import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { DOCUMENT_BUCKET, DOCUMENT_THUMBNAIL_PREFIX } from '@/lib/documents/documentStorage'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'documents.export')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)

  const body = await request.json().catch(() => ({}))
  const storagePath = String(body.storagePath || '')

  if (!storagePath || storagePath.includes('..') || storagePath.startsWith('/') || /^https?:\/\//i.test(storagePath)) {
    return NextResponse.json({ error: 'Geçersiz dosya yolu', code: 'INVALID_STORAGE_PATH' }, { status: 400 })
  }

  const allowedPrefixes = [
    `form-documents/${tenantContext.tenantId}/`,
    `${DOCUMENT_THUMBNAIL_PREFIX}/${tenantContext.tenantId}/`,
  ]

  if (!allowedPrefixes.some(prefix => storagePath.startsWith(prefix))) {
    return NextResponse.json({ error: 'Dosya yolu bu calisma alanina ait degil', code: 'STORAGE_PATH_FORBIDDEN' }, { status: 403 })
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24)

  if (error) {
    return NextResponse.json({ error: error.message, code: 'SIGNED_URL_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ signedUrl: data.signedUrl })
}
