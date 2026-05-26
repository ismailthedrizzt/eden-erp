import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { OperationBoundaryFallback } from '@/lib/operations/orchestrators/types'
import { runTransactionBoundary } from './transaction-boundary/transactionBoundary'

type TransactionBoundaryInput<TData> = {
  supabase: SupabaseClient
  key?: string
  rpcName: string
  rpcPayload: Record<string, any>
  fallback: OperationBoundaryFallback<TData>
  compensation?: (partialResult: any, error: unknown) => Promise<void>
  preferRpc?: boolean
  allowFallback?: boolean
  requireRpc?: boolean
}

export async function executeWithTransactionBoundary<TData>({
  supabase,
  key,
  rpcName,
  rpcPayload,
  fallback,
  compensation,
  preferRpc = process.env.EDEN_USE_OPERATION_RPC === 'true',
  allowFallback = true,
  requireRpc = false,
}: TransactionBoundaryInput<TData>) {
  const result = await runTransactionBoundary<TData>({
    supabase,
    key: key || inferBoundaryKey(rpcName),
    rpcName,
    payload: rpcPayload,
    companyId: rpcPayload.company_id || null,
    operationId: rpcPayload.operation_id || null,
    processInstanceId: rpcPayload.process_instance_id || null,
    fallback,
    compensation,
    options: { preferRpc, allowFallback, requireRpc },
  })

  if (result.ok) {
    return {
      ok: true as const,
      data: result.data as TData,
      used: result.mode === 'rpc' ? 'rpc' as const : 'application' as const,
      warnings: result.warnings,
      details: result.details,
    }
  }

  return {
    ok: false as const,
    error: result.error || 'Islem tamamlanamadi.',
    code: result.code || 'TRANSACTION_BOUNDARY_FAILED',
    status: result.status || 500,
    details: result.details,
    compensation_applied: result.compensation_applied,
    partial: result.partial,
  }
}

function inferBoundaryKey(rpcName: string) {
  if (rpcName === 'perform_company_branch_opening') return 'company_branch_opening'
  if (rpcName === 'perform_company_branch_closing') return 'company_branch_closing'
  if (rpcName === 'perform_capital_increase') return 'capital_increase'
  if (rpcName === 'perform_representative_authority_transaction') return 'representative_authority_transaction'
  if (rpcName === 'perform_ownership_transaction') return 'ownership_transaction'
  return rpcName.replace(/^perform_/, '')
}
