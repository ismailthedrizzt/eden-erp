import type { EdenPageContract } from '../../core/page.contract'
import { appSirketCompaniesStakeholdersListContract } from './app-sirket-companies-stakeholders.list.contract'
import { appSirketCompaniesStakeholdersFormContract } from './app-sirket-companies-stakeholders.form.contract'

export const appSirketCompaniesStakeholdersPageContract = {
  route: '/app/sirket/companies/stakeholders',
  pageKind: 'form',
  owningEntity: 'company',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,
  list: appSirketCompaniesStakeholdersListContract,
  form: appSirketCompaniesStakeholdersFormContract,
} as const satisfies EdenPageContract
