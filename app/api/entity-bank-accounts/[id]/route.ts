import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { EntityBankAccountSchema, EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { ENTITY_BANK_ACCOUNT_PERMISSIONS } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.types'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ENTITY_BANK_ACCOUNT_PERMISSIONS.view)
  if (permission instanceof NextResponse) return permission

  try {
    const data = await new EntityBankAccountsService(supabase).get(id)
    if (!data) return NextResponse.json({ error: 'Banka hesabı bulunamadı' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Banka hesabı alınamadı' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ENTITY_BANK_ACCOUNT_PERMISSIONS.edit)
  if (permission instanceof NextResponse) return permission

  const parsed = EntityBankAccountSchema.partial().safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Geçersiz banka bilgisi', details: parsed.error.flatten() }, { status: 400 })

  try {
    const data = await new EntityBankAccountsService(supabase).update(id, parsed.data, permission.userId)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Banka hesabı güncellenemedi' }, { status: 500 })
  }
}
