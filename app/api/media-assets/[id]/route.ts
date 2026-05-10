import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createServiceClient } from '@/lib/supabase/server'
import { requireRegistryPermission } from '@/lib/modules/document-registry/documentRegistry.server'

const UpdateMediaAssetSchema = z.object({
  linked_module: z.string().optional().nullable(),
  linked_record_id: z.string().uuid().optional().nullable(),
  is_primary: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const permission = await requireRegistryPermission(request, supabase, 'media.link')
  if (permission instanceof NextResponse) return permission

  const parsed = UpdateMediaAssetSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Geçersiz medya bağlantısı', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })

  const { id } = await params
  const { data, error } = await supabase
    .from('media_assets')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}
