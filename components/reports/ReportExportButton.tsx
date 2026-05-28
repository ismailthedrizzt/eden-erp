'use client'

import { Download } from 'lucide-react'
import type { ReportingFilter } from '@/lib/services/reporting'
import { reportingReports } from '@/lib/services/reporting'

export function ReportExportButton({ reportKey, filters, disabled }: { reportKey?: string; filters: ReportingFilter; disabled?: boolean }) {
  async function prepareExport() {
    if (!reportKey) return
    await reportingReports.export(reportKey, filters)
  }
  const reason = !reportKey
    ? 'Rapor seçin'
    : !filters.date_from || !filters.date_to
      ? 'Export için tarih aralığı zorunludur'
      : disabled
        ? 'Export yetkisi gerekli'
        : 'CSV export hazırla'
  return (
    <button
      type="button"
      onClick={prepareExport}
      disabled={!reportKey || !filters.date_from || !filters.date_to || disabled}
      title={reason}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100"
    >
      <Download size={16} />
      Export
    </button>
  )
}
