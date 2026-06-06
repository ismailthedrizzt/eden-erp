import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  under_review: '?ncelemede',
  approval_pending: 'Onay Bekliyor',
  approved: 'Onayland?',
  ready_for_signature: '?mzaya Haz?r',
  signed: '?mzaland?',
  active: 'Aktif',
  renewal_pending: 'Yenileme Bekliyor',
  amendment_pending: 'Ek Protokol Bekliyor',
  suspended: 'Ask?da',
  termination_pending: 'Fesih Bekliyor',
  terminated: 'Feshedildi',
  expired: 'S?resi Doldu',
  archived: 'Ar?iv',
  cancelled: '?ptal',
}

export function ContractStatusBadge({ status }: { status?: string | null }) {
  const value = status || 'draft'
  return (
    <span className={cn(
      'inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold',
      value === 'active' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' :
      value === 'terminated' || value === 'expired' ? 'border-rose-400/40 bg-rose-500/10 text-rose-200' :
      value === 'draft' ? 'border-slate-400/40 bg-slate-500/10 text-slate-200' :
      'border-amber-400/40 bg-amber-500/10 text-amber-200'
    )}>
      {STATUS_LABELS[value] || value}
    </span>
  )
}
