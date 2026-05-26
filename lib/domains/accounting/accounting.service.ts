import type { AccountingDomainContext } from './accounting.types'

export class AccountingDomainService {
  readonly domainKey = 'accounting'

  // TODO(domain-service-migration): Existing logic currently lives in app/api/...; move here in the next Domain Service Layer phase.
  describeBoundary(context: AccountingDomainContext) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantId,
      owns: ['accounting_accounts', 'account_movements', 'bank_accounts', 'payments', 'collections'],
      rule: 'Capital payment reconciliation belongs here; legal ownership formation does not.',
    }
  }
}

