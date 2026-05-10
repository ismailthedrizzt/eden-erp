import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createServiceClient } from '@/lib/supabase/server'
import { invalidRequest, requireRegistryPermission } from '@/lib/modules/document-registry/documentRegistry.server'

const CreateDocumentLinkSchema = z.object({
  document_id: z.string().uuid(),
  linked_module: z.string().min(1),
  linked_record_id: z.string().uuid(),
  link_type: z.string().min(1),
  notes: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requireRegistryPermission(request, supabase, 'documents.link')
  if (permission instanceof NextResponse) return permission

  const parsed = CreateDocumentLinkSchema.safeParse(await request.json())
  if (!parsed.success) return invalidRequest('Geçersiz belge bağlantısı', parsed.error.flatten())

  const { data, error } = await supabase
    .from('document_links')
    .insert({
      ...parsed.data,
      created_by: permission.userId,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'LINK_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
