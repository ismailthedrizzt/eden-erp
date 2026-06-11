import { appMuhasebeMutabakatPageContract } from '@/contracts/pages/generated/app-muhasebe-mutabakat.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appMuhasebeMutabakatContractReady = requirePageContract(appMuhasebeMutabakatPageContract)
void appMuhasebeMutabakatContractReady

import { ReconciliationWorkspace } from '@/components/accounting/AccountingDeepeningWorkspaces'

export default function MutabakatPage() {
  return <ReconciliationWorkspace />
}
