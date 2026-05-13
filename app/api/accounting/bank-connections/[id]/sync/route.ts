import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { BankSyncService } from '@/lib/modules/accounting/bank-integration/BankSyncService'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingTableError } from '../../../_banking'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsSync)
  if (permission instanceof NextResponse) return permission

  try {
    const service = new BankSyncService(supabase as any)
    const summary = await service.syncConnection(id)
    return NextResponse.json({ data: summary })
  } catch (error) {
    if (isMissingTableError(error)) {
      const service = new BankSyncService(supabase as any)
      const summary = await service.syncConnection(id)
      return NextResponse.json({ data: summary })
    }
    const message = error instanceof Error ? error.message : 'Bank sync failed'
    return NextResponse.json({ error: message, code: 'BANK_SYNC_FAILED' }, { status: 500 })
  }
}
