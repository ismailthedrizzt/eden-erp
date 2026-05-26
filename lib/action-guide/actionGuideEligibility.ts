import { hasAnyPermission } from '@/lib/security/permissionRegistry'
import { evaluateActionEligibility as evaluatePolicyActionEligibility } from '@/lib/security/actionEligibility'
import type { AccessContext } from '@/lib/security/accessContext'
import type {
  ActionGuideAction,
  ActionGuideContext,
  ActionGuideDefinition,
  GuideActionEligibilityResult,
} from './actionGuide.types'
import { moduleMissingMessage, statusRequirementMessage } from './actionGuideMessages'

export async function evaluateGuideActionEligibility(
  action: ActionGuideDefinition,
  context: ActionGuideContext
): Promise<GuideActionEligibilityResult> {
  const blockingReasons: string[] = []
  const warnings: string[] = []
  const requiredModules = action.requiredModules?.length ? action.requiredModules : [action.moduleKey]
  const moduleCheck = checkRequiredModules(requiredModules, context)
  blockingReasons.push(...moduleCheck.blockingReasons)
  warnings.push(...checkOptionalModules(action.optionalModules || [], context))

  const permissionKeys = [...(action.requiredPermissions || []), ...(action.fallbackPermissions || [])]
  const permissions = context.permissions || context.userPermissions || []
  if (permissionKeys.length && !hasAnyPermission(permissions, permissionKeys)) {
    blockingReasons.push('Bu islem icin yetkiniz bulunmuyor.')
  }

  const recordReasons = checkRecordRequirements(action, context)
  blockingReasons.push(...recordReasons)

  if (action.key === 'capital_increase') {
    if (!isModuleAvailable('partners', context)) {
      blockingReasons.push('Sermaye Artirimi ortak bazli pay ve sermaye dagilimi gerektirir. Bu islem icin Ortaklarimiz modulu aktif olmalidir.')
    }
    if (context.context?.currentOwnershipAvailable === false) {
      blockingReasons.push('Guncel ortaklik dagilimi okunamadigi icin Sermaye Artirimi baslatilamaz.')
    }
  }

  if (action.key === 'branch_opening') {
    if (!isModuleAvailable('facilities', context)) {
      warnings.push('Sube acilisi yapilabilir; ancak Tesisler/Lokasyonlar modulu aktif olmadigi icin fiziksel lokasyon kaydi otomatik olusturulamayabilir.')
    }
    if (!isModuleAvailable('organization', context)) {
      warnings.push('Organizasyon modulu aktif olmadigi icin otomatik organizasyon birimi olusturma sinirli calisabilir.')
    }
  }

  const policyResult = await evaluateViaPolicyEngine(action, context).catch(() => null)
  if (policyResult && !policyResult.canStart && policyResult.reason && !blockingReasons.includes(policyResult.reason)) {
    blockingReasons.push(policyResult.reason)
  }
  if (policyResult?.warnings?.length) warnings.push(...policyResult.warnings)

  const canStart = blockingReasons.length === 0
  return {
    canStart,
    canView: moduleCheck.canView,
    disabled: !canStart,
    blockingReasons: unique(blockingReasons),
    warnings: unique(warnings),
    suggestedActions: buildSuggestedActions(action, context, canStart, blockingReasons[0]),
  }
}

export function getMissingModulesForFieldAction(action: ActionGuideDefinition, context: ActionGuideContext) {
  return (action.requiredModules || [action.moduleKey]).filter(moduleKey => !isModuleAvailable(moduleKey, context))
}

export function getMissingPermissionsForFieldAction(action: ActionGuideDefinition, context: ActionGuideContext) {
  const permissions = context.permissions || context.userPermissions || []
  const keys = [...(action.requiredPermissions || []), ...(action.fallbackPermissions || [])]
  return keys.length && !hasAnyPermission(permissions, keys) ? keys : []
}

function checkRequiredModules(moduleKeys: string[], context: ActionGuideContext) {
  const blockingReasons: string[] = []
  let canView = true
  for (const moduleKey of moduleKeys) {
    const status = context.moduleStatuses?.[moduleKey]
    if (!status && !context.availableModules) continue
    if (status && status !== 'available') {
      if (status === 'disabled' || status === 'unlicensed') canView = false
      const moduleReasons = context.moduleBlockingReasons?.[moduleKey] || []
      blockingReasons.push(...(moduleReasons.length ? moduleReasons : [moduleMissingMessage(moduleKey)]))
    } else if (context.availableModules && !context.availableModules.includes(moduleKey)) {
      blockingReasons.push(moduleMissingMessage(moduleKey))
    }
  }
  return { canView, blockingReasons }
}

function checkOptionalModules(moduleKeys: string[], context: ActionGuideContext) {
  return moduleKeys.filter(moduleKey => !isModuleAvailable(moduleKey, context)).map(moduleMissingMessage)
}

function isModuleAvailable(moduleKey: string, context: ActionGuideContext) {
  const status = context.moduleStatuses?.[moduleKey]
  if (status) return status === 'available'
  if (context.availableModules) return context.availableModules.includes(moduleKey)
  return true
}

