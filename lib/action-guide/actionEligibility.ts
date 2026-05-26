import { hasAnyPermission } from '@/lib/security/permissionRegistry'
import { findActionContract } from '@/lib/modules/moduleRegistry'
import type { ActionGuideContext, ActionRegistryItem } from './actionGuide.types'

export function evaluateActionEligibility(action: ActionRegistryItem, context: ActionGuideContext) {
  const permissionKeys = [action.permission, action.fallback_permission].filter(Boolean) as string[]
  const hasPermission = permissionKeys.length ? hasAnyPermission(context.userPermissions, permissionKeys) : true
  const recordCheck = checkRecord(action, context)
  const moduleCheck = checkModule(action, context)
  const blocking_reasons = [
    ...moduleCheck.reasons,
    ...(hasPermission ? [] : ['Bu islemi baslatmak icin gerekli yetkiniz gorunmuyor.']),
    ...recordCheck.reasons,
  ]
  return {
    can_start_now: hasPermission && recordCheck.ok && moduleCheck.ok,
    blocking_reasons,
  }
}

function checkModule(action: ActionRegistryItem, context: ActionGuideContext) {
  const contractMatch = findActionContract(action.key)
  if (!contractMatch) return { ok: true, reasons: [] as string[] }

  const moduleKey = contractMatch.module.key
  const status = context.moduleStatuses?.[moduleKey]
  if (!status || status === 'available') return { ok: true, reasons: [] as string[] }

  const reasons = context.moduleBlockingReasons?.[moduleKey]
  if (reasons?.length) return { ok: false, reasons }

  if (status === 'setup_required') {
    return { ok: false, reasons: [`${contractMatch.module.name} modulu icin once kurulum tamamlanmalidir.`] }
  }
  if (status === 'dependency_missing') {
    return { ok: false, reasons: [`${contractMatch.module.name} modulu icin bagimli moduller tamamlanmalidir.`] }
  }
  if (status === 'unlicensed') {
    return { ok: false, reasons: [`${contractMatch.module.name} modulu icin lisans aktif degil.`] }
  }
  return { ok: false, reasons: [`${contractMatch.module.name} modulu bu calisma alaninda aktif degil.`] }
}

function checkRecord(action: ActionRegistryItem, context: ActionGuideContext) {
  const reasons: string[] = []
  if (action.required_record_type && context.selectedRecordType !== action.required_record_type) {
    reasons.push(`${action.label} icin once ilgili ${recordTypeLabel(action.required_record_type)} kaydini acin.`)
  }

  const allowedStatuses = action.required_record_status || []
  const currentStatus = normalizeStatus(context.selectedRecordStatus)
  if (allowedStatuses.length && !allowedStatuses.includes(currentStatus)) {
    if (!currentStatus) {
      reasons.push(`${action.label} icin uygun durumda bir kayit secilmelidir.`)
    } else if (allowedStatuses.includes('active') && currentStatus === 'draft') {
      reasons.push('Bu kayit henuz aktif degil. Once acilis islemi tamamlanmalidir.')
    } else {
      reasons.push(`Bu islem ${allowedStatuses.map(statusLabel).join(' veya ')} kayitlarda baslatilir.`)
    }
  }

  return { ok: reasons.length === 0, reasons }
}

export function normalizeStatus(value: unknown) {
  const status = String(value || '').toLocaleLowerCase('tr-TR')
  if (!status) return ''
  if (['active', 'aktif'].includes(status)) return 'active'
  if (['draft', 'taslak'].includes(status)) return 'draft'
  if (['closed', 'kapali', 'kapalı', 'deregistered', 'terkin'].includes(status)) return 'deregistered'
  if (['liquidation', 'tasfiye'].includes(status)) return 'liquidation'
  return status
}

function recordTypeLabel(value: string) {
  if (value === 'company') return 'sirket'
  if (value === 'branch') return 'sube'
  if (value === 'partner') return 'ortak'
  if (value === 'representative') return 'temsilci'
  return 'kayit'
}

function statusLabel(value: string) {
  if (value === 'active') return 'aktif'
  if (value === 'draft') return 'taslak'
  return value
}
