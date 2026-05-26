import type { ProjectionDefinition } from './projection.types'
import { branchListProjection } from './projections/branchList.projection'
import { branchSummaryProjection } from './projections/branchSummary.projection'
import { companyDetailProjection } from './projections/companyDetail.projection'
import { companyListProjection } from './projections/companyList.projection'
import { currentOwnershipProjection } from './projections/currentOwnership.projection'
import { currentRepresentativeAuthoritiesProjection } from './projections/currentRepresentativeAuthorities.projection'
import { partnerListProjection } from './projections/partnerList.projection'
import { pendingActionsProjection } from './projections/pendingActions.projection'
import { representativeListProjection } from './projections/representativeList.projection'
import { stakeholderListProjection } from './projections/stakeholderList.projection'

export type ReadModelProjection = ProjectionDefinition

export const projectionRegistry = {
  companyList: companyListProjection,
  companyDetail: companyDetailProjection,
  branchList: branchListProjection,
  branchSummary: branchSummaryProjection,
  partnerList: partnerListProjection,
  currentOwnership: currentOwnershipProjection,
  representativeList: representativeListProjection,
  currentRepresentativeAuthorities: currentRepresentativeAuthoritiesProjection,
  stakeholderList: stakeholderListProjection,
  pendingActions: pendingActionsProjection,
} satisfies Record<string, ProjectionDefinition>

export type ProjectionRegistryKey = keyof typeof projectionRegistry

export const legacyListProjectionKeyMap: Record<string, ProjectionRegistryKey> = {
  'companies.list': 'companyList',
  'company_partners.list': 'partnerList',
  'company_representatives.list': 'representativeList',
  'company_branches.list': 'branchList',
  'stakeholders.list': 'stakeholderList',
}

export function getProjection(key: ProjectionRegistryKey) {
  return projectionRegistry[key]
}

export function getProjectionDefinition(key: string) {
  return projectionRegistry[key as ProjectionRegistryKey] || projectionRegistry[legacyListProjectionKeyMap[key]] || null
}

export function listProjectionDefinitions() {
  return Object.values(projectionRegistry)
}
