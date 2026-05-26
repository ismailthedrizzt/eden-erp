import { NextResponse } from 'next/server'
import type { ProcessEngineResult } from './process.types'

export function processSuccess<TData>(data: TData, status = 200, warnings?: string[]): ProcessEngineResult<TData> {
  return { ok: true, status, data, warnings }
}

export function processFailure(error: string, code = 'PROCESS_FAILED', status = 400, details?: any): ProcessEngineResult {
  return { ok: false, status, error, code, details }
}

export function processMissingInfrastructure(details?: any) {
  return processFailure(
    'Surec motoru altyapisi bu calisma alaninda henuz hazir degil.',
    'PROCESS_INFRASTRUCTURE_MISSING',
    501,
    details
  )
}

export function processToNextResponse(result: ProcessEngineResult) {
  if (result.ok) {
    return NextResponse.json({
      data: result.data,
      ...(result.warnings?.length ? { warnings: result.warnings } : {}),
    }, { status: result.status })
  }

  return NextResponse.json({
    error: result.error || 'Surec islemi tamamlanamadi.',
    code: result.code || 'PROCESS_FAILED',
    ...(result.details ? { details: result.details } : {}),
  }, { status: result.status || 500 })
}

export function processErrorResponse(error: string, code = 'PROCESS_FAILED', status = 400, details?: any) {
  return processToNextResponse(processFailure(error, code, status, details))
}
