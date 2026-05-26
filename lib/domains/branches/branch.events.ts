export const branchDomainEvents = [
  'company.branch_opened',
  'company.branch_closed',
  'company.branch_documents_updated',
  'company.branch_updated',
] as const

export type BranchDomainEvent = (typeof branchDomainEvents)[number]