function checkRecordRequirements(action: ActionGuideDefinition, context: ActionGuideContext) {
  const reasons: string[] = []
  const selectedType = context.selectedRecordType || inferSelectedRecordType(context)
  if (action.requiredRecordType && selectedType !== action.requiredRecordType) {
    reasons.push(`${action.label} icin once ilgili ${recordTypeLabel(action.requiredRecordType)} kaydini acin.`)
  }

  const currentStatus = normalizeStatus(context.selectedRecordStatus || context.record?.record_status || context.record?.status)
  if (action.requiredRecordStatuses?.length && !action.requiredRecordStatuses.includes(currentStatus)) {
    reasons.push(statusRequirementMessage(action.label, action.requiredRecordStatuses))
  }
  if (action.blockedRecordStatuses?.includes(currentStatus)) {
    reasons.push(`${action.label} bu kayit durumunda baslatilamaz.`)
  }
  return reasons
}

function buildSuggestedActions(
  action: ActionGuideDefinition,
  context: ActionGuideContext,
  canStart: boolean,
  disabledReason?: string
): ActionGuideAction[] {
  const actions: ActionGuideAction[] = [
    {
      label: `${action.label} sayfasina git`,
      action_type: 'navigate',
      target_page: action.targetPage,
    },
  ]

  if (action.actionType === 'create_draft') {
    actions.push({
      label: '+ Ekle ile taslak olustur',
      action_type: 'start_create',
      target_page: withActionParams(action.targetPage, action, context),
      disabled: !canStart,
      disabled_reason: canStart ? undefined : disabledReason,
      reason: canStart ? undefined : disabledReason,
    })
  } else if (action.wizardKey) {
    actions.push({
      label: `${action.label} Sihirbazini Baslat`,
      action_type: 'open_wizard',
      target_page: withActionParams(action.targetPage, action, context),
      wizard_key: action.wizardKey,
      record_id: context.selectedRecordId || context.companyId || context.branchId || null,
      record_type: action.requiredRecordType || null,
      disabled: !canStart,
      disabled_reason: canStart ? undefined : disabledReason,
      reason: canStart ? undefined : disabledReason,
    })
  }

  if (!canStart && action.requiredRecordStatuses?.includes('active') && normalizeStatus(context.selectedRecordStatus) === 'draft') {
    actions.push({
      label: 'Once Sirket Acilisi Sihirbazini Baslat',
      action_type: 'open_wizard',
      target_page: withActionParams('/app/sirket/companies', { ...action, key: 'company_opening', wizardKey: 'company_opening' }, context),
      wizard_key: 'company_opening',
      record_id: context.selectedRecordId || context.companyId || null,
      record_type: 'company',
    })
  }

  const setupTarget = setupActionForBlockedModule(action, context)
  if (setupTarget) actions.push(setupTarget)

  return actions
}

function setupActionForBlockedModule(action: ActionGuideDefinition, context: ActionGuideContext): ActionGuideAction | null {
  const requiredModules = action.requiredModules?.length ? action.requiredModules : [action.moduleKey]
  const blockedModule = requiredModules.find(moduleKey => {
    const status = context.moduleStatuses?.[moduleKey]
    return status && status !== 'available' && status !== 'ready'
  })
  if (!blockedModule) return null
  const status = context.moduleStatuses?.[blockedModule]
  if (status === 'disabled' || status === 'unlicensed') {
    return {
      label: 'Modul ayarlarina git',
      action_type: 'navigate',
      target_page: '/app/sistem/module-licenses',
      disabled: false,
    }
  }
  return {
    label: 'Kurulum ekranina git',
    action_type: 'navigate',
    target_page: `/app/sistem/kurulum?module=${encodeURIComponent(blockedModule)}`,
    disabled: false,
  }
}

async function evaluateViaPolicyEngine(action: ActionGuideDefinition, context: ActionGuideContext) {
  if (!context.tenantId) return null
  const accessContext: AccessContext = {
    userId: context.userId || null,
    tenantId: context.tenantId,
    companyId: context.companyId || context.activeCompanyId || null,
    branchId: context.branchId || context.activeBranchId || null,
    organizationUnitId: context.organizationUnitId || null,
    facilityId: context.facilityId || null,
    moduleKey: action.moduleKey,
    actionKey: action.key,
    recordType: action.requiredRecordType || context.selectedRecordType || undefined,
    recordId: context.selectedRecordId || undefined,
    recordStatus: context.selectedRecordStatus || undefined,
    permissions: context.permissions || context.userPermissions || [],
    moduleStatus: context.moduleStatuses,
    companyScope: null,
    branchScope: null,
  }
  return evaluatePolicyActionEligibility(action.key, accessContext)
}

function withActionParams(targetPage: string, action: Pick<ActionGuideDefinition, 'key' | 'wizardKey'>, context: ActionGuideContext) {
  const params = new URLSearchParams()
  params.set('action', action.key)
  if (action.wizardKey) params.set('wizard', action.wizardKey)
  const recordId = context.selectedRecordId || context.companyId || context.branchId
  if (recordId) params.set('record_id', recordId)
  return `${targetPage}?${params.toString()}`
}

function inferSelectedRecordType(context: ActionGuideContext) {
  if (context.branchId || context.activeBranchId) return 'branch'
  if (context.companyId || context.activeCompanyId) return 'company'
  return context.selectedRecordType || null
}

export function normalizeStatus(value: unknown) {
  const status = String(value || '').toLocaleLowerCase('tr-TR')
  if (!status) return ''
  if (['active', 'aktif'].includes(status)) return 'active'
  if (['draft', 'taslak'].includes(status)) return 'draft'
  if (['closed', 'kapali', 'deregistered', 'terkin'].includes(status)) return 'closed'
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}
