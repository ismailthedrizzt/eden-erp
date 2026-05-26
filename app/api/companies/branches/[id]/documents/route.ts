import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { duplicateOperationJsonResponse } from '@/lib/operations/apiResponse'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { BRANCH_PERMISSIONS, requireBranchPermission } from '@/lib/modules/companies/branchPermissions'
import { COMPANY_BRANCH_SELECT } from '@/lib/modules/companies/companyBranchSelect'
import {
  OfficialDocumentMetaSchema,
  OfficialDocumentSchema,
  insertOfficialChangeTransaction,
  normalizeDocuments,
} from '../../../[company_id]/official-changes/_shared'

const BranchDocumentUpdateSchema = z.object({
  document_files: z.array(OfficialDocumentSchema).default([]),
  document_meta: OfficialDocumentMetaSchema,
  notes: z.string().optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requireBranchPermission(request, supabase, BRANCH_PERMISSIONS.documentsUpdate, 'companies.edit')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const rawBody = await request.json().catch(() => ({}))
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const parsed = BranchDocumentUpdateSchema.safeParse(stripOperationControlFields(rawBody))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Şube belge güncelleme verileri geçerli değil.', code: 'VALIDATION_FAILED', details: { validation: parsed.error.flatten() }, message: 'İşlem tamamlanamadı' }, { status: 400 })
  }

  const branch = await loadBranch(supabase, id, tenantContext)
  if (!branch) return NextResponse.json({ error: 'Şube kaydı bulunamadı.', code: 'BRANCH_NOT_FOUND', message: 'İşlem tamamlanamadı' }, { status: 404 })
  const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, branch.company_id)
  if (!companyScope) return NextResponse.json({ error: 'Şube bağlı şirket scope dışında.', code: 'COMPANY_SCOPE_NOT_FOUND', message: 'İşlem tamamlanamadı' }, { status: 404 })
  if (!isWritableCompanyScope(companyScope)) return NextResponse.json({ error: 'Bu şirketin şubeleri için yalnızca görüntüleme yetkiniz var.', code: 'COMPANY_SCOPE_READONLY', message: 'İşlem tamamlanamadı' }, { status: 403 })
  if (baseVersion !== null && Number(branch.version || 0) !== Number(baseVersion)) {
    return NextResponse.json({ error: 'Şube kaydı bu işlem hazırlanırken değişmiş. Lütfen kaydı yenileyip tekrar deneyin.', code: 'VERSION_CONFLICT', message: 'İşlem tamamlanamadı' }, { status: 409 })
  }
  if (baseUpdatedAt && branch.updated_at && new Date(branch.updated_at).getTime() !== new Date(baseUpdatedAt).getTime()) {
    return NextResponse.json({ error: 'Şube kaydı bu işlem hazırlanırken değişmiş. Lütfen kaydı yenileyip tekrar deneyin.', code: 'VERSION_CONFLICT', message: 'İşlem tamamlanamadı' }, { status: 409 })
  }

  const documents = normalizeDocuments(parsed.data.document_files, parsed.data.document_meta)
  if (!documents.length) {
    return NextResponse.json({ error: 'Eklenecek belge seçilmelidir.', code: 'BRANCH_DOCUMENT_REQUIRED', details: { fieldErrors: { document_files: 'En az bir belge ekleyin.' } }, message: 'İşlem tamamlanamadı' }, { status: 400 })
  }

  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: tenantContext.tenantId,
    companyId: branch.company_id,
    moduleKey: 'sirket',
    entityType: 'company_branch',
    entityId: id,
    operationType: 'company.branch_document_update',
    clientRequestId,
    baseVersion,
    baseUpdatedAt,
    requestedBy: permission.userId,
    payload: parsed.data,
  })
  if (operationCreate.ok && operationCreate.duplicate) return duplicateOperationJsonResponse(operationCreate.operation)
  if (!operationCreate.ok && !operationCreate.missingInfrastructure) {
    return NextResponse.json({ error: operationCreate.error, code: operationCreate.code || 'OPERATION_REQUEST_FAILED', message: 'İşlem tamamlanamadı' }, { status: 500 })
  }
  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await operationService.markProcessing(operation.id)

  try {
    const previousDocuments = Array.isArray(branch.document_files) ? branch.document_files : []
    const now = new Date().toISOString()
    const updatePayload = {
      document_files: [
        ...previousDocuments,
        ...documents.map(document => ({ ...document, document_update: true, added_at: now })),
      ],
      metadata_json: {
        ...(branch.metadata_json || {}),
        branch_documents_updated_at: now,
        branch_documents_operation_id: operation?.id || null,
      },
      updated_by: permission.userId || null,
      updated_at: now,
      version: Number(branch.version || 1) + 1,
    }
    let updateQuery = supabase.from('company_branches').update(updatePayload).eq('id', id)
    updateQuery = applyTenantQueryScope(updateQuery, 'company_branches', tenantContext)
    const { data: updatedBranch, error: updateError } = await updateQuery.select(COMPANY_BRANCH_SELECT).single()
    if (updateError) throw updateError

    const transaction = await insertOfficialChangeTransaction({
      supabase,
      companyId: branch.company_id,
      branchId: id,
      tenantContext,
      userId: permission.userId,
      operationId: operation?.id || null,
      transactionType: 'branch_document_update',
      oldValues: { document_files: previousDocuments },
      newValues: { document_files: updatePayload.document_files },
      changedFields: ['document_files'],
      documentFiles: documents,
      notes: parsed.data.notes || null,
      warnings: [],
    })
    const result = { branch: updatedBranch, transaction }
    if (operation) {
      await operationService.markCompleted(operation.id, result)
      await new OutboxEventService(supabase as any).enqueue({
        tenantId: tenantContext.tenantId,
        companyId: branch.company_id,
        moduleKey: 'sirket',
        eventType: 'company.branch_documents_updated',
        aggregateType: 'company_branch',
        aggregateId: id,
        operationId: operation.id,
        payload: { company_id: branch.company_id, branch_id: id, transaction_id: transaction.id, document_count: documents.length },
      }).catch(() => null)
    }
    return NextResponse.json({
      data: result,
      ...(operation ? { operation_id: operation.id, operation_status: 'completed', message: operationStatusMessage('completed') } : { message: 'İşlem tamamlandı' }),
    })
  } catch (error: any) {
    if (operation) await operationService.markFailed(operation.id, { code: error?.code || 'BRANCH_DOCUMENT_UPDATE_FAILED', error: error?.message || 'Şube belgeleri güncellenemedi.' })
    return NextResponse.json({
      error: error?.message || 'Şube belgeleri güncellenemedi.',
      code: error?.code || 'BRANCH_DOCUMENT_UPDATE_FAILED',
      ...(operation ? { operation_id: operation.id, operation_status: 'failed', message: operationStatusMessage('failed') } : { message: 'İşlem tamamlanamadı' }),
    }, { status: 500 })
  }
}

async function loadBranch(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  let query = supabase.from('company_branches').select(COMPANY_BRANCH_SELECT).eq('id', id).eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'company_branches', tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data as Record<string, any> | null
}
