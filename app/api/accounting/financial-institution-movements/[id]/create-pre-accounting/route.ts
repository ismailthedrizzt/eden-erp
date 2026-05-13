import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.preAccountingInsert)
  if (permission instanceof NextResponse) return permission

  return NextResponse.json({
    data: {
      redirectUrl: `/app/muhasebe/on-muhasebe-hareketleri?sourceMovementId=${id}`,
    },
  })
}
