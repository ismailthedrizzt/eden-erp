import type { IntegrityCheckResult, IntegritySeverity, IntegritySuggestedAction } from './integrity.types'

export const DATA_INTEGRITY_BLOCKED_MESSAGE = 'Bu islem veri tutarliligi nedeniyle su anda baslatilamaz.'
export const DATA_INTEGRITY_WARNING_MESSAGE = 'Bu islem oncesinde dikkat edilmesi gereken veri etkileri var.'

export function integrityCheckOk(key: string, message = 'Kontrol tamamlandi.'): IntegrityCheckResult {
  return {
    key,
    ok: true,
    severity: 'info',
    message,
    reasons: [],
    warnings: [],
    affectedEntities: [],
    suggestedActions: [],
  }
}

export function integrityWarning(
  key: string,
  message: string,
  options: Partial<Omit<IntegrityCheckResult, 'key' | 'ok' | 'severity' | 'message'>> = {}
): IntegrityCheckResult {
  return integrityIssue(key, 'warning', message, options)
}

export function integrityBlocking(
  key: string,
  message: string,
  options: Partial<Omit<IntegrityCheckResult, 'key' | 'ok' | 'severity' | 'message'>> = {}
): IntegrityCheckResult {
  return integrityIssue(key, 'blocking', message, options)
}

export function integrityCritical(
  key: string,
  message: string,
  options: Partial<Omit<IntegrityCheckResult, 'key' | 'ok' | 'severity' | 'message'>> = {}
): IntegrityCheckResult {
  return integrityIssue(key, 'critical', message, options)
}

export function integrityIssue(
  key: string,
  severity: IntegritySeverity,
  message: string,
  options: Partial<Omit<IntegrityCheckResult, 'key' | 'ok' | 'severity' | 'message'>> = {}
): IntegrityCheckResult {
  const reasons = options.reasons?.length ? options.reasons : severity === 'warning' ? [] : [message]
  const warnings = options.warnings?.length ? options.warnings : severity === 'warning' ? [message] : []
  return {
    key,
    ok: false,
    severity,
    message,
    reasons,
    warnings,
    affectedEntities: options.affectedEntities || [],
    suggestedActions: options.suggestedActions || [],
    metadata: options.metadata,
  }
}

export function technicalCheckWarning(key: string, moduleKey: string, error: unknown) {
  return integrityWarning(key, 'Bu kontrol icin gerekli kurulum bilgisi okunamadi; islem oncesi kurulum durumunu kontrol edin.', {
    suggestedActions: [setupAction(moduleKey)],
    metadata: {
      developerMessage: error instanceof Error ? error.message : String(error || ''),
    },
  })
}

export function setupAction(moduleKey: string): IntegritySuggestedAction {
  return {
    label: 'Kurulum durumunu kontrol et',
    targetPage: `/app/sistem/kurulum?module=${encodeURIComponent(moduleKey)}`,
  }
}

export function representativesAction(branchId?: string | null): IntegritySuggestedAction {
  return {
    label: 'Temsilci yetkilerini kontrol et',
    targetPage: branchId
      ? `/app/sirket/companies/representatives?branch_id=${encodeURIComponent(branchId)}&include_company_wide_for_branch=false`
      : '/app/sirket/companies/representatives',
    actionKey: 'representative_authority_scope_change',
  }
}
