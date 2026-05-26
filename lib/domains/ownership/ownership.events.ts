export const ownershipDomainEvents = [
  'partner.created',
  'partner.updated',
  'ownership.transaction_created',
  'ownership.transaction_approved',
  'ownership.transaction_completed',
  'ownership.transaction_cancelled',
  'ownership.transaction_reversed',
] as const

export type OwnershipDomainEvent = (typeof ownershipDomainEvents)[number]

