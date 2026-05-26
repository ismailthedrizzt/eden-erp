export const facilityDomainEvents = [
  'facility.created',
  'facility.linked_to_branch',
  'facility.deactivated',
] as const

export type FacilityDomainEvent = (typeof facilityDomainEvents)[number]

