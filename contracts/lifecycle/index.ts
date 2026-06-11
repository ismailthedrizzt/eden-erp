export { branchLifecycleContract } from './branch.lifecycle.contract'
export { companyLifecycleContract } from './company.lifecycle.contract'
export { partnerLifecycleContract } from './partner.lifecycle.contract'
export { representativeLifecycleContract } from './representative.lifecycle.contract'

import { branchLifecycleContract } from './branch.lifecycle.contract'
import { companyLifecycleContract } from './company.lifecycle.contract'
import { partnerLifecycleContract } from './partner.lifecycle.contract'
import { representativeLifecycleContract } from './representative.lifecycle.contract'

export const registeredLifecycleContracts = [
  companyLifecycleContract,
  partnerLifecycleContract,
  representativeLifecycleContract,
  branchLifecycleContract,
] as const
