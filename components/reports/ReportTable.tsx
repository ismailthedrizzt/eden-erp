'use client'

import type { ReportResult } from '@/lib/services/reporting'

export function ReportTable({ result }: { result: ReportResult | null }) {
  if (!result) {
    return <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/10">Rapor seçip sorgulayın.</div>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
          <tr>
            {result.columns.map(column => <th key={column.key} className="px-3 py-2">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {result.data.length === 0 ? (
            <tr><td colSpan={result.columns.length || 1} className="px-3 py-8 text-center text-slate-500">Kayıt bulunamadı.</td></tr>
          ) : result.data.map((row, index) => (
            <tr key={index} className="border-t border-slate-100 dark:border-white/5">
              {result.columns.map(column => <td key={column.key} className="max-w-[280px] truncate px-3 py-2 text-slate-700 dark:text-slate-200">{formatCell(row[column.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-white/5">
        Toplam {result.meta.total} kayıt · Sayfa {result.meta.page}/{result.meta.totalPages}
      </div>
    </div>
  )
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
