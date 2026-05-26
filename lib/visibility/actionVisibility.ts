import { resolveActionRuntimeAvailability } from './runtimeVisibilityResolver'
import type { RuntimeVisibilityContext, VisibilityDecision } from './visibility.types'

export interface VisibilityAppliedAction {
  key: string
  hidden?: boolean
  disabled?: boolean
  disabledReason?: string
  visibilityDecision?: VisibilityDecision
}

export interface VisibilityAppliedGroup<TAction extends VisibilityAppliedAction> {
  actions: TAction[]
}

export function applyVisibilityToOperationGroups<
  TGroup extends VisibilityAppliedGroup<TAction>,
  TAction extends VisibilityAppliedAction,
>(groups: TGroup[], context: RuntimeVisibilityContext): TGroup[] {
  return groups.map(group => ({
    ...group,
    actions: group.actions.map(action => applyVisibilityToOperationAction(action, context)),
  }))
}

export function applyVisibilityToOperationAction<TAction extends VisibilityAppliedAction>(
  action: TAction,
  context: RuntimeVisibilityContext
): TAction {
  const decision = resolveActionRuntimeAvailability(action.key, context)
  if (decision.status === 'available') {
    return {
      ...action,
      visibilityDecision: decision,
    } as TAction
  }
  return {
    ...action,
    hidden: action.hidden || !decision.visible,
    disabled: true,
    disabledReason: action.disabledReason || decision.reason,
    visibilityDecision: decision,
  } as TAction
}

export { resolveActionRuntimeAvailability }
