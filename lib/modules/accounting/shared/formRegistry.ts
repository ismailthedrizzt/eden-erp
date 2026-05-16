import type { AccountingEntityKind } from './accounting.types'

export interface AccountingFormLauncherTarget {
  key: string
  label: string
  href: string
  allowedEntityKinds: AccountingEntityKind[]
  permission?: string
}

export const accountingFormRegistry: AccountingFormLauncherTarget[] = [
  { key: 'employee', label: 'Çalışan Formu', href: '/app/ik/employees?mode=create', allowedEntityKinds: ['person'], permission: 'employees.insert' },
  { key: 'partner', label: 'Ortak Formu', href: '/app/sirket/companies/partners?mode=create', allowedEntityKinds: ['person', 'organization'], permission: 'partners.insert' },
  { key: 'stakeholder', label: 'Paydaş Formu', href: '/app/sirket/companies/stakeholders?mode=create', allowedEntityKinds: ['person', 'organization'], permission: 'stakeholders.insert' },
  { key: 'representative', label: 'Temsilci Formu', href: '/app/sirket/companies/representatives?mode=create', allowedEntityKinds: ['person', 'organization'], permission: 'representatives.insert' },
  { key: 'company', label: 'Şirket Formu', href: '/app/sirket/companies?mode=create', allowedEntityKinds: ['organization'], permission: 'companies.insert' },
  { key: 'customerSupplier', label: 'Müşteri / Tedarikçi Formu', href: '/app/sirket/companies/stakeholders?mode=create&category=Müşteri', allowedEntityKinds: ['organization'], permission: 'stakeholders.insert' },
]

export function getAccountingLauncherTargets(kind: AccountingEntityKind) {
  return accountingFormRegistry.filter(target => target.allowedEntityKinds.includes(kind))
}
