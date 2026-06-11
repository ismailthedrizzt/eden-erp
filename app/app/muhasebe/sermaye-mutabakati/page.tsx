import { appMuhasebeSermayeMutabakatiPageContract } from '@/contracts/pages/generated/app-muhasebe-sermaye-mutabakati.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appMuhasebeSermayeMutabakatiContractReady = requirePageContract(appMuhasebeSermayeMutabakatiPageContract)
void appMuhasebeSermayeMutabakatiContractReady

import { CapitalReconciliationWorkspace } from '@/components/accounting/AccountingDeepeningWorkspaces'

export default function SermayeMutabakatiPage() {
  return <CapitalReconciliationWorkspace />
}
