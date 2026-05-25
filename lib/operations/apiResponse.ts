import { NextResponse } from 'next/server'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import type { OperationRequestRecord, OperationRunResult } from '@/lib/operations/types'

export function operationJsonResponse<T>(result: OperationRunResult<T>, successStatus = 200) {
  if (result.ok) {
    const status = result.operation?.operation_status || 'completed'
    return NextResponse.json(
      {
        ok: true,
        data: result.data,
        ...(result.operation ? {
          operation_id: result.operation.id,
          operation_status: status,
          message: operationStatusMessage(status),
        } : {}),
        ...(result.warnings ? { warning: result.warnings } : {}),
      },
      { status: result.statusCode || successStatus }
    )
  }

  const status = result.operation?.operation_status || 'failed'
  return NextResponse.json(
    {
      ok: false,
      error: result.error,
      code: result.code,
      details: result.details,
      ...(result.operation ? {
        operation_id: result.operation.id,
        operation_status: status,
        message: operationStatusMessage(status),
      } : { message: 'İşlem tamamlanamadı.' }),
    },
    { status: result.statusCode || 500 }
  )
}

export function duplicateOperationJsonResponse(operation: OperationRequestRecord) {
  const status = operation.operation_status
  const isFailure = status === 'failed'
  return NextResponse.json(
    {
      ok: !isFailure,
      operation_id: operation.id,
      operation_status: status,
      data: operation.result_json || undefined,
      error: operation.error_json || undefined,
      message: operationStatusMessage(status),
    },
    { status: isFailure ? 409 : status === 'completed' ? 200 : 202 }
  )
}
