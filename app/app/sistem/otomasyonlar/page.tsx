import { appSistemOtomasyonlarPageContract } from '@/contracts/pages/generated/app-sistem-otomasyonlar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemOtomasyonlarContractReady = requirePageContract(appSistemOtomasyonlarPageContract)
void appSistemOtomasyonlarContractReady

import { WorkflowAutomationPage } from '@/components/modules/automation/WorkflowAutomationPage'

export default function AutomationRulesRoute() {
  return <WorkflowAutomationPage />
}
