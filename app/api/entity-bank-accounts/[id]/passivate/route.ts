import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { ENTITY_BANK_ACCOUNT_PERMISSIONS } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.types'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ENTITY_BANK_ACCOUNT_PERMISSIONS.passivate)
  if (permission instanceof NextResponse) return permission

  try {
    const data = await new EntityBankAccountsService(supabase).passivate(id, permission.userId)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Banka hesabı pasifleştirilemedi' }, { status: 500 })
  }
}
