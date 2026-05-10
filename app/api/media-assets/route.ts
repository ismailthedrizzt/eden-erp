import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createServiceClient } from '@/lib/supabase/server'
import { invalidRequest, requireRegistryPermission, storagePathLooksSafe } from '@/lib/modules/document-registry/documentRegistry.server'

const CreateMediaAssetSchema = z.object({
  entity_kind: z.enum(['person', 'organization', 'company', 'vehicle']),
  person_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  linked_module: z.string().optional().nullable(),
  linked_record_id: z.string().uuid().optional().nullable(),
  media_type: z.enum(['profile_photo', 'logo', 'vehicle_photo', 'gallery']),
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  mime_type: z.string().min(1),
  is_primary: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requireRegistryPermission(request, supabase, 'media.view')
  if (permission instanceof NextResponse) return permission

  const { searchParams } = new URL(request.url)
  let query = supabase
    .from('media_assets')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  for (const key of ['entity_kind', 'person_id', 'organization_id', 'company_id', 'linked_module', 'linked_record_id', 'media_type']) {
    const value = searchParams.get(key)
    if (value) query = query.eq(key, value)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requireRegistryPermission(request, supabase, 'media.insert')
  if (permission instanceof NextResponse) return permission

  const parsed = CreateMediaAssetSchema.safeParse(await request.json())
  if (!parsed.success) return invalidRequest('Geçersiz medya verisi', parsed.error.flatten())
  if (!storagePathLooksSafe(parsed.data.storage_path)) return invalidRequest('Geçersiz depolama yolu')

  if (parsed.data.is_primary) {
    let reset = supabase
      .from('media_assets')
      .update({ is_primary: false })
      .eq('media_type', parsed.data.media_type)
      .eq('is_deleted', false)

    if (parsed.data.person_id) reset = reset.eq('person_id', parsed.data.person_id)
    else if (parsed.data.organization_id) reset = reset.eq('organization_id', parsed.data.organization_id)
    else if (parsed.data.company_id) reset = reset.eq('company_id', parsed.data.company_id)
    await reset
  }

  const { data, error } = await supabase
    .from('media_assets')
    .insert({ ...parsed.data, created_by: permission.userId })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
