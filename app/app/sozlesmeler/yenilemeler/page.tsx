import { appSozlesmelerYenilemelerPageContract } from '@/contracts/pages/generated/app-sozlesmeler-yenilemeler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSozlesmelerYenilemelerContractReady = requirePageContract(appSozlesmelerYenilemelerPageContract)
void appSozlesmelerYenilemelerContractReady

import { RefreshCw } from 'lucide-react'
import { ContractsList } from '@/components/contracts/ContractsList'
import { PageBanner } from '@/components/ui/PageBanner'

export default function ContractRenewalsPage() {
  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="S?zle?me Yenilemeleri" subtitle="Yenileme tarihi yakla?an ve renewal_pending durumundaki s?zle?meler." icon={<RefreshCw size={24} />} />
      <ContractsList />
    </div>
  )
}
