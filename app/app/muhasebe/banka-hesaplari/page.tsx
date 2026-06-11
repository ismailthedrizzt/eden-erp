import { appMuhasebeBankaHesaplariPageContract } from '@/contracts/pages/generated/app-muhasebe-banka-hesaplari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appMuhasebeBankaHesaplariContractReady = requirePageContract(appMuhasebeBankaHesaplariPageContract)
void appMuhasebeBankaHesaplariContractReady

import { BankAccountsWorkspace } from '@/components/accounting/AccountingDeepeningWorkspaces'

export default function BankaHesaplariPage() {
  return <BankAccountsWorkspace />
}
