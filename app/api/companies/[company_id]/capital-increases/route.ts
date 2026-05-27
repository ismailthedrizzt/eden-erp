// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: ownership
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/capital-increases
// NOTES: Capital increase mutation chain belongs in Python Company/Ownership domains.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { duplicateOperationJsonResponse } from '@/lib/operations/apiResponse'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import {
  CAPITAL_INCREASE_SELECT,
  CAPITAL_INCREASE_TYPES,
  CAPITAL_SOURCES,
  buildCapitalIncreasePrecheck,
  capitalIncreaseError,
  ensureCapitalIncreaseAccess,
  getCompanyLifecycle,
  nextCapitalIncreaseNo,
  numberValue,
  roundMoney,
  roundRatio,
  withCapitalTenant,
  type CapitalPartnerSnapshot,
} from './_shared'

const ParticipantSchema = z.object({
  partner_id: z.string().uuid(),
  old_committed_capital_amount: z.coerce.number().min(0).optional().nullable(),
  increase_amount: z.coerce.number().min(0),
  new_committed_capital_amount: z.coerce.number().min(0),
  old_share_ratio: z.coerce.number().min(0).optional().nullable(),
  new_share_ratio: z.coerce.number().min(0).max(100).optional().nullable(),
  old_voting_ratio: z.coerce.number().min(0).optional().nullable(),
  new_voting_ratio: z.coerce.number().min(0).max(100).optional().nullable(),
  old_profit_ratio: z.coerce.number().min(0).optional().nullable(),
  new_profit_ratio: z.coerce.number().min(0).max(100).optional().nullable(),
  capital_source: z.enum(CAPITAL_SOURCES).optional().nullable(),
  description: z.string().optional().nullable(),
})

const DocumentSchema = z.object({
  slotId: z.string(),
  storagePath: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  size: z.coerce.number().optional().nullable(),
  type: z.string().optional().nullable(),
  uploadedAt: z.any().optional().nullable(),
  status: z.string().optional().nullable(),
  version: z.coerce.number().optional().nullable(),
  url: z.string().optional().nullable(),
  previewUrl: z.string().optional().nullable(),
  thumbnailPath: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
})

