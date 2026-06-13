export { crmStakeholderApiContracts } from './crm-stakeholder.api.contract'
export { facilityApiContracts } from './facility.api.contract'
export { branchApiContracts, branchCreateRequestSchema } from './branch.api.contract'
export { companyApiContracts, companyCreateRequestSchema } from './company.api.contract'
export { partnerApiContracts, partnerCreateRequestSchema } from './partner.api.contract'
export { representativeApiContracts, representativeAuthorityRequestSchema, representativeCreateRequestSchema } from './representative.api.contract'

import { branchApiContracts } from './branch.api.contract'
import { crmStakeholderApiContracts } from './crm-stakeholder.api.contract'
import { facilityApiContracts } from './facility.api.contract'
import { companyApiContracts } from './company.api.contract'
import { partnerApiContracts } from './partner.api.contract'
import { representativeApiContracts } from './representative.api.contract'

export const registeredApiContracts = [
  ...crmStakeholderApiContracts,
  ...facilityApiContracts,
  ...companyApiContracts,
  ...partnerApiContracts,
  ...representativeApiContracts,
  ...branchApiContracts,
] as const
