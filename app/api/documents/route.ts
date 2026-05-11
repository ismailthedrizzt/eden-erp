import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createServiceClient } from '@/lib/supabase/server'
import { invalidRequest, maskDocumentForUnauthorizedUser, requireRegistryPermission, storagePathLooksSafe } from '@/lib/modules/document-registry/documentRegistry.server'
import { DOCUMENT_TYPES } from '@/lib/modules/document-registry/documentRegistry.types'

const FileSchema = z.object({
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  mime_type: z.string().min(1),
  file_size: z.coerce.number().int().nonnegative(),
  file_hash: z.string().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
})

const CreateDocumentSchema = z.object({
  company_id: z.string().uuid().optional().nullable(),
  document_type: z.enum(DOCUMENT_TYPES),
  document_title: z.string().min(1),
  document_no: z.string().optional().nullable(),
  issue_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  issuing_authority: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'expired', 'revoked', 'archived']).default('active'),
  confidentiality_level: z.enum(['public', 'internal', 'confidential', 'sensitive']).default('internal'),
  file: FileSchema,
})

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requireRegistryPermission(request, supabase, 'documents.view')
  if (permission instanceof NextResponse) return permission

  const sensitivePermission = await requireRegistryPermission(request, supabase, 'documents.view_sensitive')
  const canViewSensitive = !(sensitivePermission instanceof NextResponse)
  const { searchParams } = new URL(request.url)

  let query = supabase
    .from('documents')
    .select('*, document_files(*), document_links(*)')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })

  const companyId = searchParams.get('company_id')
  const documentType = searchParams.get('document_type')
  const q = searchParams.get('q')
  if (companyId) query = query.eq('company_id', companyId)
  if (documentType) query = query.eq('document_type', documentType)
  if (q) query = query.or(`document_title.ilike.%${q}%,document_no.ilike.%${q}%,issuing_authority.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

  let documents = data || []
  const linkedModule = searchParams.get('linked_module')
  const linkedRecordId = searchParams.get('linked_record_id')
  const linkType = searchParams.get('link_type')
  if (linkedModule || linkedRecordId || linkType) {
    documents = documents.filter((document: any) =>
      (document.document_links || []).some((link: any) =>
        !link.is_deleted &&
        (!linkedModule || link.linked_module === linkedModule) &&
        (!linkedRecordId || link.linked_record_id === linkedRecordId) &&
        (!linkType || link.link_type === linkType)
      )
    )
  }

  return NextResponse.json({
    data: canViewSensitive ? documents : documents.map(maskDocumentForUnauthorizedUser),
  })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requireRegistryPermission(request, supabase, 'documents.insert')
  if (permission instanceof NextResponse) return permission

  const parsed = CreateDocumentSchema.safeParse(await request.json())
  if (!parsed.success) return invalidRequest('Geçersiz belge verisi', parsed.error.flatten())
  if (!storagePathLooksSafe(parsed.data.file.storage_path)) return invalidRequest('Geçersiz depolama yolu')

  const { file, ...documentInput } = parsed.data
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .insert({
      ...documentInput,
      created_by: permission.userId,
      updated_by: permission.userId,
    })
    .select('*')
    .single()

  if (documentError) return NextResponse.json({ error: documentError.message, code: documentError.code || 'CREATE_FAILED' }, { status: 500 })

  let { error: fileError } = await supabase
    .from('document_files')
    .insert({
      ...file,
      document_id: document.id,
      uploaded_by: permission.userId,
      version_no: 1,
      is_current_version: true,
    })

  if (fileError && fileError.message?.includes('thumbnail_url')) {
    const { thumbnail_url, ...fileWithoutThumbnail } = file
    const retry = await supabase
      .from('document_files')
      .insert({
        ...fileWithoutThumbnail,
        document_id: document.id,
        uploaded_by: permission.userId,
        version_no: 1,
        is_current_version: true,
      })
    fileError = retry.error
  }

  if (fileError) return NextResponse.json({ error: fileError.message, code: fileError.code || 'FILE_CREATE_FAILED' }, { status: 500 })

  const { data } = await supabase
    .from('documents')
    .select('*, document_files(*), document_links(*)')
    .eq('id', document.id)
    .single()

  return NextResponse.json({ data }, { status: 201 })
}
