import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { EntityBankAccountSchema, EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { ENTITY_BANK_ACCOUNT_PERMISSIONS } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.types'

type Params = { params: Promise<{ entityKind: string; entityId: string }> }

function parseKind(value: string) {
  return value === 'person' || value === 'organization' ? value : null
}

export async function GET(request: NextRequest, { params }: Params) {
  const { entityKind, entityId } = await params
  const kind = parseKind(entityKind)
  if (!kind) return NextResponse.json({ error: 'Geçersiz entity kind' }, { status: 400 })

  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ENTITY_BANK_ACCOUNT_PERMISSIONS.view)
  if (permission instanceof NextResponse) return permission

  try {
    const service = new EntityBankAccountsService(supabase)
    const data = await service.list(kind, entityId)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Banka bilgileri alınamadı' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { entityKind, entityId } = await params
  const kind = parseKind(entityKind)
  if (!kind) return NextResponse.json({ error: 'Geçersiz entity kind' }, { status: 400 })

  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ENTITY_BANK_ACCOUNT_PERMISSIONS.insert)
  if (permission instanceof NextResponse) return permission

  const parsed = EntityBankAccountSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Geçersiz banka bilgisi', details: parsed.error.flatten() }, { status: 400 })

  try {
    const service = new EntityBankAccountsService(supabase)
    const data = await service.create(kind, entityId, parsed.data, permission.userId)
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Banka bilgisi kaydedilemedi' }, { status: 500 })
  }
}
