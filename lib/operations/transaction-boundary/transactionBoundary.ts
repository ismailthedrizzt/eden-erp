// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: operations
// TARGET_ENDPOINT: backend transaction unit-of-work
// NOTES: Transaction boundary semantics should move to Python SQLAlchemy/DB transaction layer.

import { callOperationRpc } from './rpcClient'
import { getRpcContract, shouldUseRpc } from './rpcRegistry'
import { applyCompensation } from './compensation'
import { runApplicationFallback } from './fallbackRunner'
import type { TransactionBoundaryInput, TransactionBoundaryResult } from './transactionBoundary.types'
import { transactionFailure } from './transactionResult'

export async function runTransactionBoundary<TData = any>(
  input: TransactionBoundaryInput<TData>
): Promise<TransactionBoundaryResult<TData>> {
  const contract = getRpcContract(input.key)
  const rpcName = input.rpcName || contract?.rpcName
  const options = {
    preferRpc: input.options?.preferRpc ?? true,
    allowFallback: input.options?.allowFallback ?? contract?.fallbackAllowed ?? true,
    requireRpc: input.options?.requireRpc ?? contract?.required ?? false,
  }
  const rpcContract = contract || (rpcName ? {
    key: input.key,
    rpcName,
    operationKey: input.key,
    moduleKey: 'unknown',
    required: false,
    status: 'planned' as const,
    payloadVersion: '1.0',
    fallbackAllowed: options.allowFallback,
  } : null)

  if (rpcContract && shouldUseRpc(rpcContract, options)) {
    const rpcResult = await callOperationRpc<TData>(input.supabase, rpcContract, {
      ...input.payload,
      tenant_id: input.tenantContext?.tenantId || input.payload.tenant_id,
      company_id: input.companyId ?? input.payload.company_id,
      operation_id: input.operationId ?? input.payload.operation_id,
      process_instance_id: input.processInstanceId ?? input.payload.process_instance_id,
      payload_version: rpcContract.payloadVersion,
    })

    if (rpcResult.ok) return rpcResult

    const fallbackableRpcMiss = rpcResult.code === 'RPC_NOT_FOUND' || rpcResult.code === 'RPC_NOT_IMPLEMENTED'
    if (!fallbackableRpcMiss || options.requireRpc || !options.allowFallback) {
      return rpcResult
    }
  } else if (options.requireRpc) {
    return transactionFailure('Bu islem icin RPC zorunlu ancak RPC sozlesmesi bulunamadi.', 'RPC_REQUIRED', 501, {
      mode: 'noop',
    })
  }

  if (!options.allowFallback) {
    return transactionFailure('Bu islem icin application fallback kapali.', 'TRANSACTION_FALLBACK_DISABLED', 501, {
      mode: 'noop',
    })
  }

  try {
    return await runApplicationFallback<TData>(input)
  } catch (error: any) {
    let compensationApplied = false
    try {
      compensationApplied = await applyCompensation(input.compensation, error?.partialResult || null, error)
    } catch (compensationError: any) {
      return transactionFailure(
        'Islem tamamlanamadi. Guvenli duruma alma adiminda da hata olustu.',
        'TRANSACTION_COMPENSATION_FAILED',
        500,
        {
          mode: 'fallback',
          partial: true,
          compensation_applied: false,
          details: {
            error: error?.message || String(error),
            compensation_error: compensationError?.message || String(compensationError),
          },
        }
      )
    }

    return transactionFailure(
      'Islem tamamlanamadi. Kayitlar guvenli duruma alindi, lutfen tekrar deneyin.',
      error?.code || 'TRANSACTION_BOUNDARY_FAILED',
      error?.status || 500,
      {
        mode: 'fallback',
        partial: Boolean(error?.partial),
        compensation_applied: compensationApplied,
        details: error?.details || { cause: error?.message || String(error) },
      }
    )
  }
}
