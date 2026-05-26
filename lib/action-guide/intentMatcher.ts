import { actionRegistry } from './actionRegistry'
import { evaluateActionEligibility, normalizeStatus } from './actionEligibility'
import { findActionContract } from '@/lib/modules/moduleRegistry'
import type { ActionGuideAction, ActionGuideContext, ActionGuideResult, ActionRegistryItem } from './actionGuide.types'

const DEFAULT_ACTION = actionRegistry.find(action => action.key === 'branch_opening') || actionRegistry[0]

export function resolveActionGuide(query: string, context: ActionGuideContext = {}): ActionGuideResult {
  const candidates = filterActionsByModule(actionRegistry, context)
  const definition = matchAction(query, candidates) || candidates[0] || DEFAULT_ACTION
  const eligibility = evaluateActionEligibility(definition, context)
  const suggested_actions = buildSuggestedActions(definition, context, eligibility.can_start_now, eligibility.blocking_reasons)

  return {
    intent: definition.key,
    confidence: scoreAction(query, definition),
    title: definition.label,
    explanation: definition.description,
    steps: definition.steps,
    target_page: definition.target_page,
    required_record_type: definition.required_record_type || null,
    required_record_status: definition.required_record_status || null,
    can_start_now: eligibility.can_start_now,
    blocking_reasons: eligibility.blocking_reasons,
    suggested_actions,
  }
}

function buildSuggestedActions(
  definition: ActionRegistryItem,
  context: ActionGuideContext,
  canStartNow: boolean,
  blockingReasons: string[]
) {
  const actions: ActionGuideAction[] = [{
    label: `${definition.label} sayfasina git`,
    action_type: 'navigate' as const,
    target_page: definition.target_page,
  }]

  if (definition.create_action) {
    actions.push({
      label: '+ Ekle ile taslak olustur',
      action_type: 'start_create' as const,
      target_page: definition.target_page,
      disabled: !canStartNow,
      reason: canStartNow ? undefined : blockingReasons[0],
    })
  }

  if (definition.wizard_key) {
    actions.push({
      label: `${definition.label} sihirbazini baslat`,
      action_type: 'open_wizard' as const,
      target_page: definition.target_page,
      wizard_key: definition.wizard_key,
      record_id: context.selectedRecordId || context.activeCompanyId || context.companyId || context.activeBranchId || context.branchId || null,
      record_type: definition.required_record_type || null,
      disabled: !canStartNow,
      reason: canStartNow ? undefined : blockingReasons[0],
    })
  }

  if (!canStartNow && definition.required_record_status?.includes('active') && normalizeStatus(context.selectedRecordStatus) === 'draft') {
    actions.push({
      label: 'Once Sirket Acilisi sihirbazini baslat',
      action_type: 'open_wizard' as const,
      wizard_key: 'company_opening',
      target_page: '/app/sirket/companies',
      record_id: context.selectedRecordId || context.activeCompanyId || context.companyId || null,
      record_type: 'company',
    })
  }

  return actions
}

function matchAction(query: string, candidates: ActionRegistryItem[] = actionRegistry) {
  const normalized = normalizeText(query)
  if (!normalized) return null
  return candidates
    .map(action => ({ action, score: scoreAction(query, action) }))
    .sort((left, right) => right.score - left.score)[0]?.action || null
}

function filterActionsByModule(actions: ActionRegistryItem[], context: ActionGuideContext) {
  if (!context.availableModules && !context.moduleStatuses) return actions

  return actions.filter(action => {
    const contractMatch = findActionContract(action.key)
    if (!contractMatch) return true

    const moduleKey = contractMatch.module.key
    const runtimeStatus = context.moduleStatuses?.[moduleKey]
    if (runtimeStatus === 'disabled' || runtimeStatus === 'unlicensed') return false
    if (runtimeStatus === 'setup_required' || runtimeStatus === 'dependency_missing') return true
    return context.availableModules?.includes(moduleKey) ?? true
  })
}

function scoreAction(query: string, definition: ActionRegistryItem) {
  const normalized = normalizeText(query)
  if (!normalized) return 0.5
  const hits = definition.intent_examples.filter(example => normalized.includes(normalizeText(example))).length
  if (hits > 0) return Math.min(0.98, 0.72 + hits * 0.08)
  const titleTokens = normalizeText(definition.label).split(/\s+/).filter(token => token.length > 2)
  const tokenHits = titleTokens.filter(token => normalized.includes(token)).length
  return Math.max(0.45, Math.min(0.7, 0.45 + tokenHits * 0.08))
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim()
}
