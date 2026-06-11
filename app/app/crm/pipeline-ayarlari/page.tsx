import { appCrmPipelineAyarlariPageContract } from '@/contracts/pages/generated/app-crm-pipeline-ayarlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appCrmPipelineAyarlariContractReady = requirePageContract(appCrmPipelineAyarlariPageContract)
void appCrmPipelineAyarlariContractReady

import { CrmPipelineSettingsPage } from '@/components/modules/crm/CrmLeadOpportunityPages'

export default function PipelineSettingsPage() {
  return <CrmPipelineSettingsPage />
}
