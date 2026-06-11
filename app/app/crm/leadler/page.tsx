import { appCrmLeadlerPageContract } from '@/contracts/pages/generated/app-crm-leadler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appCrmLeadlerContractReady = requirePageContract(appCrmLeadlerPageContract)
void appCrmLeadlerContractReady

import { CrmLeadsPage } from '@/components/modules/crm/CrmLeadOpportunityPages'

export default function LeadsPage() {
  return <CrmLeadsPage />
}
