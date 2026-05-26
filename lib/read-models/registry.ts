import { branchListProjection } from './projections/branchList.projection'
import { companyDetailProjection } from './projections/companyDetail.projection'
import { companyListProjection } from './projections/companyList.projection'
import { partnerListProjection } from './projections/partnerList.projection'
import { pendingActionsProjection } from './projections/pendingActions.projection'
import { representativeListProjection } from './projections/representativeList.projection'

export type ReadModelProjection = {
  key: string
  name: string
  version: number
  sources: string[]
  fallbackQuery: string
  cacheDurationSeconds: number
  fields: string[]
  refreshStrategy: 'on_read' | 'outbox_invalidation' | 'scheduled'
}

export const projectionRegistry = {
  companyList: companyListProjection,
  companyDetail: companyDetailProjection,
  partnerList: partnerListProjection,
  representativeList: representativeListProjection,
  branchList: branchListProjection,
  pendingActions: pendingActionsProjection,
} satisfies Record<string, ReadModelProjection>

export function getProjection(key: keyof typeof projectionRegistry) {
  return projectionRegistry[key]
}
