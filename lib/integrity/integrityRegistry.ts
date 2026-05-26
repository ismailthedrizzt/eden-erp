import 'server-only'

import type { IntegrityCheckDefinition } from './integrity.types'
import { branchIntegrityChecks } from './checks/branchIntegrityChecks'
import { companyIntegrityChecks } from './checks/companyIntegrityChecks'
import { facilityIntegrityChecks } from './checks/facilityIntegrityChecks'
import { organizationIntegrityChecks } from './checks/organizationIntegrityChecks'
import { partnerIntegrityChecks } from './checks/partnerIntegrityChecks'
import { representativeIntegrityChecks } from './checks/representativeIntegrityChecks'

const registeredChecks = new Map<string, IntegrityCheckDefinition>()

export function registerIntegrityCheck(check: IntegrityCheckDefinition) {
  if (registeredChecks.has(check.key)) return registeredChecks.get(check.key)!
  registeredChecks.set(check.key, check)
  return check
}

export function getIntegrityCheck(key: string) {
  return registeredChecks.get(key) || null
}

export function listIntegrityChecks() {
  ensureDefaultChecks()
  return Array.from(registeredChecks.values())
}

export function listChecksByOperation(operationKey: string) {
  ensureDefaultChecks()
  return listIntegrityChecks().filter(check => check.operationKeys?.includes(operationKey))
}

export function listChecksByEntity(entityType: string) {
  ensureDefaultChecks()
  return listIntegrityChecks().filter(check => check.entityType === entityType)
}

export function listChecksByModule(moduleKey: string) {
  ensureDefaultChecks()
  return listIntegrityChecks().filter(check => check.moduleKey === moduleKey)
}

let defaultsRegistered = false

function ensureDefaultChecks() {
  if (defaultsRegistered) return
  defaultsRegistered = true
  ;[
    ...companyIntegrityChecks,
    ...branchIntegrityChecks,
    ...partnerIntegrityChecks,
    ...representativeIntegrityChecks,
    ...organizationIntegrityChecks,
    ...facilityIntegrityChecks,
  ].forEach(registerIntegrityCheck)
}

ensureDefaultChecks()
