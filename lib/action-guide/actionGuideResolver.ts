import { getActionDefinition, listActionDefinitions } from './actionRegistry'
import { frequentActionKeys } from './actionGuideExamples'
import { evaluateGuideActionEligibility } from './actionGuideEligibility'
import { COMMON_ACTION_GUIDE_MESSAGES } from './actionGuideMessages'
import { matchActionIntent } from './intentMatcher'
import type {
  ActionGuideContext,
  ActionGuideDefinition,
  ActionGuideRequest,
  ActionGuideResponse,
} from './actionGuide.types'

const LOW_CONFIDENCE_THRESHOLD = 0.52

export async function resolveActionGuide(
  input: ActionGuideRequest,
  context: ActionGuideContext = {}
): Promise<ActionGuideResponse> {
  const query = input.query || ''
  const guideContext: ActionGuideContext = {
    ...context,
    ...(input.context || {}),
    currentPage: input.currentPage ?? context.currentPage,
    selectedRecordType: input.selectedRecordType ?? context.selectedRecordType,
    selectedRecordId: input.selectedRecordId ?? context.selectedRecordId,
    selectedRecordStatus: input.selectedRecordStatus ?? context.selectedRecordStatus,
    companyId: input.companyId ?? context.companyId,
    branchId: input.branchId ?? context.branchId,
    organizationUnitId: input.organizationUnitId ?? context.organizationUnitId,
    facilityId: input.facilityId ?? context.facilityId,
  }

  if (!query.trim()) return resolveFrequentActions(guideContext)

  const matches = matchActionIntent(query, guideContext)
  const best = matches[0]
  const action = best ? getActionDefinition(best.actionKey) : null
  if (!action) return resolveFrequentActions(guideContext, query)
  if (best.confidence < LOW_CONFIDENCE_THRESHOLD) return resolveLowConfidenceActions(matches, guideContext, query)

  const eligibility = await evaluateGuideActionEligibility(action, guideContext)
  return {
    intent: action.key,
    confidence: best.confidence,
    title: action.label,
    explanation: buildExplanation(action, eligibility.blockingReasons),
    steps: action.steps,
    target_page: action.targetPage,
    required_record_type: action.requiredRecordType || null,
    required_record_status: action.requiredRecordStatuses || null,
    can_start_now: eligibility.canStart,
    blocking_reasons: eligibility.blockingReasons,
    warnings: eligibility.warnings,
    suggested_actions: eligibility.suggestedActions,
    matched_actions: matches.map(match => {
      const matched = getActionDefinition(match.actionKey)
      return {
        key: match.actionKey,
        label: matched?.label || match.actionKey,
        confidence: match.confidence,
      }
    }),
  }
}

export async function resolveLowConfidenceActions(
  matches: ReturnType<typeof matchActionIntent>,
  context: ActionGuideContext = {},
  query = ''
): Promise<ActionGuideResponse> {
  const candidates = matches
    .map(match => ({ match, action: getActionDefinition(match.actionKey) }))
    .filter((item): item is { match: typeof matches[number]; action: ActionGuideDefinition } => Boolean(item.action))
    .slice(0, 4)

  if (!candidates.length) return resolveFrequentActions(context, query)

  const suggested = []
  for (const { match, action } of candidates) {
    const eligibility = await evaluateGuideActionEligibility(action, context)
    const commandDisabled = action.wizardKey || action.actionType === 'create_draft'
      ? !eligibility.canStart
      : !eligibility.canView
    suggested.push({
      label: action.label,
      action_type: action.wizardKey ? 'open_wizard' as const : action.actionType === 'create_draft' ? 'start_create' as const : 'navigate' as const,
      target_page: action.targetPage,
      wizard_key: action.wizardKey,
      disabled: commandDisabled,
      disabled_reason: eligibility.blockingReasons[0],
      reason: match.reason,
    })
  }

  return {
    intent: 'low_confidence',
    confidence: candidates[0]?.match.confidence || 0.3,
    title: COMMON_ACTION_GUIDE_MESSAGES.lowConfidenceTitle,
    explanation: COMMON_ACTION_GUIDE_MESSAGES.lowConfidenceExplanation,
    steps: [
      'Listelenen olasi islemlerden size uygun olani secin.',
      'Emin degilseniz islemi biraz daha is diliyle yazin.',
      'Rehber sadece tanimli actionlar arasindan onerir ve veri degistirmez.',
    ],
    target_page: '/app',
    can_start_now: false,
    blocking_reasons: [],
    warnings: [],
    suggested_actions: suggested,
    matched_actions: candidates.map(({ match, action }) => ({
      key: action.key,
      label: action.label,
      confidence: match.confidence,
    })),
  }
}

export async function resolveFrequentActions(
  context: ActionGuideContext = {},
  query = ''
): Promise<ActionGuideResponse> {
  const actions = frequentActionKeys
    .map(getActionDefinition)
    .filter(Boolean) as ActionGuideDefinition[]

  const suggested = []
  for (const action of actions) {
    const eligibility = await evaluateGuideActionEligibility(action, context)
    suggested.push({
      label: action.label,
      action_type: action.wizardKey ? 'open_wizard' as const : action.actionType === 'create_draft' ? 'start_create' as const : 'navigate' as const,
      target_page: action.targetPage,
      wizard_key: action.wizardKey,
      disabled: !eligibility.canView,
      disabled_reason: eligibility.blockingReasons[0],
      reason: eligibility.blockingReasons[0],
    })
  }

  return {
    intent: query ? 'unknown' : 'frequent_actions',
    confidence: query ? 0.2 : 0.8,
    title: COMMON_ACTION_GUIDE_MESSAGES.emptyTitle,
    explanation: query
      ? 'Bu ifade icin net bir islem bulamadim. Asagidaki sik kullanilan islerden biriyle devam edebilirsiniz.'
      : COMMON_ACTION_GUIDE_MESSAGES.emptyExplanation,
    steps: ['Yapmak istediginiz isi kisaca yazin.', 'Rehber uygun sayfa ve sihirbaz onerilerini gosterir.', 'Veri degistiren islemler sihirbaz onayi gerektirir.'],
    target_page: '/app',
    can_start_now: false,
    blocking_reasons: [],
    warnings: [],
    suggested_actions: suggested,
    matched_actions: actions.map(action => ({ key: action.key, label: action.label, confidence: 0.5 })),
  }
}

function buildExplanation(action: ActionGuideDefinition, blockingReasons: string[]) {
  if (blockingReasons.length) return `${action.description} ${blockingReasons[0]}`
  return action.description || action.helpText
}
