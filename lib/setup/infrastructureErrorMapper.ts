import type { ModuleReadinessState } from './setup.types'
import { moduleSetupIncompleteMessage } from './setupMessages'

export interface InfrastructureErrorMapping {
  isInfrastructureError: boolean
  status: ModuleReadinessState
  code: string
  userMessage: string
  developerMessage?: string
}

export function normalizeInfrastructureError(error: unknown) {
  const source = error as { code?: string; message?: string; details?: string; hint?: string } | null | undefined
  const message = [
    source?.message,
    source?.details,
    source?.hint,
  ].filter(Boolean).join(' ')
  const lower = message.toLocaleLowerCase('tr-TR')
  const code = source?.code || ''
  const missing = code === '42P01'
    || code === '42703'
    || code === '42883'
    || code === 'PGRST202'
    || code === 'PGRST204'
    || code === 'PGRST205'
    || lower.includes('schema cache')
    || lower.includes('does not exist')
    || lower.includes('could not find')
    || lower.includes('function')
  return {
    isMissing: missing,
    code,
    message,
  }
}

export function mapInfrastructureErrorToSetupStatus(error: unknown, moduleKey: string): InfrastructureErrorMapping {
  const normalized = normalizeInfrastructureError(error)
  if (!normalized.isMissing) {
    return {
      isInfrastructureError: false,
      status: 'setup_required',
      code: normalized.code || 'SETUP_CHECK_FAILED',
      userMessage: 'Kurulum durumu kontrol edilemedi. Lutfen tekrar deneyin.',
      developerMessage: normalized.message,
    }
  }
  return {
    isInfrastructureError: true,
    status: 'infrastructure_missing',
    code: 'MODULE_SETUP_REQUIRED',
    userMessage: moduleSetupIncompleteMessage(moduleKey),
    developerMessage: normalized.message,
  }
}
