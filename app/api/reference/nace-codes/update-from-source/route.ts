import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { NaceReferenceUpdateService } from '@/lib/modules/companies/nace/naceReference.service'

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'nace_reference.update')
  if (permission instanceof NextResponse) return permission

  const service = new NaceReferenceUpdateService(supabase as any)
  const result = await service.updateFromTrustedSources()
  return NextResponse.json({ data: result })
}
