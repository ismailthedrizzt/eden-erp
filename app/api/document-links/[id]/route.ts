import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/server'
import { requireRegistryPermission } from '@/lib/modules/document-registry/documentRegistry.server'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const permission = await requireRegistryPermission(request, supabase, 'documents.unlink')
  if (permission instanceof NextResponse) return permission

  const { id } = await params
  const { error } = await supabase
    .from('document_links')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: permission.userId,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UNLINK_FAILED' }, { status: 500 })
  return NextResponse.json({ success: true })
}
