'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, BarChart3, CheckCircle2, Info } from 'lucide-react'
import type { KpiCardRecord } from '@/lib/services/reporting'

export function KpiCard({ card }: { card: KpiCardRecord }) {
  const Icon = card.status === 'critical' || card.status === 'warning'
    ? AlertTriangle
    : card.status === 'normal'
      ? CheckCircle2
      : Info
  const content = (
    <div className={`h-full rounded-lg border p-4 transition ${toneClass(card.status)} ${!card.visible ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide opacity-70">{card.module_key}</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{card.title}</h3>
        </div>
        <span className="rounded-md bg-white/70 p-2 text-slate-600 dark:bg-white/10 dark:text-slate-200">
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold text-slate-950 dark:text-white">{card.visible ? card.value ?? '-' : '-'}</p>
          {card.unit && <p className="text-xs opacity-70">{card.unit}</p>}
        </div>
        {card.target_page && card.visible && <ArrowUpRight size={16} className="opacity-60" />}
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{card.description}</p>
      {!!card.warnings.length && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-white/70 px-2 py-1.5 text-xs dark:bg-white/10">
          <BarChart3 size={13} className="mt-0.5 shrink-0" />
          <span>{card.warnings[0]}</span>
        </div>
      )}
    </div>
  )

  if (!card.target_page || !card.visible) return content
  return <Link href={card.target_page}>{content}</Link>
}

function toneClass(status: string) {
  if (status === 'critical') return 'border-red-200 bg-red-50 text-red-800 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-100'
  if (status === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100'
  if (status === 'normal') return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100'
  return 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100'
}
