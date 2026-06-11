import { appSozlesmelerIdPageContract } from '@/contracts/pages/generated/app-sozlesmeler-id.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSozlesmelerIdContractReady = requirePageContract(appSozlesmelerIdPageContract)
void appSozlesmelerIdContractReady

import { ContractDetailClient } from '@/components/contracts/ContractDetailClient'

export default function ContractDetailPage() {
  return <ContractDetailClient />
}
