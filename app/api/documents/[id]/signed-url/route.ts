import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createServiceClient } from '@/lib/supabase/server'
import { auditRegistryEvent, DOCUMENT_STORAGE_BUCKET, requireRegistryPermission, requireSensitiveDocumentAccess } from '@/lib/modules/document-registry/documentRegistry.server'

const SignedUrlSchema = z.object({
  file_id: z.string().uuid().optional(),
  download: z.boolean().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const { id } = await params
  const parsed = SignedUrlSchema.safeParse(await request.json().catch(() => ({})))
  const fileId = parsed.success ? parsed.data.file_id : undefined
  const isDownload = parsed.success && parsed.data.download
  const permission = await requireRegistryPermission(request, supabase, isDownload ? 'documents.download' : 'documents.view')
  if (permission instanceof NextResponse) return permission

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (documentError) return NextResponse.json({ error: documentError.message, code: documentError.code || 'DOCUMENT_NOT_FOUND' }, { status: 404 })

  const sensitiveAccess = await requireSensitiveDocumentAccess(request, supabase, document)
  if (sensitiveAccess instanceof NextResponse) return sensitiveAccess

  let fileQuery = supabase.from('document_files').select('*').eq('document_id', id)
  fileQuery = fileId ? fileQuery.eq('id', fileId) : fileQuery.eq('is_current_version', true)
  const { data: file, error: fileError } = await fileQuery.single()
  if (fileError) return NextResponse.json({ error: fileError.message, code: fileError.code || 'FILE_NOT_FOUND' }, { status: 404 })

  if (typeof file.storage_path === 'string' && file.storage_path.startsWith('data:')) {
    return NextResponse.json({ signedUrl: file.storage_path })
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, 300, { download: parsed.success ? parsed.data.download : false })

  if (error) return NextResponse.json({ error: error.message, code: 'SIGNED_URL_FAILED' }, { status: 500 })

  await auditRegistryEvent(supabase, permission.userId, 'document_files', file.id, parsed.success && parsed.data.download ? 'document_downloaded' : 'document_viewed', {
    document_id: id,
    file_id: file.id,
  })

  return NextResponse.json({ signedUrl: data.signedUrl })
}
