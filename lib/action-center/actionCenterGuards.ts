import type { ActionCenterContext, UnifiedActionItem } from './actionCenter.types'

const SYSTEM_PERMISSIONS = new Set([
  '__eden_demo_allow_all__',
  'settings.view',
  'settings.edit',
  'settings.modulesManage',
  'settings.usersManage',
  'audit.view',
  'admin',
])

export function canSeeSystemActionItems(context: Pick<ActionCenterContext, 'permissions' | 'isSystemUser'>) {
  return context.isSystemUser || (context.permissions || []).some(permission => SYSTEM_PERMISSIONS.has(permission))
}

export function isItemWithinCompanyScope(item: UnifiedActionItem, scopedCompanyIds: string[]) {
  if (!item.company_id) return true
  if (!scopedCompanyIds.length) return true
  return scopedCompanyIds.includes(item.company_id)
}

export function canDismissActionItem(item: UnifiedActionItem) {
  return ['notification', 'projection', 'integrity_warning', 'system'].includes(item.source_type)
    || (item.source_type === 'outbox' && ['completed', 'dismissed'].includes(item.status))
}
