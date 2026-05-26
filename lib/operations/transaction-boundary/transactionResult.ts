import type { TransactionBoundaryResult } from './transactionBoundary.types'

export function transactionSuccess<TData>(
  data: TData,
  options: Partial<Omit<TransactionBoundaryResult<TData>, 'ok' | 'data'>> = {}
): TransactionBoundaryResult<TData> {
  return {
    ok: true,
    mode: options.mode || 'fallback',
    status: options.status || 200,
    data,
    warnings: options.warnings || [],
    details: options.details,
  }
}

export function transactionFailure(
  error: string,
  code = 'TRANSACTION_BOUNDARY_FAILED',
  status = 500,
  options: Partial<TransactionBoundaryResult> = {}
): TransactionBoundaryResult {
  return {
    ok: false,
    mode: options.mode || 'fallback',
    status,
    code,
    error,
    partial: options.partial,
    compensation_applied: options.compensation_applied,
    warnings: options.warnings || [],
    details: options.details,
  }
}

export function transactionPartialFailure(
  error: string,
  details?: any,
  compensationApplied = false
): TransactionBoundaryResult {
  return transactionFailure(error, 'PARTIAL_OPERATION_FAILURE', 500, {
    partial: true,
    compensation_applied: compensationApplied,
    details,
  })
}

export function normalizeTransactionResult<TData>(
  value: TransactionBoundaryResult<TData> | TData,
  mode: TransactionBoundaryResult['mode'] = 'fallback'
): TransactionBoundaryResult<TData> {
  if (value && typeof value === 'object' && 'ok' in (value as any) && 'status' in (value as any)) {
    return value as TransactionBoundaryResult<TData>
  }
  return transactionSuccess(value as TData, { mode })
}
