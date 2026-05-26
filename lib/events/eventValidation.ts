import type { EventContract, EventPayloadValidationResult } from './eventContract.types'

export function validatePayloadAgainstContract(
  contract: EventContract | null | undefined,
  eventType: string,
  payload: Record<string, any> | null | undefined
): EventPayloadValidationResult {
  const source = payload || {}
  if (!contract) {
    return {
      ok: true,
      eventType,
      missingFields: [],
      warnings: ['Event contract bulunamadi; payload semasi kontrol edilemedi.'],
    }
  }

  const missingFields = (contract.requiredFields || []).filter(field => source[field] === undefined || source[field] === null)
  return {
    ok: missingFields.length === 0,
    eventType,
    missingFields,
    warnings: contract.deprecated ? ['Bu event tipi deprecated olarak isaretli.'] : [],
  }
}
