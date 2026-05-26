import type { HrDomainContext } from './hr.types'

export class HrDomainService {
  readonly domainKey = 'hr'

  // TODO(domain-service-migration): Existing logic currently lives in app/api/...; move here in the next Domain Service Layer phase.
  describeBoundary(context: HrDomainContext) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantId,
      owns: ['employees', 'employee_work_lifecycle_events', 'employee_assignments'],
      rule: 'Employment lifecycle is separate from representative authority and ownership.',
    }
  }
}

