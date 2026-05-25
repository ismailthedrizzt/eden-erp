import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import type { OperationRequestInput, OperationRunResult } from '@/lib/operations/types'
import type { OperationHandler } from '@/lib/operations/handlerRegistry'

export interface RunSynchronousOperationOptions<T> extends OperationRequestInput {
  supabase: SupabaseClient
  handler: OperationHandler<T>
}

export async function runSynchronousOperation<T>(
  options: RunSynchronousOperationOptions<T>
): Promise<OperationRunResult<T>> {
  const service = new OperationRequestService(options.supabase)
  const operationResult = await service.createOrGet(options)

  if (operationResult.ok && operationResult.duplicate) {
    const operation = operationResult.operation
    if (operation.operation_status === 'completed') {
      return {
        ok: true,
        data: (operation.result_json?.data ?? operation.result_json) as T,
        operation,
        statusCode: 200,
        warnings: operation.warning_json,
      }
    }
    if (operation.operation_status === 'failed') {
      return {
        ok: false,
        operation,
        error: operation.error_json?.message || operation.error_json?.error || 'İşlem tamamlanamadı.',
        code: operation.error_json?.code || 'OPERATION_FAILED',
        statusCode: 409,
        details: operation.error_json,
      }
    }
    return {
      ok: false,
      operation,
      error: 'Aynı istek halen işleniyor.',
      code: 'OPERATION_IN_PROGRESS',
      statusCode: 202,
      details: { operation_status: operation.operation_status },
    }
  }

  if (!operationResult.ok && !operationResult.missingInfrastructure) {
    return {
      ok: false,
      error: operationResult.error,
      code: operationResult.code || 'OPERATION_REQUEST_FAILED',
      statusCode: 500,
    }
  }

  const operation = operationResult.ok ? operationResult.operation : null
  if (operation) await service.markProcessing(operation.id)

  try {
    const result = await options.handler({
      operationType: options.operationType,
      operationId: operation?.id || null,
      payload: options.payload,
    })

    if (result.ok) {
      const completed = operation
        ? await service.markCompleted(operation.id, { data: result.data }, result.warnings)
        : null
      return { ...result, operation: completed || operation, statusCode: result.statusCode }
    }

    if (operation) {
      const failed = await service.markFailed(operation.id, {
        message: result.error,
        code: result.code,
        details: result.details,
      })
      return { ...result, operation: failed || operation }
    }

    return result
  } catch (error) {
    const payload = {
      message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.',
      code: 'OPERATION_HANDLER_FAILED',
    }
    const failed = operation ? await service.markFailed(operation.id, payload) : operation
    return {
      ok: false,
      operation: failed || operation,
      error: payload.message,
      code: payload.code,
      statusCode: 500,
    }
  }
}

