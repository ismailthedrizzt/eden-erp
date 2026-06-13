import { Tags } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { CONTRACT_TYPE_LABELS } from '@/lib/services/contracts'

export default function ContractTypesPage() {
  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="S?zle?me T?rleri" subtitle="Backend ve frontend aras?nda ortak s?zle?me t?r? registry g?r?n?m?." icon={<Tags size={24} />} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(CONTRACT_TYPE_LABELS).map(([key, label]) => (
          <div key={key} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div className="font-semibold text-slate-100">{label}</div>
            <div className="mt-1 font-mono text-xs text-slate-400">{key}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