const CapitalIncreaseSchema = z.object({
  increase_type: z.enum(CAPITAL_INCREASE_TYPES).default(CAPITAL_INCREASE_TYPES[0]),
  transaction_date: z.string().min(1),
  effective_date: z.string().min(1),
  registration_date: z.string().optional().nullable(),
  old_capital_amount: z.coerce.number().min(0),
  increase_amount: z.coerce.number().positive(),
  new_capital_amount: z.coerce.number().positive(),
  currency: z.string().min(1).default('TRY'),
  increase_reason: z.string().min(1),
  distribution_method: z.enum(['proportional', 'manual']),
  participants: z.array(ParticipantSchema).default([]),
  notes: z.string().optional().nullable(),
  document_files: z.array(DocumentSchema).default([]),
  document_meta: z.record(z.object({
    document_date: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  })).default({}),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const supabase = createServiceClient()
  const access = await ensureCapitalIncreaseAccess(request, supabase, companyId, 'companies.edit')
  if (access.response) return access.response

  const rawBody = await request.json().catch(() => ({}))
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const body = stripOperationControlFields(rawBody)
  const parsed = CapitalIncreaseSchema.safeParse(body)

  if (!parsed.success) {
    return capitalIncreaseError('Geçersiz sermaye artırımı verisi.', 'VALIDATION_FAILED', 400, { validation: parsed.error.flatten() })
  }

  const input = parsed.data
  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: access.tenantContext.tenantId,
    companyId,
    moduleKey: 'sirket',
    entityType: 'company',
    entityId: companyId,
    operationType: 'company.capital_increase',
    clientRequestId,
    baseVersion,
    baseUpdatedAt,
    requestedBy: access.userId || null,
    payload: input,
  })
  if (operationCreate.ok && operationCreate.duplicate) return duplicateOperationJsonResponse(operationCreate.operation)
  if (!operationCreate.ok && !operationCreate.missingInfrastructure) {
    return capitalIncreaseError(operationCreate.error, operationCreate.code || 'OPERATION_REQUEST_FAILED', 500)
  }

  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await operationService.markProcessing(operation.id)

  const fail = async (message: string, code: string, status = 400, details?: Record<string, unknown>) => {
    if (operation) {
      await operationService.markFailed(operation.id, { code, error: message, details: details || {} })
    }
    return capitalIncreaseError(message, code, status, details, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }

  try {
    const precheck = await buildCapitalIncreasePrecheck(supabase, companyId, access.tenantContext)
    if (!precheck.ok) {
      const code = precheck.dependency_code || 'CAPITAL_INCREASE_PRECHECK_FAILED'
      const details = {
        ...(precheck.dependency_details || {}),
        reasons: precheck.blocking_reasons,
        warnings: precheck.warnings,
      }
      return fail(precheck.message || 'Sermaye artırımı ön kontrolü başarısız.', code, precheck.dependency_code ? 409 : 400, details)
    }

    let companyQuery = supabase
      .from('companies')
      .select('id,committed_capital_amount,paid_capital_amount,record_status,company_status,is_deleted,version,updated_at')
      .eq('id', companyId)
    companyQuery = applyTenantQueryScope(companyQuery, 'companies', access.tenantContext)
    const { data: company, error: companyError } = await companyQuery.maybeSingle()
    if (companyError) return fail(companyError.message, companyError.code || 'COMPANY_FETCH_FAILED', 500)
    if (!company) return fail('Şirket bulunamadı.', 'COMPANY_NOT_FOUND', 404)
    if (getCompanyLifecycle(company as Record<string, any>) !== 'active') {
      return fail('Sermaye artırımı yalnızca aktif şirketlerde başlatılabilir.', 'COMPANY_NOT_ACTIVE', 409)
    }

    if (baseVersion !== null && Number((company as Record<string, any>).version || 0) !== baseVersion) {
      return fail('Şirket kaydı bu işlem hazırlanırken değişmiş. Lütfen kaydı yenileyip tekrar deneyin.', 'VERSION_CONFLICT', 409, {
        expected: baseVersion,
        current: (company as Record<string, any>).version,
      })
    }
    if (baseUpdatedAt && String((company as Record<string, any>).updated_at || '') !== baseUpdatedAt) {
      return fail('Şirket kaydı bu işlem hazırlanırken güncellenmiş. Lütfen kaydı yenileyip tekrar deneyin.', 'UPDATED_AT_CONFLICT', 409, {
        expected: baseUpdatedAt,
        current: (company as Record<string, any>).updated_at,
      })
    }

    const oldCapital = roundMoney(precheck.current_capital_amount)
    const increaseAmount = roundMoney(input.increase_amount)
    const newCapital = roundMoney(input.new_capital_amount)
    if (oldCapital <= 0) return fail('Eski sermaye bilgisi bulunamadı. Sermaye artırımı başlatılamaz.', 'OLD_CAPITAL_REQUIRED')
    if (increaseAmount <= 0) return fail('Artırılacak tutar 0’dan büyük olmalıdır.', 'INCREASE_AMOUNT_REQUIRED')
    if (newCapital <= oldCapital) return fail('Yeni sermaye eski sermayeden büyük olmalıdır.', 'NEW_CAPITAL_MUST_BE_GREATER')
    if (Math.abs(newCapital - (oldCapital + increaseAmount)) > 0.05) {
      return fail('Yeni sermaye, eski sermaye ve artırılacak tutar ile uyumlu olmalıdır.', 'CAPITAL_TOTAL_MISMATCH', 400, {
        oldCapital,
        increaseAmount,
        newCapital,
      })
    }

    const distribution = normalizeDistribution(input, precheck.current_ownership_distribution, oldCapital, newCapital)
    if (!distribution.ok) return fail(distribution.message, distribution.code, 400, distribution.details)

    const documents = normalizeDocuments(input.document_files, input.document_meta)
    const transactionNo = await nextCapitalIncreaseNo(supabase)
    const now = new Date().toISOString()
    const workflow = resolveCapitalIncreaseWorkflowStatus()
    const previousOwnership = precheck.current_ownership_distribution.map(partner => ({ ...partner }))
    const newOwnership = distribution.participants.map(row => ({
      partner_id: row.partner_id,
      display_name: row.display_name,
      old_committed_capital_amount: row.old_committed_capital_amount,
      increase_amount: row.increase_amount,
      new_committed_capital_amount: row.new_committed_capital_amount,
      old_share_ratio: row.old_share_ratio,
      new_share_ratio: row.new_share_ratio,
      old_voting_ratio: row.old_voting_ratio,
      new_voting_ratio: row.new_voting_ratio,
      old_profit_ratio: row.old_profit_ratio,
      new_profit_ratio: row.new_profit_ratio,
      capital_source: row.capital_source,
      description: row.description,
    }))

    for (const row of distribution.participants) {
      let partnerUpdate = supabase
        .from('company_partners')
        .update({
          capital_amount: row.new_committed_capital_amount,
          share_ratio: row.new_share_ratio,
          voting_ratio: row.new_voting_ratio,
          profit_ratio: row.new_profit_ratio,
          updated_at: now,
        })
        .eq('id', row.partner_id)
      partnerUpdate = applyTenantQueryScope(partnerUpdate, 'company_partners', access.tenantContext)
      const { error: partnerUpdateError } = await partnerUpdate
      if (partnerUpdateError) return fail(partnerUpdateError.message, partnerUpdateError.code || 'PARTNER_UPDATE_FAILED', 500)
    }

    let companyUpdate = supabase
      .from('companies')
      .update({
        committed_capital_amount: newCapital,
        paid_capital_amount: numberValue((company as Record<string, any>).paid_capital_amount),
        updated_at: now,
        version: Number((company as Record<string, any>).version || 1) + 1,
      })
      .eq('id', companyId)
    companyUpdate = applyTenantQueryScope(companyUpdate, 'companies', access.tenantContext)
    const { error: companyUpdateError } = await companyUpdate
    if (companyUpdateError) return fail(companyUpdateError.message, companyUpdateError.code || 'COMPANY_CAPITAL_UPDATE_FAILED', 500)

    const ownershipRows = distribution.participants.map((row, index) => withTenantInsertScopeForTable({
      company_id: companyId,
      transaction_no: `${transactionNo}-OI-${String(index + 1).padStart(2, '0')}`,
      transaction_type: 'Düzeltme Kaydı',
      transaction_date: input.transaction_date,
      effective_date: input.effective_date || input.registration_date || input.transaction_date,
      affected_partner_id: row.partner_id,
      share_ratio: row.new_share_ratio,
      voting_ratio: row.new_voting_ratio,
      profit_ratio: row.new_profit_ratio,
      capital_amount: row.new_committed_capital_amount,
      committed_capital_amount: row.new_committed_capital_amount,
      new_capital_amount: newCapital,
      currency: input.currency || 'TRY',
      capital_distribution: newOwnership,
      new_values: {
        partner_id: row.partner_id,
        current_share_ratio: row.new_share_ratio,
        current_voting_ratio: row.new_voting_ratio,
        current_profit_ratio: row.new_profit_ratio,
        current_capital_amount: row.new_committed_capital_amount,
        current_share_units: row.new_share_units,
      },
      document_status: documents.length ? 'Belge Eklendi' : 'Belge Yok',
      document_files: documents,
      status: workflow.transaction_status,
      approval_status: workflow.approval_status,
      workflow_status: workflow.workflow_status,
      description: input.notes || null,
      transaction_reason: `Sermaye Artırımı: ${input.increase_reason}`,
      notes: row.description || input.notes || null,
      warnings: precheck.warnings,
      history: [{
        action: 'Sermaye artırımı ownership düzeltme kaydı oluşturuldu',
        transaction_no: transactionNo,
        changed_at: now,
      }],
      approved_at: now,
      created_at: now,
      updated_at: now,
    }, 'ownership_transactions', access.tenantContext))

    const { data: ownershipTransactions, error: ownershipError } = await supabase
      .from('ownership_transactions')
      .insert(ownershipRows)
      .select('id,transaction_no,affected_partner_id')
    if (ownershipError) return fail(ownershipError.message, ownershipError.code || 'OWNERSHIP_TRANSACTION_CREATE_FAILED', 500)

    const transactionValues = withCapitalTenant({
      company_id: companyId,
      operation_id: operation?.id || null,
      transaction_no: transactionNo,
      increase_type: input.increase_type,
      transaction_date: input.transaction_date,
      effective_date: input.effective_date || input.registration_date || input.transaction_date,
      currency: input.currency || 'TRY',
      increase_reason: input.increase_reason,
      distribution_method: input.distribution_method,
      current_capital_amount: oldCapital,
      increase_amount: increaseAmount,
      new_capital_amount: newCapital,
      paid_capital_amount: numberValue((company as Record<string, any>).paid_capital_amount),
      participants: newOwnership,
      previous_ownership: previousOwnership,
      new_ownership: newOwnership,
      ownership_transaction_ids: (ownershipTransactions || []).map(row => row.id),
      document_files: documents,
      status: 'completed',
      notes: input.notes || null,
      warnings: precheck.warnings,
      history: [{ action: 'Sermaye artırımı tamamlandı', changed_at: now }],
      completed_at: now,
      created_at: now,
      updated_at: now,
    }, access.tenantContext)

    const { data: transaction, error: transactionError } = await supabase
      .from('company_capital_increase_transactions')
      .insert(transactionValues)
      .select(CAPITAL_INCREASE_SELECT)
      .single()
    if (transactionError) return fail(transactionError.message, transactionError.code || 'CAPITAL_INCREASE_CREATE_FAILED', 500)
    const transactionRecord = transaction as Record<string, any>

    await supabase.from('company_lifecycle_events').insert(withTenantInsertScopeForTable({
      company_id: companyId,
      event_type: 'company_capital_increase_completed',
      event_date: input.effective_date || input.registration_date || input.transaction_date,
      old_status: String((company as Record<string, any>).company_status || (company as Record<string, any>).record_status || 'active'),
      new_status: String((company as Record<string, any>).company_status || (company as Record<string, any>).record_status || 'active'),
      payload_json: {
        capital_increase_transaction_id: transactionRecord.id,
        ownership_transaction_ids: (ownershipTransactions || []).map(row => row.id),
        current_capital_amount: oldCapital,
        increase_amount: increaseAmount,
        new_capital_amount: newCapital,
      },
      created_at: now,
      created_by: access.userId || null,
    }, 'company_lifecycle_events', access.tenantContext)).throwOnError()

    let nextCompanyQuery = supabase
      .from('companies')
      .select('id,committed_capital_amount,paid_capital_amount,updated_at,version')
      .eq('id', companyId)
    nextCompanyQuery = applyTenantQueryScope(nextCompanyQuery, 'companies', access.tenantContext)
    const { data: nextCompany } = await nextCompanyQuery.maybeSingle()

    const result = {
      transaction: transactionRecord,
      company: nextCompany,
      ownership_transactions: ownershipTransactions || [],
      current_capital_amount: oldCapital,
      increase_amount: increaseAmount,
      new_capital_amount: newCapital,
      paid_capital_amount: numberValue((nextCompany as Record<string, any> | null)?.paid_capital_amount),
      warnings: precheck.warnings,
    }

    if (operation) {
      await operationService.markCompleted(operation.id, result, precheck.warnings)
      await new OutboxEventService(supabase as any).enqueue({
        tenantId: access.tenantContext.tenantId,
        companyId,
        moduleKey: 'sirket',
        eventType: 'company.capital_increase.completed',
        aggregateType: 'company_capital_increase_transaction',
        aggregateId: transactionRecord.id,
        operationId: operation.id,
        payload: {
          company_id: companyId,
          transaction_id: transactionRecord.id,
          ownership_transaction_ids: (ownershipTransactions || []).map(row => row.id),
          new_capital_amount: newCapital,
        },
      }).catch(() => null)
    }

    return NextResponse.json({
      data: result,
      ...(operation ? {
        operation_id: operation.id,
        operation_status: 'completed',
        message: operationStatusMessage('completed'),
      } : {}),
    }, { status: 201 })
  } catch (error: any) {
    const message = error?.message || 'Sermaye artırımı işlemi tamamlanamadı.'
    if (operation) await operationService.markFailed(operation.id, { code: error?.code || 'CAPITAL_INCREASE_FAILED', error: message })
    return capitalIncreaseError(message, error?.code || 'CAPITAL_INCREASE_FAILED', 500, undefined, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }
}

type NormalizedParticipant =
  & {
    partner_id: string
    display_name: string
    old_committed_capital_amount: number
    increase_amount: number
    new_committed_capital_amount: number
    old_share_ratio: number
    new_share_ratio: number
    old_voting_ratio: number
    new_voting_ratio: number
    old_profit_ratio: number
    new_profit_ratio: number
    new_share_units: number
    capital_source: string | null
    description: string | null
  }

function normalizeDistribution(
  input: z.infer<typeof CapitalIncreaseSchema>,
  partners: CapitalPartnerSnapshot[],
  oldCapital: number,
  newCapital: number
): { ok: true; participants: NormalizedParticipant[] } | { ok: false; code: string; message: string; details?: Record<string, unknown> } {
  if (!partners.length) return { ok: false, code: 'NO_ACTIVE_PARTNERS', message: 'Sermaye dağıtımı yapılacak aktif ortak bulunamadı.' }
  const submitted = new Map(input.participants.map(row => [row.partner_id, row]))
  const partnerIds = new Set(partners.map(partner => partner.id))
  const unknownIds = input.participants.map(row => row.partner_id).filter(id => !partnerIds.has(id))
  if (unknownIds.length) return { ok: false, code: 'PARTNER_OUT_OF_SCOPE', message: 'Dağıtım tablosunda şirkete ait olmayan ortak var.', details: { unknownIds } }

  let rows: NormalizedParticipant[] = partners.map(partner => {
    const draft = submitted.get(partner.id)
    const oldCommitted = roundMoney(partner.committed_capital_amount || (oldCapital * partner.share_ratio / 100))
    const newCommitted = input.distribution_method === 'proportional'
      ? roundMoney(newCapital * (partner.share_ratio / 100))
      : roundMoney(numberValue(draft?.new_committed_capital_amount))
    const newShare = newCapital > 0 ? roundRatio((newCommitted / newCapital) * 100) : 0
    const oldShare = roundRatio(partner.share_ratio || (oldCapital > 0 ? (oldCommitted / oldCapital) * 100 : 0))

    return {
      partner_id: partner.id,
      display_name: partner.display_name,
      old_committed_capital_amount: oldCommitted,
      increase_amount: roundMoney(newCommitted - oldCommitted),
      new_committed_capital_amount: newCommitted,
      old_share_ratio: oldShare,
      new_share_ratio: newShare,
      old_voting_ratio: roundRatio(partner.voting_ratio || oldShare),
      new_voting_ratio: roundRatio(draft?.new_voting_ratio ?? newShare),
      old_profit_ratio: roundRatio(partner.profit_ratio || oldShare),
      new_profit_ratio: roundRatio(draft?.new_profit_ratio ?? newShare),
      new_share_units: numberValue(draft?.new_committed_capital_amount),
      capital_source: (draft?.capital_source || null) as string | null,
      description: draft?.description || null,
    } as NormalizedParticipant
  })

  rows = rebalanceMoney(rows, newCapital)
  rows = rebalanceShare(rows)

  if (input.distribution_method === 'manual') {
    const missingPartners = partners.filter(partner => !submitted.has(partner.id)).map(partner => partner.id)
    if (missingPartners.length) return { ok: false, code: 'ACTIVE_PARTICIPANTS_MISSING', message: 'Tüm aktif ortaklar sermaye artırımı dağıtım tablosunda yer almalıdır.', details: { missingPartners } }
  }

  const negative = rows.find(row => row.increase_amount < -0.05)
  if (negative) return { ok: false, code: 'CAPITAL_DECREASE_NOT_ALLOWED', message: 'Sermaye artırımı mevcut ortak sermayesini azaltamaz. Azaltım ayrı operasyonla yapılmalıdır.', details: { partner_id: negative.partner_id } }
  const missingSource = rows.filter(row => row.increase_amount > 0.05 && !row.capital_source)
  if (missingSource.length) return { ok: false, code: 'CAPITAL_SOURCE_REQUIRED', message: 'Artırım yapılan her ortak için kaynak seçilmelidir.', details: { partner_ids: missingSource.map(row => row.partner_id) } }

  const totalCapital = roundMoney(rows.reduce((sum, row) => sum + row.new_committed_capital_amount, 0))
  const totalShare = roundRatio(rows.reduce((sum, row) => sum + row.new_share_ratio, 0))
  if (Math.abs(totalCapital - newCapital) > 0.05) {
    return { ok: false, code: 'DISTRIBUTION_CAPITAL_MISMATCH', message: 'Manuel dağıtımda toplam sermaye yeni sermayeye eşit olmalıdır.', details: { totalCapital, newCapital } }
  }
  if (Math.abs(totalShare - 100) > 0.05) {
    return { ok: false, code: 'DISTRIBUTION_SHARE_MISMATCH', message: 'Manuel dağıtımda toplam pay oranı %100 olmalıdır.', details: { totalShare } }
  }

  return { ok: true, participants: rows }
}

function rebalanceMoney(rows: NormalizedParticipant[], expectedTotal: number) {
  const nextRows = rows.map(row => ({ ...row }))
  const currentTotal = roundMoney(nextRows.reduce((sum, row) => sum + row.new_committed_capital_amount, 0))
  const diff = roundMoney(expectedTotal - currentTotal)
  if (Math.abs(diff) <= 0.05 && nextRows.length) {
    const index = nextRows.reduce((bestIndex, row, rowIndex) => (
      row.new_committed_capital_amount > nextRows[bestIndex].new_committed_capital_amount ? rowIndex : bestIndex
    ), 0)
    const nextCommitted = roundMoney(nextRows[index].new_committed_capital_amount + diff)
    nextRows[index] = {
      ...nextRows[index],
      new_committed_capital_amount: nextCommitted,
      increase_amount: roundMoney(nextCommitted - nextRows[index].old_committed_capital_amount),
    }
  }
  return nextRows
}

function rebalanceShare(rows: NormalizedParticipant[]) {
  const nextRows = rows.map(row => ({ ...row }))
  const currentTotal = roundRatio(nextRows.reduce((sum, row) => sum + row.new_share_ratio, 0))
  const diff = roundRatio(100 - currentTotal)
  if (Math.abs(diff) <= 0.05 && nextRows.length) {
    const index = nextRows.reduce((bestIndex, row, rowIndex) => (
      row.new_share_ratio > nextRows[bestIndex].new_share_ratio ? rowIndex : bestIndex
    ), 0)
    nextRows[index] = {
      ...nextRows[index],
      new_share_ratio: roundRatio(nextRows[index].new_share_ratio + diff),
      new_voting_ratio: roundRatio(nextRows[index].new_voting_ratio + diff),
      new_profit_ratio: roundRatio(nextRows[index].new_profit_ratio + diff),
    }
  }
  return nextRows
}

function resolveCapitalIncreaseWorkflowStatus() {
  return {
    transaction_status: 'active',
    approval_status: 'approved',
    workflow_status: 'approved',
  }
}

function normalizeDocuments(documents: Array<Record<string, any>>, meta: Record<string, { document_date?: string | null; description?: string | null }>) {
  return documents
    .filter(document => document && String(document.status || 'active') !== 'deleted')
    .map(document => ({
      slotId: String(document.slotId || ''),
      storagePath: document.storagePath || null,
      documentId: document.documentId || document.storagePath || null,
      name: document.name || null,
      size: document.size ?? null,
      type: document.type || null,
      uploadedAt: document.uploadedAt || null,
      status: document.status || 'active',
      version: document.version ?? null,
      url: document.url || undefined,
      previewUrl: document.previewUrl || undefined,
      thumbnailPath: document.thumbnailPath || undefined,
      thumbnailUrl: document.thumbnailUrl || undefined,
      document_date: meta?.[String(document.slotId || '')]?.document_date || null,
      description: meta?.[String(document.slotId || '')]?.description || null,
    }))
}
