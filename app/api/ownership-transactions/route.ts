import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { nextTransactionNo, validateDraft } from './_shared'

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
  transfer_price: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().default('TRY'),
  has_control_right: z.boolean().default(false),
  control_type: z.string().optional().nullable(),
  has_veto_right: z.boolean().default(false),
  has_board_nomination_right: z.boolean().default(false),
  has_privileged_share: z.boolean().default(false),
  privilege_type: z.string().optional().nullable(),
  is_beneficial_owner: z.boolean().default(false),
  beneficial_ratio: z.coerce.number().min(0).optional().nullable(),
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
  const companyId = searchParams.get('company_id')
  const approvalStatus = searchParams.get('approval_status')

  let query = supabase
    .from('ownership_transactions')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('company_id', companyId)
  if (approvalStatus) query = query.eq('approval_status', approvalStatus)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
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

  const { data, error } = await supabase
    .from('ownership_transactions')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
