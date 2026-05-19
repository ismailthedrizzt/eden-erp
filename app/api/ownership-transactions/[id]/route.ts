import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { OWNERSHIP_TRANSACTION_SELECT, validateDraft } from '../_shared'
import {
  safeHardDeleteDraftRecord,
  safeHardDeleteDraftRecordResponse,
  type SafeHardDeleteReferenceCheck,
} from '@/lib/workflow/safeHardDeleteDraftRecord'
import { safeCrudResponse, safeReadRecord, safeUpdateRecord } from '@/lib/crud/safeCrudService'

const LOCKED_WHEN_APPROVED = new Set([
  'company_id',
  'transaction_type',
  'transaction_date',
  'effective_date',
  'from_partner_id',
  'to_partner_id',
  'affected_partner_id',
  'share_ratio',
  'voting_ratio',
  'profit_ratio',
  'has_veto_right',
  'has_board_nomination_right',
  'has_privileged_share',
  'privilege_type',
  'privilege_description',
  'privilege_start_date',
  'privilege_end_date',
  'removed_privilege_type',
  'removal_date',
  'old_voting_ratio',
  'new_voting_ratio',
  'old_profit_ratio',
  'new_profit_ratio',
])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const result = await safeReadRecord({
    supabase,
    request,
    tableName: 'ownership_transactions',
    recordId: id,
    select: OWNERSHIP_TRANSACTION_SELECT,
    notDeletedField: 'is_deleted',
  })

  return safeCrudResponse(result)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const result = await safeUpdateRecord({
    supabase,
    request,
    tableName: 'ownership_transactions',
    recordId: id,
    patch: body,
    select: OWNERSHIP_TRANSACTION_SELECT,
    currentSelect: OWNERSHIP_TRANSACTION_SELECT,
    notDeletedField: 'is_deleted',
    versionField: 'version',
    guard: async ({ current, patch }) => {
      if (current.approval_status === 'approved' && Object.keys(patch).some(key => LOCKED_WHEN_APPROVED.has(key))) {
        return {
          ok: false,
          status: 409,
          code: 'APPROVED_RECORD_LOCKED',
          error: 'Onayli islem sessizce degistirilemez. Ters kayit veya duzeltme kaydi olusturun.',
        }
      }

      const validation = await validateDraft(supabase, { ...current, ...patch })
      if (!validation.ok) {
        return {
          ok: false,
          status: 400,
          code: validation.code || 'VALIDATION_FAILED',
          error: validation.error || 'Ortaklik islemi dogrulanamadi.',
        }
      }
      return { ok: true }
    },
    beforeUpdate: async ({ current, patch }) => {
      const validation = await validateDraft(supabase, { ...current, ...patch })
      return {
        ...patch,
        warnings: validation.ok ? validation.warnings : [],
        history: [
          ...(Array.isArray(current.history) ? current.history : []),
          ...Object.entries(patch).map(([field, nextValue]) => ({
            field,
            old_value: current[field],
            new_value: nextValue,
            changed_at: new Date().toISOString(),
            changed_by: 'Sistem Kullanicisi',
          })),
        ],
      }
    },
  })

  return safeCrudResponse(result)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const draftDelete = await safeHardDeleteDraftRecord({
    supabase,
    request,
    tableName: 'ownership_transactions',
    recordId: id,
    select: OWNERSHIP_TRANSACTION_SELECT,
    lifecycleStatusField: 'approval_status',
    draftStatusValue: 'draft',
    permissionKey: ['ownership_transactions.edit', 'companies.edit'],
    referenceChecks: ownershipTransactionDraftDeleteReferenceChecks(),
  })

  if (draftDelete.ok) return safeHardDeleteDraftRecordResponse(draftDelete)
  if (draftDelete.code !== 'NOT_DRAFT_RECORD') return safeHardDeleteDraftRecordResponse(draftDelete)

  const { error } = await supabase
    .from('ownership_transactions')
    .update({
      is_deleted: true,
      status: 'passive',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'SOFT_DELETE_FAILED' }, { status: 500 })
  return NextResponse.json({ success: true })
}

function ownershipTransactionDraftDeleteReferenceChecks(): SafeHardDeleteReferenceCheck[] {
  return [
    { tableName: 'ownership_transactions', foreignKey: 'correction_transaction_id', label: 'Duzeltme islemleri', optional: true },
    { tableName: 'ownership_transactions', foreignKey: 'reversal_transaction_id', label: 'Ters kayit islemleri', optional: true },
    { tableName: 'account_movements', foreignKey: 'linked_ownership_transaction_id', label: 'Muhasebe hareketleri', optional: true },
  ]
}
