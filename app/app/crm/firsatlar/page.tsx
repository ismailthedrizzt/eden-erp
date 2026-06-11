import { appCrmFirsatlarPageContract } from '@/contracts/pages/generated/app-crm-firsatlar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appCrmFirsatlarContractReady = requirePageContract(appCrmFirsatlarPageContract)
void appCrmFirsatlarContractReady

import { CrmOpportunitiesPage } from '@/components/modules/crm/CrmLeadOpportunityPages'

export default function OpportunitiesPage() {
  return <CrmOpportunitiesPage />
}
