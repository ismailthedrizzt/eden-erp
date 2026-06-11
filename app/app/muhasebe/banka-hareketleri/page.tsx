import { appMuhasebeBankaHareketleriPageContract } from '@/contracts/pages/generated/app-muhasebe-banka-hareketleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appMuhasebeBankaHareketleriContractReady = requirePageContract(appMuhasebeBankaHareketleriPageContract)
void appMuhasebeBankaHareketleriContractReady

import { BankTransactionsWorkspace } from '@/components/accounting/AccountingDeepeningWorkspaces'

export default function BankaHareketleriPage() {
  return <BankTransactionsWorkspace />
}
