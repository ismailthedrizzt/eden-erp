export const representativeDomainEvents = [
  'representative.created',
  'representative.updated',
  'representative.authority_started',
  'representative.authority_updated',
  'representative.authority_suspended',
  'representative.authority_terminated',
] as const

export type RepresentativeDomainEvent = (typeof representativeDomainEvents)[number]

