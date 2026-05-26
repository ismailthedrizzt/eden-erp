import type {
  ProcessDefinition,
  ProcessInstance,
  ProcessInstanceStatus,
  ProcessStepDefinition,
} from './process.types'

export function firstProcessStep(definition: ProcessDefinition) {
  return [...definition.steps].sort((a, b) => a.order - b.order)[0] || null
}

export function getProcessStep(definition: ProcessDefinition, stepKey?: string | null) {
  if (!stepKey) return null
  return definition.steps.find(step => step.key === stepKey) || null
}

export function nextStepForAction(definition: ProcessDefinition, stepKey: string, action = 'complete') {
  const transition = definition.transitions.find(item => item.from === stepKey && item.action === action)
  if (transition) return getProcessStep(definition, transition.to)
  const step = getProcessStep(definition, stepKey)
  if (step?.nextOnComplete) return getProcessStep(definition, step.nextOnComplete)
  return nextStepByOrder(definition, step)
}

export function nextStepByOrder(definition: ProcessDefinition, step?: ProcessStepDefinition | null) {
  if (!step) return null
  return [...definition.steps]
    .sort((a, b) => a.order - b.order)
    .find(item => item.order > step.order) || null
}

export function statusForStep(step?: ProcessStepDefinition | null): ProcessInstanceStatus {
  if (!step) return 'completed'
  if (step.type === 'approval') return 'waiting_approval'
  if (step.type === 'system' && step.key === 'completed') return 'completed'
  return 'active'
}

export function canCancelProcess(instance: ProcessInstance, definition: ProcessDefinition) {
  const allowedStatuses = definition.cancelPolicy?.allowedStatuses || ['draft', 'active', 'waiting_approval']
  return allowedStatuses.includes(instance.status)
}

export function isTerminalProcessStatus(status: ProcessInstanceStatus) {
  return status === 'completed' || status === 'cancelled' || status === 'failed'
}
