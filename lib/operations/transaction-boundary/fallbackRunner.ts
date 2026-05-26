import type { TransactionBoundaryInput, TransactionBoundaryResult } from './transactionBoundary.types'
import { normalizeTransactionResult, transactionFailure } from './transactionResult'

export async function runApplicationFallback<TData>(
  input: Pick<TransactionBoundaryInput<TData>, 'fallback'>
): Promise<TransactionBoundaryResult<TData>> {
  if (!input.fallback) {
    return transactionFailure('Bu islem icin application fallback tanimli degil.', 'TRANSACTION_FALLBACK_MISSING', 501, {
      mode: 'noop',
    })
  }
  const result = await input.fallback()
  return normalizeTransactionResult<TData>(result, 'fallback')
}
