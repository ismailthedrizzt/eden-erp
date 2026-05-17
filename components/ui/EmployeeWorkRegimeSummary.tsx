'use client'

import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Loader2 } from 'lucide-react'
import {
  DURATION_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  SGK_RESPONSIBILITY_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
  optionLabel,
  sgkResponsibilityLabel,
  statusLabel,
} from '@/lib/modules/employees/workLifecycle'
import { apiClient } from '@/lib/api/apiClient'

export function EmployeeWorkRegimeSummary({ data }: { data: Record<string, any> }) {
  const [workRelation, setWorkRelation] = useState<Record<string, any> | null>(null)
  const [lastEvent, setLastEvent] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!data?.id) return
    let cancelled = false
    setLoading(true)

    Promise.all([
      apiClient.get<{ data: Record<string, any> | null }>(`/api/employees/${data.id}/work-relation`, { useCache: false }).catch(() => ({ data: null })),
      apiClient.get<{ data: Array<Record<string, any>> }>(`/api/employees/${data.id}/work-lifecycle-events`, { useCache: false }).catch(() => ({ data: [] })),
    ]).then(([relationPayload, eventsPayload]) => {
      if (cancelled) return
      setWorkRelation(relationPayload.data || null)
      setLastEvent(Array.isArray(eventsPayload.data) ? eventsPayload.data[0] || null : null)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [data?.id])

  const merged = useMemo(() => ({ ...data, ...(workRelation || {}) }), [data, workRelation])
  const workArrangement = merged.work_arrangement
    ? optionLabel(WORK_ARRANGEMENT_OPTIONS, merged.work_arrangement)
    : summarizeWorkOrder(merged)
  const items = [
    ['İstihdam Tipi', optionLabel(EMPLOYMENT_TYPE_OPTIONS, merged.employment_type || merged.work_type || merged.relationship_type)],
    ['Süre Tipi', optionLabel(DURATION_TYPE_OPTIONS, merged.duration_type)],
    ['SGK Sorumlusu', merged.sgk_responsibility ? sgkResponsibilityLabel(merged.sgk_responsibility) : optionLabel(SGK_RESPONSIBILITY_OPTIONS, merged.sgk_responsibility)],
    ['Çalışma Düzeni', workArrangement],
    ['İşe Başlama Tarihi', formatDate(merged.start_date || merged.entry_date || merged.sgk_entry_date)],
    ['İşten Çıkış Tarihi', formatDate(merged.end_date || merged.exit_date)],
    ['SGK Durumu', sgkStatusLabel(merged)],
    ['Ücret Tipi', optionLabel(PAYMENT_TYPE_OPTIONS, merged.payment_type)],
    ['Çalışma Yeri', merged.work_location_name || merged.work_location_id || merged.workplace_type || '-'],
    ['Son İş Hareketi', lifecycleEventLabel(lastEvent?.event_type || merged.last_work_lifecycle_event)],
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Briefcase size={16} />
          Çalışma Rejimi Özeti
        </div>
        {loading && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Loader2 size={13} className="animate-spin" />
            Güncelleniyor
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-1 min-h-5 break-words text-sm text-gray-900 dark:text-gray-100">{readable(value)}</div>
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

function sgkStatusLabel(data: Record<string, any>) {
  if (data.sgk_submission_status) return statusLabel(data.sgk_submission_status)
  if (data.sgk_exit_status) return statusLabel(data.sgk_exit_status)
  if (data.sgk_entry_date) return 'SGK girişi var'
  if (data.sgk_responsibility) return `${sgkResponsibilityLabel(data.sgk_responsibility)} sorumluluğunda`
  return '-'
}

function lifecycleEventLabel(value: unknown) {
  const labels: Record<string, string> = {
    entry_wizard_started: 'İşe giriş wizard başlatıldı',
    entry_completed: 'İşe giriş tamamlandı',
    sgk_entry_manual_completed: 'SGK işe girişi manuel tamamlandı',
    exit_wizard_started: 'İşten çıkış wizard başlatıldı',
    exit_completed: 'İşten çıkış tamamlandı',
    sgk_exit_manual_completed: 'SGK işten çıkışı manuel tamamlandı',
    internship_started: 'Staj başladı',
    internship_completed: 'Staj tamamlandı',
    contract_started: 'Sözleşme başladı',
    contract_terminated: 'Sözleşme sonlandırıldı',
    marine_contract_started: 'Denizcilik kontratı başladı',
    marine_contract_completed: 'Denizcilik kontratı tamamlandı',
    status_changed: 'Durum değişti',
  }
  const key = String(value || '')
  return labels[key] || key || '-'
}

function readable(value: any) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function formatDate(value: any) {
  const text = String(value || '').slice(0, 10)
  if (!text) return '-'
  return text.split('-').reverse().join('.')
}
