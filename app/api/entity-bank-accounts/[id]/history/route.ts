import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { ENTITY_BANK_ACCOUNT_PERMISSIONS } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.types'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ENTITY_BANK_ACCOUNT_PERMISSIONS.view)
  if (permission instanceof NextResponse) return permission

  try {
    const data = await new EntityBankAccountsService(supabase).get(id)
    if (!data) return NextResponse.json({ error: 'Banka hesabı bulunamadı' }, { status: 404 })
    return NextResponse.json({ data: data.history || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Geçmiş alınamadı' }, { status: 500 })
  }
}
