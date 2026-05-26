import type { ProjectDomainContext } from './project.types'

export class ProjectDomainService {
  readonly domainKey = 'projects'

  // TODO(domain-service-migration): Existing logic currently lives in app/api/...; move here in the next Domain Service Layer phase.
  describeBoundary(context: ProjectDomainContext) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantId,
      owns: ['projects', 'project_tasks', 'issues'],
      rule: 'Project tasks are business work items; process_tasks remain in Process Domain.',
    }
  }
}

