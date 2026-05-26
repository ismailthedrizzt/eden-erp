import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import type { OperationBoundaryFallback } from '@/lib/operations/orchestrators/types'

type TransactionBoundaryInput<TData> = {
  supabase: SupabaseClient
  rpcName: string
  rpcPayload: Record<string, any>
  fallback: OperationBoundaryFallback<TData>
  preferRpc?: boolean
}

export async function executeWithTransactionBoundary<TData>({
  supabase,
  rpcName,
  rpcPayload,
  fallback,
  preferRpc = process.env.EDEN_USE_OPERATION_RPC === 'true',
}: TransactionBoundaryInput<TData>) {
  if (!preferRpc) {
    return { ok: true as const, data: await fallback(), used: 'application' as const }
  }

  const { data, error } = await supabase.rpc(rpcName, { payload: rpcPayload })
  if (error) {
    if (isMissingInfrastructureError(error)) {
      return { ok: true as const, data: await fallback(), used: 'application' as const, rpc_missing: true }
    }
    return {
      ok: false as const,
      error: error.message || `${rpcName} RPC cagrisi tamamlanamadi.`,
      code: error.code || 'RPC_TRANSACTION_FAILED',
      status: 500,
      details: error,
    }
  }

  if (data && typeof data === 'object' && (data as any).ok === false && (data as any).code === 'RPC_NOT_IMPLEMENTED') {
    return { ok: true as const, data: await fallback(), used: 'application' as const, rpc_not_implemented: true }
  }

  return { ok: true as const, data: data as TData, used: 'rpc' as const }
}
