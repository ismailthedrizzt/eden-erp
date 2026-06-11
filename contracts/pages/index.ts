export { branchPageContract } from './branch.page.contract'
export { companyPageContract } from './company.page.contract'
export { partnerPageContract } from './partner.page.contract'
export { representativePageContract } from './representative.page.contract'

import { branchPageContract } from './branch.page.contract'
import { companyPageContract } from './company.page.contract'
import { partnerPageContract } from './partner.page.contract'
import { representativePageContract } from './representative.page.contract'

export const registeredPageContracts = [
  companyPageContract,
  partnerPageContract,
  representativePageContract,
  branchPageContract,
] as const
