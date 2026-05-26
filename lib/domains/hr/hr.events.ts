export const hrDomainEvents = [
  'hr.employee_created',
  'hr.employment_started',
  'hr.employment_ended',
] as const

export type HrDomainEvent = (typeof hrDomainEvents)[number]

