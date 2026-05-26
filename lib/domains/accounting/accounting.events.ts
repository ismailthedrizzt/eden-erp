export const accountingDomainEvents = [
  'accounting.payment_posted',
  'accounting.collection_posted',
  'accounting.reconciliation_completed',
] as const

export type AccountingDomainEvent = (typeof accountingDomainEvents)[number]

