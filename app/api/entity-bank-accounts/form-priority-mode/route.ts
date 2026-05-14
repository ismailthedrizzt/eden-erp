import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { BankAccountAutoFillService } from '@/lib/modules/entity-bank-accounts/BankAccountAutoFillService'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { ENTITY_BANK_ACCOUNT_PERMISSIONS } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.types'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ENTITY_BANK_ACCOUNT_PERMISSIONS.view)
  if (permission instanceof NextResponse) return permission

  const { searchParams } = new URL(request.url)
  const entityKind = searchParams.get('entityKind')
  const entityId = searchParams.get('entityId')
  if ((entityKind !== 'person' && entityKind !== 'organization') || !entityId) {
    return NextResponse.json({ error: 'entityKind ve entityId zorunludur' }, { status: 400 })
  }

  try {
    const master = await new EntityBankAccountsService(supabase).getMaster(entityKind, entityId)
    return NextResponse.json({ data: { mode: BankAccountAutoFillService.getPriorityMode(master) } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Öncelik modu alınamadı' }, { status: 500 })
  }
}
