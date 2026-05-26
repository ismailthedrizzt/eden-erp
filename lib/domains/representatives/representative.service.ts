import type { RepresentativeDomainContext } from './representative.types'

export class RepresentativeDomainService {
  readonly domainKey = 'representatives'

  // TODO(domain-service-migration): Existing logic currently lives in app/api/...; move here in the next Domain Service Layer phase.
  describeBoundary(context: RepresentativeDomainContext) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantContext.tenantId,
      owns: ['company_representatives', 'representative_authority_transactions'],
      rule: 'Representative card is not duplicated for branch, organization or facility scope.',
    }
  }
}
