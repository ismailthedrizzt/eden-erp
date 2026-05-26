import { NextResponse } from 'next/server'
import type { OperationRequestRecord } from '@/lib/operations/types'
import type { OperationOrchestratorResult } from './types'

export function orchestratorSuccess<TData>(
  data: TData,
  options: {
    status?: number
    operationId?: string | null
    operationStatus?: string | null
    warnings?: string[]
  } = {}
): OperationOrchestratorResult<TData> {
  return {
    ok: true,
    status: options.status ?? 201,
    data,
    operation_id: options.operationId || undefined,
    operation_status: options.operationStatus || (options.operationId ? 'completed' : undefined),
    warnings: options.warnings,
  }
}

export function orchestratorError(
  error: string,
  code: string,
  status = 400,
  details?: any,
  operation?: { id?: string | null; operation_status?: string | null } | null
): OperationOrchestratorResult {
  return {
    ok: false,
    status,
    error,
    code,
    details,
    operation_id: operation?.id || undefined,
    operation_status: operation?.operation_status || (operation?.id ? 'failed' : undefined),
  }
}

export function duplicateOperationResult(operation: OperationRequestRecord): OperationOrchestratorResult {
  if (operation.operation_status === 'completed') {
    return orchestratorSuccess(operation.result_json || {}, {
      status: 200,
      operationId: operation.id,
      operationStatus: operation.operation_status,
      warnings: normalizeWarnings(operation.warning_json),
    })
  }

  if (operation.operation_status === 'failed') {
    const error = operation.error_json || {}
    return orchestratorError(
      error.message || error.error || 'Islem tamamlanamadi.',
      error.code || 'OPERATION_FAILED',
      409,
      error.details,
      operation
    )
  }

  return {
    ok: true,
    status: 202,
    operation_id: operation.id,
    operation_status: operation.operation_status,
    data: {},
  }
}

export async function resultFromNextResponse(response: NextResponse): Promise<OperationOrchestratorResult> {
  const body = await response.clone().json().catch(() => ({}))
  return orchestratorError(
    body.error || body.message || 'Islem tamamlanamadi.',
    body.code || 'REQUEST_FAILED',
    response.status || 500,
    body.details,
    body.operation_id ? { id: body.operation_id, operation_status: body.operation_status } : null
  )
}

export function orchestratorResultToNextResponse(result: OperationOrchestratorResult) {
  if (result.ok) {
    return NextResponse.json({
      data: result.data || {},
      ...(result.operation_id ? {
        operation_id: result.operation_id,
        operation_status: result.operation_status || 'completed',
      } : {}),
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
      message: result.status === 202 ? 'Islem isleniyor' : 'Islem tamamlandi',
    }, { status: result.status })
  }

  return NextResponse.json({
    error: result.error || 'Islem tamamlanamadi.',
    code: result.code || 'OPERATION_FAILED',
    ...(result.details ? { details: result.details } : {}),
    ...(result.operation_id ? {
      operation_id: result.operation_id,
      operation_status: result.operation_status || 'failed',
    } : {}),
    message: 'Islem tamamlanamadi',
  }, { status: result.status || 500 })
}

function normalizeWarnings(value: unknown): string[] | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'object' && Array.isArray((value as any).warnings)) {
    return (value as any).warnings.map(String)
  }
  return undefined
}
