import type { ContractRecord } from '@/lib/services/contracts'

export function ContractPartiesPanel({ contract }: { contract: ContractRecord }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-base font-semibold text-slate-100">Taraflar</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Info label="Bizim Taraf" value={String(contract.primary_party_type || 'our_company')} />
        <Info label="Kar?? Taraf" value={String(contract.counterparty_name || '-')} />
        <Info label="Vergi No" value={String(contract.counterparty_tax_number || '-')} />
        <Info label="?rtibat" value={String(contract.counterparty_contact_name || '-')} />
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-slate-950/40 p-3"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 font-semibold text-slate-100">{value}</div></div>
}
