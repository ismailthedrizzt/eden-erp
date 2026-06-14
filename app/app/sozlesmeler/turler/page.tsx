import { Tags } from 'lucide-react'
import { contractTypesPageContract } from '@/contracts/pages/contracts/contract-types.page.contract'
import { contractTypesListContract } from '@/contracts/lists/contracts/contract-types.list.contract'
import { PageBanner } from '@/components/ui/PageBanner'

const labelColumn = contractTypesListContract.columns.find(column => column.key === 'label')
const keyColumn = contractTypesListContract.columns.find(column => column.key === 'key')

export default function ContractTypesPage() {
  const { dashboard } = contractTypesPageContract

  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title={dashboard.banner.title}
        subtitle={dashboard.banner.subtitle}
        icon={<Tags size={24} />}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {contractTypesListContract.rows.map(row => (
          <div key={row.key} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase text-slate-500">{labelColumn?.label}</div>
            <div className="mt-1 font-semibold text-slate-100">{row.label}</div>
            <div className="mt-3 text-xs uppercase text-slate-500">{keyColumn?.label}</div>
            <div className="mt-1 font-mono text-xs text-slate-400">{row.key}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
