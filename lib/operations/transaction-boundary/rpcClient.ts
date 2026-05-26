import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import type { RpcContract, TransactionBoundaryResult } from './transactionBoundary.types'
import { transactionFailure, transactionSuccess } from './transactionResult'

export async function callOperationRpc<TData>(
  supabase: SupabaseClient,
  contract: RpcContract,
  payload: Record<string, any>
): Promise<TransactionBoundaryResult<TData>> {
  const { data, error } = await supabase.rpc(contract.rpcName, { payload })

  if (error) {
    if (isMissingInfrastructureError(error)) {
      return transactionFailure(`${contract.rpcName} RPC bulunamadi.`, 'RPC_NOT_FOUND', 404, {
        mode: 'rpc',
        details: error,
      })
    }
    return transactionFailure(error.message || `${contract.rpcName} RPC cagrisi tamamlanamadi.`, error.code || 'RPC_TRANSACTION_FAILED', 500, {
      mode: 'rpc',
      details: error,
    })
  }

  if (data && typeof data === 'object' && (data as any).ok === false) {
    return transactionFailure(
      (data as any).error || `${contract.rpcName} RPC islemi basarisiz oldu.`,
      (data as any).code || 'RPC_OPERATION_FAILED',
      (data as any).status || 500,
      {
        mode: 'rpc',
        warnings: (data as any).warnings || [],
        details: (data as any).details || data,
      }
    )
  }

  if (data && typeof data === 'object' && (data as any).ok === true) {
    return transactionSuccess(((data as any).data ?? data) as TData, {
      mode: 'rpc',
      warnings: (data as any).warnings || [],
      details: data,
    })
  }

  return transactionSuccess(data as TData, { mode: 'rpc' })
}
