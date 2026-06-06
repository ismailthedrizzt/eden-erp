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
