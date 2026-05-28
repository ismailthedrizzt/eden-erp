'use client'

import { ChevronDown } from 'lucide-react'
import { KpiCard } from './KpiCard'
import type { KpiCardRecord } from '@/lib/services/reporting'

const moduleLabels: Record<string, string> = {
  companies: 'Şirketler ve Lifecycle',
  partners: 'Ortaklık / Sermaye',
  representatives: 'Temsilci / Yetki',
  branches: 'Şubeler / Lokasyonlar',
  actionCenter: 'Görevler / Süreçler',
  accounting: 'Muhasebe / Cari',
  hr: 'İK',
  project_management: 'Proje / Görev',
  after_sales: 'Satış Sonrası / Servis',
  crm: 'CRM / Paydaşlar',
  system: 'Sistem Uyarıları',
  audit: 'Audit',
}

export function ModuleSummarySection({ moduleKey, cards }: { moduleKey: string; cards: KpiCardRecord[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">{moduleLabels[moduleKey] || moduleKey}</h2>
        <ChevronDown size={18} className="text-slate-400" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => <KpiCard key={card.key} card={card} />)}
      </div>
    </section>
  )
}
