import { getDomainForTable } from './domainOwnershipRegistry'

export type CrossDomainAccessPath =
  | 'direct'
  | 'domain_service'
  | 'orchestrator'
  | 'event'
  | 'projection'
  | 'integrity_check'

export interface CrossDomainWriteDecision {
  allowed: boolean
  sourceDomain: string
  targetDomain?: string
  targetTable: string
  via: CrossDomainAccessPath
  reason?: string
  allowedPaths?: CrossDomainAccessPath[]
}

const allowedCrossDomainPaths: CrossDomainAccessPath[] = [
  'domain_service',
  'orchestrator',
  'event',
  'projection',
  'integrity_check',
]

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

export function getAllowedCrossDomainPaths(sourceDomain: string, targetDomain: string): CrossDomainAccessPath[] {
  if (normalizeKey(sourceDomain) === normalizeKey(targetDomain)) {
    return ['direct', ...allowedCrossDomainPaths]
  }

  return allowedCrossDomainPaths
}

export function isCrossDomainWriteAllowed(
  sourceDomain: string,
  targetTable: string,
  via: CrossDomainAccessPath,
): CrossDomainWriteDecision {
  const targetOwner = getDomainForTable(targetTable)

  if (!targetOwner) {
    return {
      allowed: false,
      sourceDomain,
      targetTable,
      via,
      reason: `Target table ${targetTable} has no registered owner domain.`,
    }
  }

  const targetDomain = targetOwner.domainKey
  const sameDomain = normalizeKey(sourceDomain) === normalizeKey(targetDomain)
  const allowedPaths = getAllowedCrossDomainPaths(sourceDomain, targetDomain)
  const allowed = sameDomain || allowedPaths.includes(via)

  return {
    allowed,
    sourceDomain,
    targetDomain,
    targetTable,
    via,
    allowedPaths,
    reason: allowed
      ? undefined
      : `${sourceDomain} cannot write ${targetTable} owned by ${targetDomain} via ${via}.`,
  }
}

export function warnIfCrossDomainWrite(sourceDomain: string, targetTable: string): CrossDomainWriteDecision {
  return isCrossDomainWriteAllowed(sourceDomain, targetTable, 'direct')
}
