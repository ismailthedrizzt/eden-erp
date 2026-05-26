import 'server-only'

import { runIntegrityForOperation, integritySummaryToResponse } from './integrityChecker'
import type { IntegrityContext } from './integrity.types'

export async function requireIntegrityForOperation(operationKey: string, context: IntegrityContext) {
  const summary = await runIntegrityForOperation(operationKey, context)
  if (summary.ok) {
    return {
      ok: true as const,
      summary,
      warnings: summary.warnings,
    }
  }
  return {
    ok: false as const,
    summary,
    response: integritySummaryToResponse(summary),
  }
}

export function integrityWarningsForMetadata(summary: { warnings?: string[]; results?: any[] }) {
  return {
    warnings: summary.warnings || [],
    results: (summary.results || [])
      .filter(result => !result.ok)
      .map(result => ({
        key: result.key,
        severity: result.severity,
        message: result.message,
        affectedEntities: result.affectedEntities,
      })),
  }
}
