import { appMuhasebeEFaturaEArsivWizardContract } from '@/contracts/pages/generated/app-muhasebe-e-fatura-e-arsiv.wizard.contract'
import { appMuhasebeEFaturaEArsivLifecycleContract } from '@/contracts/pages/generated/app-muhasebe-e-fatura-e-arsiv.lifecycle.contract'

void appMuhasebeEFaturaEArsivWizardContract
void appMuhasebeEFaturaEArsivLifecycleContract

import { appMuhasebeEFaturaEArsivPageContract } from '@/contracts/pages/generated/app-muhasebe-e-fatura-e-arsiv.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appMuhasebeEFaturaEArsivContractReady = requirePageContract(appMuhasebeEFaturaEArsivPageContract)
void appMuhasebeEFaturaEArsivContractReady

import { EDocumentsWorkspace } from '@/components/accounting/AccountingDeepeningWorkspaces'

export default function EFaturaEArsivPage() {
  return <EDocumentsWorkspace />
}
