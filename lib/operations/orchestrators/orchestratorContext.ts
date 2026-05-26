import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId } from '@/lib/operations/idempotency'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import type { OperationRequestRecord } from '@/lib/operations/types'
import { resolveTenantContext, type TenantContext } from '@/lib/tenancy/server'
import type { OperationExecutionContext } from './types'
import { duplicateOperationResult, orchestratorError } from './orchestratorResponse'

export function buildOperationExecutionContext<TPayload>({
  supabase,
  request,
  tenantContext,
  userId,
  companyId,
  recordId,
  payload,
  rawBody,
}: {
  supabase: SupabaseClient
  request: NextRequest
  tenantContext?: TenantContext | null
  userId?: string | null
  companyId?: string | null
  recordId?: string | null
  payload: TPayload
  rawBody?: Record<string, any> | null
}): OperationExecutionContext<TPayload> {
  const source = rawBody || (payload && typeof payload === 'object' ? payload as Record<string, any> : {})
  return {
    supabase,
    request,
    tenantContext: tenantContext || resolveTenantContext(request),
    userId: userId || null,
    companyId: companyId || null,
    recordId: recordId || null,
    clientRequestId: resolveClientRequestId(request, source),
    baseVersion: resolveBaseVersion(source),
    baseUpdatedAt: resolveBaseUpdatedAt(source),
    payload,
  }
}

export const resolveOperationContext = buildOperationExecutionContext

export async function createOrGetOperation<TPayload extends Record<string, any>>(
  context: OperationExecutionContext<TPayload>,
  options: {
    moduleKey: string
    entityType: string
    entityId?: string | null
    operationType: string
  }
) {
  const service = new OperationRequestService(context.supabase)
  const created = await service.createOrGet({
    tenantId: context.tenantContext.tenantId,
    companyId: context.companyId || null,
    moduleKey: options.moduleKey,
    entityType: options.entityType,
    entityId: options.entityId ?? context.recordId ?? null,
    operationType: options.operationType,
    clientRequestId: context.clientRequestId || null,
    baseVersion: context.baseVersion ?? null,
    baseUpdatedAt: context.baseUpdatedAt ?? null,
    requestedBy: context.userId || null,
    payload: context.payload || {},
  })

  if (created.ok && created.duplicate) {
    return {
      ok: true as const,
      duplicate: true as const,
      operation: created.operation,
      result: duplicateOperationResult(created.operation),
      service,
    }
  }

  if (!created.ok && !created.missingInfrastructure) {
    return {
      ok: false as const,
      result: orchestratorError(created.error, created.code || 'OPERATION_REQUEST_FAILED', 500),
      service,
    }
  }

  const operation = created.ok ? created.operation : null
  return { ok: true as const, duplicate: false as const, operation, service }
}

export async function markOperationProcessing(
  service: OperationRequestService,
  operation?: OperationRequestRecord | null
) {
  if (!operation) return null
  return service.markProcessing(operation.id)
}

export async function markOperationCompleted(
  service: OperationRequestService,
  operation: OperationRequestRecord | null | undefined,
  result: Record<string, any>,
  warnings?: unknown
) {
  if (!operation) return null
  return service.markCompleted(operation.id, result, warnings)
}

export async function markOperationFailed(
  service: OperationRequestService,
  operation: OperationRequestRecord | null | undefined,
  error: Record<string, any>
) {
  if (!operation) return null
  return service.markFailed(operation.id, error)
}
