export type HrDomainEntity = 'employee' | 'employment_lifecycle_event' | 'employee_assignment'

export interface HrDomainContext {
  tenantId: string
  companyId?: string | null
  employeeId?: string | null
  userId?: string | null
}

