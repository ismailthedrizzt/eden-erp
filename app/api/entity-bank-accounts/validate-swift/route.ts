import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { BankAccountAutoFillService } from '@/lib/modules/entity-bank-accounts/BankAccountAutoFillService'
import { ENTITY_BANK_ACCOUNT_PERMISSIONS } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.types'

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ENTITY_BANK_ACCOUNT_PERMISSIONS.view)
  if (permission instanceof NextResponse) return permission

  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ data: BankAccountAutoFillService.validateSwift(String(body.swift_bic || body.swift || '')) })
}
