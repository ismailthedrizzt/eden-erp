import { appCrmPipelinePageContract } from '@/contracts/pages/generated/app-crm-pipeline.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appCrmPipelineContractReady = requirePageContract(appCrmPipelinePageContract)
void appCrmPipelineContractReady

import { CrmPipelinePage } from '@/components/modules/crm/CrmLeadOpportunityPages'

export default function PipelinePage() {
  return <CrmPipelinePage />
}
