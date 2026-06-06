import { ContractDocumentsPanel } from './ContractDocumentsPanel'
import { ContractEventsTimeline } from './ContractEventsTimeline'
import { ContractForm } from './ContractForm'
import { ContractLifecycleActions } from './ContractLifecycleActions'
import { ContractObligationsPanel } from './ContractObligationsPanel'
import { ContractPartiesPanel } from './ContractPartiesPanel'
import { ContractStatusBadge } from './ContractStatusBadge'
import type { ContractRecord } from '@/lib/services/contracts'

export function ContractDetail({ contract }: { contract: ContractRecord }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-xs text-slate-400">{contract.contract_no}</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">{contract.contract_title}</h1>
            <div className="mt-2 text-sm text-slate-400">{contract.contract_type_label || contract.contract_type} ? {contract.counterparty_name || '-'}</div>
          </div>
          <ContractStatusBadge status={contract.status} />
        </div>
      </div>
      <ContractLifecycleActions contract={contract} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <ContractForm contract={contract} />
          <ContractPartiesPanel contract={contract} />
          <ContractDocumentsPanel contractId={contract.id} />
        </div>
        <div className="space-y-4">
          <ContractObligationsPanel contractId={contract.id} />
          <ContractEventsTimeline contractId={contract.id} />
        </div>
      </div>
    </div>
  )
}
