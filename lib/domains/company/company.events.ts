export const companyDomainEvents = [
  'company.created',
  'company.updated',
  'company.opened',
  'company.liquidation_started',
  'company.deregistered',
  'company.title_changed',
  'company.address_changed',
  'company.public_registration_updated',
  'company.capital_increased',
  'company.nace_changed',
  'company.activity_subject_changed',
] as const

export type CompanyDomainEvent = (typeof companyDomainEvents)[number]

