import { appCrmTakiplerPageContract } from '@/contracts/pages/generated/app-crm-takipler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appCrmTakiplerContractReady = requirePageContract(appCrmTakiplerPageContract)
void appCrmTakiplerContractReady

import { CrmFollowupsPage } from '@/components/modules/crm/CrmLeadOpportunityPages'

export default function FollowupsPage() {
  return <CrmFollowupsPage />
}
