import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { OWNERSHIP_TRANSACTION_SELECT, nextTransactionNo, validateDraft } from './_shared'
import { listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { safeCreateRecord, safeCrudResponse, safeListRecords } from '@/lib/crud/safeCrudService'
import { requirePermission } from '@/lib/security/serverPermissions'

const TransactionSchema = z.object({
  company_id: z.string().uuid(),
  transaction_no: z.string().optional(),
  transaction_type: z.string().min(1),
  transaction_date: z.string().min(1),
  effective_date: z.string().min(1),
  from_partner_id: z.string().uuid().optional().nullable(),
  to_partner_id: z.string().uuid().optional().nullable(),
  affected_partner_id: z.string().uuid().optional().nullable(),
  share_ratio: z.coerce.number().min(0).optional().nullable(),
  voting_ratio: z.coerce.number().min(0).optional().nullable(),
  profit_ratio: z.coerce.number().min(0).optional().nullable(),
  share_units: z.coerce.number().min(0).optional().nullable(),
  nominal_value: z.coerce.number().min(0).optional().nullable(),
  capital_amount: z.coerce.number().min(0).optional().nullable(),
  committed_capital_amount: z.coerce.number().min(0).optional().nullable(),
  new_capital_amount: z.coerce.number().min(0).optional().nullable(),
  commitment_date: z.string().optional().nullable(),
  capital_distribution: z.array(z.record(z.any())).optional().nullable(),
  currency: z.string().optional().nullable(),
  has_control_right: z.boolean().default(false),
  control_type: z.string().optional().nullable(),
  has_veto_right: z.boolean().default(false),
  has_board_nomination_right: z.boolean().default(false),
  has_privileged_share: z.boolean().default(false),
  is_beneficial_owner: z.boolean().default(false),
  beneficial_ratio: z.coerce.number().min(0).max(100).optional().nullable(),
  privilege_type: z.string().optional().nullable(),
  privilege_description: z.string().optional().nullable(),
  privilege_start_date: z.string().optional().nullable(),
  privilege_end_date: z.string().optional().nullable(),
  removed_privilege_type: z.string().optional().nullable(),
  removal_date: z.string().optional().nullable(),
  old_voting_ratio: z.coerce.number().min(0).optional().nullable(),
  new_voting_ratio: z.coerce.number().min(0).optional().nullable(),
  old_profit_ratio: z.coerce.number().min(0).optional().nullable(),
  new_profit_ratio: z.coerce.number().min(0).optional().nullable(),
  correction_transaction_id: z.string().uuid().optional().nullable(),
  correction_reason: z.string().optional().nullable(),
  new_values: z.record(z.any()).optional().nullable(),
  reversal_transaction_id: z.string().uuid().optional().nullable(),
  reversal_reason: z.string().optional().nullable(),
  document_status: z.string().default('Belge Yok'),
  document_reference_id: z.string().optional().nullable(),
  decision_reference_id: z.string().optional().nullable(),
  document_files: z.array(z.record(z.any())).default([]),
  status: z.string().default('draft'),
  approval_status: z.string().default('draft'),
  workflow_status: z.string().default('draft'),
  description: z.string().optional().nullable(),
  transaction_reason: z.string().optional().nullable(),
  exit_reason: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'created_at', direction: 'desc' })
  const sortMap: Record<string, string> = {
    transaction_no: 'transaction_no',
    transaction_type: 'transaction_type',
    transaction_date: 'transaction_date',
    status: 'status',
    approval_status: 'approval_status',
    created_at: 'created_at',
  }
  const companyId = searchParams.get('company_id')
  const approvalStatus = searchParams.get('approval_status')
  const result = await safeListRecords({
    supabase,
    request,
    tableName: 'ownership_transactions',
    permissionKey: ['ownership_transactions.view', 'companies.view'],
    select: OWNERSHIP_TRANSACTION_SELECT,
    listQuery,
    sortMap,
    defaultSort: 'created_at',
    passiveField: 'is_deleted',
    searchFields: ['transaction_no', 'transaction_type', 'notes'],
    filters: {
      ...(companyId ? { company_id: companyId } : {}),
      ...(approvalStatus ? { approval_status: approvalStatus } : {}),
    },
  })

  return safeCrudResponse(result)
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'ownership_transactions.edit')
  if (permission instanceof NextResponse) return permission
  const body = await request.json()
  const parsed = TransactionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const validation = await validateDraft(supabase, parsed.data)
  if (!validation.ok) return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 })

  const now = new Date().toISOString()
  const row = {
    ...parsed.data,
    transaction_no: parsed.data.transaction_no || await nextTransactionNo(supabase),
    warnings: validation.warnings,
    history: [{ action: 'İşlem oluşturuldu', changed_at: now, changed_by: 'Sistem Kullanıcısı' }],
    created_at: now,
    updated_at: now,
  }

  const result = await safeCreateRecord({
    supabase,
    request,
    tableName: 'ownership_transactions',
    permissionKey: ['ownership_transactions.edit', 'companies.edit'],
    values: row,
    select: OWNERSHIP_TRANSACTION_SELECT,
  })

  return safeCrudResponse(result, 201)
}
