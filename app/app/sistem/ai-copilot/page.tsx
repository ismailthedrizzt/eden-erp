import { appSistemAiCopilotPageContract } from '@/contracts/pages/generated/app-sistem-ai-copilot.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemAiCopilotContractReady = requirePageContract(appSistemAiCopilotPageContract)
void appSistemAiCopilotContractReady

import { AiCopilotSettingsPage } from '@/components/ai/AiCopilotSettingsPage'

export default function Page() {
  return <AiCopilotSettingsPage />
}
