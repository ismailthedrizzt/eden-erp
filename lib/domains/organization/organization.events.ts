export const organizationDomainEvents = [
  'organization.unit_created',
  'organization.unit_updated',
  'organization.unit_closed',
] as const

export type OrganizationDomainEvent = (typeof organizationDomainEvents)[number]

