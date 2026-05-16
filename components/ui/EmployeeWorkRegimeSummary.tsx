'use client'

import { Briefcase } from 'lucide-react'

const labels: Record<string, string> = {
  draft: 'Taslak',
  pending_entry: 'İşe giriş bekliyor',
  active: 'Aktif',
  passive: 'Pasif',
  terminated: 'Sonlandı',
  sgk_company: 'Şirket Yapacak',
  school: 'Okul / Üniversite Yapacak',
  external: 'Dış Kurum Yapacak',
  none: 'SGK Bildirimi Yok',
  manual: 'Manuel Takip Edilecek',
}

export function EmployeeWorkRegimeSummary({ data }: { data: Record<string, any> }) {
  const items = [
    ['Çalışma İlişkisi Türü', data.relationship_type],
    ['SGK Bildirim Sorumlusu', data.sgk_responsibility],
    ['Ücretlendirme Rejimi', data.payment_type],
    ['Çalışma Düzeni', summarizeWorkOrder(data)],
    ['İşe Giriş Durumu', data.sgk_entry_date || data.entry_date ? `Tamamlandı (${formatDate(data.sgk_entry_date || data.entry_date)})` : labels[data.employment_status] || 'Bekliyor'],
    ['İşten Çıkış Durumu', data.exit_date || data.exit_date ? `Tamamlandı (${formatDate(data.exit_date || data.exit_date)})` : 'Yok'],
    ['Son İş Hareketi', data.last_work_lifecycle_event || '-'],
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <Briefcase size={16} />
        Çalışma Rejimi Özeti
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{readable(value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function summarizeWorkOrder(data: Record<string, any>) {
  const parts = [
    data.weekly_working_days ? `${data.weekly_working_days} gün/hafta` : '',
    data.daily_working_hours ? `${data.daily_working_hours} saat/gün` : '',
    data.is_shift_based ? 'Vardiyalı' : '',
    data.is_remote ? 'Uzaktan' : '',
    data.is_part_time ? 'Kısmi zamanlı' : '',
  ].filter(Boolean)
  return parts.join(', ') || '-'
}

function readable(value: any) {
  if (value === null || value === undefined || value === '') return '-'
  return labels[String(value)] || String(value)
}

function formatDate(value: any) {
  const text = String(value || '').slice(0, 10)
  if (!text) return ''
  return text.split('-').reverse().join('.')
}
