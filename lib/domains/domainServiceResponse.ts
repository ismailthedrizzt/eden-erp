import type { OperationOrchestratorResult } from '@/lib/operations/orchestrators/types'
import type { DomainServiceResult } from './domainService.types'

export function domainSuccess<T>(data: T, warnings: string[] = []): DomainServiceResult<T> {
  return { ok: true, data, warnings }
}

export function domainFailure<T = never>(
  code: string,
  error: string,
  status = 400,
  details?: any,
  warnings: string[] = [],
): DomainServiceResult<T> {
  return { ok: false, code, error, status, details, warnings }
}

export function unwrapDomainResult<T>(result: DomainServiceResult<T>): T {
  if (result.ok) return result.data as T
  const error = Object.assign(new Error(result.error || 'Domain service failed.'), {
    code: result.code || 'DOMAIN_SERVICE_FAILED',
    status: result.status || 500,
    details: result.details,
    warnings: result.warnings || [],
  })
  throw error
}

export function domainResultToOrchestratorResult<T>(result: DomainServiceResult<T>): OperationOrchestratorResult {
  if (result.ok) {
    return {
      ok: true,
      status: result.status || 200,
      data: result.data,
      warnings: result.warnings || [],
    }
  }

  return {
    ok: false,
    status: result.status || 500,
    code: result.code || 'DOMAIN_SERVICE_FAILED',
    error: result.error || 'Domain service failed.',
    details: result.details,
    warnings: result.warnings || [],
  }
}

