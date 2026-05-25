import type { OperationRunResult } from '@/lib/operations/types'

export type OperationHandlerContext = {
  operationType: string
  operationId?: string | null
  payload: Record<string, any>
}

export type OperationHandler<T = unknown> = (context: OperationHandlerContext) => Promise<OperationRunResult<T>>

const handlers = new Map<string, OperationHandler<any>>()

export function registerOperationHandler<T = unknown>(operationType: string, handler: OperationHandler<T>) {
  handlers.set(operationType, handler)
  return handler
}

export function getOperationHandler(operationType: string) {
  return handlers.get(operationType)
}

