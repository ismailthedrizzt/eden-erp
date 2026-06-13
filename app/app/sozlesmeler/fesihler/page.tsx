import { XCircle } from 'lucide-react'
import { ContractsList } from '@/components/contracts/ContractsList'
import { PageBanner } from '@/components/ui/PageBanner'

export default function ContractTerminationsPage() {
  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="S?zle?me Fesihleri" subtitle="Fesih bekleyen ve feshedilmi? s?zle?melerin operasyon g?r?n?m?." icon={<XCircle size={24} />} />
      <ContractsList />
    </div>
  )
}
