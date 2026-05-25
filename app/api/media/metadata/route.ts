import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { loadEntityMediaMetadata } from '@/lib/media/mediaMetadata.server'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'documents.view')
  if (permission instanceof NextResponse) return permission

  const entityType = request.nextUrl.searchParams.get('entity_type') || ''
  const entityId = request.nextUrl.searchParams.get('entity_id') || ''
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entity_type ve entity_id zorunludur.', code: 'MEDIA_METADATA_INPUT_REQUIRED' }, { status: 400 })
  }

  const result = await loadEntityMediaMetadata(supabase, resolveTenantContext(request), entityType, entityId)
  if (!result.ok) return NextResponse.json({ error: result.error, code: result.code }, { status: result.status })
  return NextResponse.json({ data: result.data })
}

