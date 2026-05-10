import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/server'
import { auditRegistryEvent, MEDIA_STORAGE_BUCKET, requireRegistryPermission } from '@/lib/modules/document-registry/documentRegistry.server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const permission = await requireRegistryPermission(request, supabase, 'media.view')
  if (permission instanceof NextResponse) return permission

  const { id } = await params
  const { data: asset, error: assetError } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (assetError) return NextResponse.json({ error: assetError.message, code: assetError.code || 'MEDIA_NOT_FOUND' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from(MEDIA_STORAGE_BUCKET)
    .createSignedUrl(asset.storage_path, 300)

  if (error) return NextResponse.json({ error: error.message, code: 'SIGNED_URL_FAILED' }, { status: 500 })

  await auditRegistryEvent(supabase, permission.userId, 'media_assets', asset.id, 'media_viewed', { media_asset_id: asset.id })
  return NextResponse.json({ signedUrl: data.signedUrl })
}
