'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckSquare, ClipboardCheck, ListTodo, Wrench } from 'lucide-react'
import { tenantRequestHeaders } from '@/lib/tenancy/client'
import { normalizeActionCenterSummaryPayload } from '@/lib/action-center/actionCenterClient'
import type { ActionCenterSummary } from '@/lib/action-center/actionCenter.types'

export function ActionCenterSummaryCards() {
  const [summary, setSummary] = useState<ActionCenterSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/action-center/summary', { cache: 'no-store', headers: tenantRequestHeaders() })
      .then(response => response.json())
      .then(payload => {
        if (!cancelled) setSummary(normalizeActionCenterSummaryPayload(payload))
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section data-tour-id="action-center-summary" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard icon={<ListTodo size={18} />} label="Acik Gorevler" value={summary?.task_count || 0} tone="blue" />
      <SummaryCard icon={<ClipboardCheck size={18} />} label="Onay Bekleyenler" value={summary?.approval_count || 0} tone="amber" />
      <SummaryCard icon={<Wrench size={18} />} label="Tamamlanamayan Islemler" value={summary?.failed_operation_count || 0} tone="red" />
      <SummaryCard icon={<AlertTriangle size={18} />} label="Sistem Uyarilari" value={summary?.system_warning_count || 0} tone="amber" />
      <SummaryCard icon={<CheckSquare size={18} />} label="Toplam Acik Is" value={summary?.total_open || 0} tone="green" />
    </section>
  )
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: 'blue' | 'amber' | 'red' | 'green' }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass(tone)}`}>
          {icon}
        </span>
      </div>
    </div>
  )
}

function toneClass(tone: 'blue' | 'amber' | 'red' | 'green') {
  if (tone === 'red') return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200'
  if (tone === 'amber') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200'
  if (tone === 'green') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
  return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200'
}
