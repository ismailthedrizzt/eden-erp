export type ProjectDomainEntity = 'project' | 'work_task' | 'issue'

export interface ProjectDomainContext {
  tenantId: string
  companyId?: string | null
  projectId?: string | null
  userId?: string | null
}

