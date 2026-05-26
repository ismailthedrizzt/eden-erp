import type { ProcessDefinition } from './process.types'
import { branchProcessDefinitions } from './definitions/branchProcesses'
import { processDefinitionPlaceholders } from './definitions/companyProcesses'

export const allProcessDefinitions = [
  ...branchProcessDefinitions,
  ...processDefinitionPlaceholders,
] satisfies ProcessDefinition[]

const definitionsByKey = new Map(allProcessDefinitions.map(definition => [definition.key, definition]))

export function getProcessDefinition(key: string, version?: string) {
  const definition = definitionsByKey.get(key) || null
  if (!definition) return null
  if (version && definition.version !== version) return null
  return definition
}

export function listProcessDefinitions() {
  return [...allProcessDefinitions]
}

export function listProcessDefinitionsByModule(moduleKey: string) {
  return allProcessDefinitions.filter(definition => definition.moduleKey === moduleKey)
}

export function getProcessForOperation(operationKey: string) {
  return allProcessDefinitions.find(definition => definition.operationKey === operationKey) || null
}

export function validateProcessDefinition(definition: ProcessDefinition) {
  const errors: string[] = []
  if (!definition.key) errors.push('process key zorunludur.')
  if (!definition.version) errors.push('process version zorunludur.')
  if (!definition.moduleKey) errors.push('moduleKey zorunludur.')
  if (!definition.steps.length) errors.push('en az bir process step tanimlanmalidir.')

  const stepKeys = new Set(definition.steps.map(step => step.key))
  for (const transition of definition.transitions) {
    if (!stepKeys.has(transition.from)) errors.push(`${transition.from} step tanimi bulunamadi.`)
    if (!stepKeys.has(transition.to)) errors.push(`${transition.to} step tanimi bulunamadi.`)
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
