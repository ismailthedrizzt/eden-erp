// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: integrity
// TARGET_FASTAPI_ENDPOINT: /api/v1/integrity/checks
// NOTES: Data integrity checks should move to Python precheck services.

import 'server-only'

import { NextResponse } from 'next/server'
import { getIntegrityCheck, listChecksByEntity, listChecksByOperation } from './integrityRegistry'
import type { IntegrityCheckDefinition, IntegrityCheckResult, IntegrityContext, IntegritySummary } from './integrity.types'
import {
  DATA_INTEGRITY_BLOCKED_MESSAGE,
  DATA_INTEGRITY_WARNING_MESSAGE,
  integrityBlocking,
  integrityWarning,
} from './integrityMessages'

export async function runIntegrityChecks(context: IntegrityContext, checkKeys: string[]) {
  const checks = checkKeys.map(getIntegrityCheck).filter(Boolean) as IntegrityCheckDefinition[]
  const results = await runChecks(checks, context)
  return buildIntegritySummary(results)
}

export async function runIntegrityForOperation(operationKey: string, context: IntegrityContext) {
  const checks = listChecksByOperation(operationKey)
  const results = await runChecks(checks, { ...context, operationKey })
  return buildIntegritySummary(results)
}

export async function runIntegrityForEntity(entityType: string, entityId: string, context: IntegrityContext) {
  const checks = listChecksByEntity(entityType)
  const results = await runChecks(checks, { ...context, entityType, entityId })
  return buildIntegritySummary(results)
}

export function buildIntegritySummary(results: IntegrityCheckResult[]): IntegritySummary {
  const blockingResults = results.filter(result => !result.ok && result.severity === 'blocking')
  const criticalResults = results.filter(result => !result.ok && result.severity === 'critical')
  const warningResults = results.filter(result => !result.ok && result.severity === 'warning')
  return {
    ok: blockingResults.length === 0 && criticalResults.length === 0,
    blockingCount: blockingResults.length,
    warningCount: warningResults.length,
    criticalCount: criticalResults.length,
    results,
    blockingReasons: unique([...blockingResults, ...criticalResults].flatMap(result => result.reasons.length ? result.reasons : [result.message])),
    warnings: unique(warningResults.flatMap(result => result.warnings.length ? result.warnings : [result.message])),
    suggestedActions: uniqueActions(results.flatMap(result => result.suggestedActions || [])),
  }
}

export function integritySummaryToResponse(summary: IntegritySummary, status = 409) {
  return NextResponse.json({
    ok: summary.ok,
    error: summary.ok ? DATA_INTEGRITY_WARNING_MESSAGE : DATA_INTEGRITY_BLOCKED_MESSAGE,
    code: summary.ok ? 'DATA_INTEGRITY_WARNING' : 'DATA_INTEGRITY_BLOCKED',
    blocking_reasons: summary.blockingReasons,
    warnings: summary.warnings,
    affected_entities: summary.results.flatMap(result => result.affectedEntities),
    suggested_actions: summary.suggestedActions,
    details: {
      blockingCount: summary.blockingCount,
      warningCount: summary.warningCount,
      criticalCount: summary.criticalCount,
      results: summary.results,
    },
  }, { status })
}

export function assertIntegrity(summary: IntegritySummary) {
  if (summary.ok) return null
  return integritySummaryToResponse(summary)
}

async function runChecks(checks: IntegrityCheckDefinition[], context: IntegrityContext) {
  const results: IntegrityCheckResult[] = []
  for (const check of checks) {
    if (!shouldRunCheck(check, context)) continue
    try {
      results.push(await check.run(context))
    } catch (error) {
      results.push(check.severity === 'critical'
        ? integrityBlocking(check.key, 'Veri tutarliligi kontrolu tamamlanamadi. Lutfen tekrar deneyin.', {
          metadata: { developerMessage: error instanceof Error ? error.message : String(error || '') },
        })
        : integrityWarning(check.key, 'Bu kontrol tamamlanamadi; islem oncesinde ilgili kayitlari kontrol edin.', {
          metadata: { developerMessage: error instanceof Error ? error.message : String(error || '') },
        })
      )
    }
  }
  return results
}

function shouldRunCheck(check: IntegrityCheckDefinition, context: IntegrityContext) {
  if (check.operationKeys?.length && context.operationKey) return check.operationKeys.includes(context.operationKey)
  return true
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function uniqueActions(actions: IntegritySummary['suggestedActions']) {
  const seen = new Set<string>()
  return actions.filter(action => {
    const key = `${action.label}:${action.targetPage || ''}:${action.actionKey || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
