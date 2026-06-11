'use client'



import { appAyarlarBildirimlerListContract } from '@/contracts/pages/generated/app-ayarlar-bildirimler.list.contract'

void appAyarlarBildirimlerListContract

import { appAyarlarBildirimlerPageContract } from '@/contracts/pages/generated/app-ayarlar-bildirimler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appAyarlarBildirimlerContractReady = requirePageContract(appAyarlarBildirimlerPageContract)
void appAyarlarBildirimlerContractReady

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing } from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef, type TableStatusFilterOption } from '@/components/ui/SmartDataTable'
import {
  notificationCardParts,
  notificationRecordStatusValue,
  notificationStatusLabel,
} from '@/lib/notifications/notificationPresentation'
import { notificationService, type NotificationRecord, type NotificationStatus } from '@/lib/services/notifications'

type NotificationStatusFilter = 'unread' | 'read' | 'completed'

type NotificationTableRow = NotificationRecord & {
  record_status: NotificationStatusFilter
  status_label: string
  record_label: string
  card_type: string
  pending_action: string
  priority_label: string
}

const STATUS_FILTER_OPTIONS: TableStatusFilterOption[] = [
  { value: 'unread', label: 'Okunmamış', tone: 'draft' },
  { value: 'read', label: 'Okundu', tone: 'active' },
  { value: 'completed', label: 'Tamamlandı', tone: 'passive' },
]

const DEFAULT_STATUS_FILTERS: NotificationStatusFilter[] = ['unread', 'read']

const columns: ColumnDef[] = [
  {
    key: 'record_status',
    label: 'Durum',
    type: 'enum',
    width: 120,
    fixedWidth: true,
    sortable: true,
    category: 'Durum',
    render: (_value, row: NotificationTableRow) => <StatusBadge status={row.record_status} label={row.status_label} />,
  },
  { key: 'record_label', label: 'Kayıt', type: 'text', width: 220, sortable: true, filterable: true, category: 'Bildirim' },
  { key: 'card_type', label: 'Kart Tipi', type: 'text', width: 170, sortable: true, filterable: true, category: 'Bildirim' },
  { key: 'pending_action', label: 'Bekleyen İşlem', type: 'text', width: 240, sortable: true, filterable: true, category: 'Bildirim' },
  { key: 'module_key', label: 'Modul', type: 'text', width: 140, sortable: true, filterable: true, category: 'Kaynak' },
  { key: 'priority_label', label: 'Oncelik', type: 'text', width: 110, sortable: true, filterable: true, category: 'Kaynak' },
  { key: 'created_at', label: 'Oluşturma', type: 'date', width: 135, sortable: true, category: 'Tarih' },
]

export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilters, setStatusFilters] = useState<NotificationStatusFilter[]>(DEFAULT_STATUS_FILTERS)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '' })
  const [listMeta, setListMeta] = useState({ page: 1, pageSize: 50, total: 0 })
  const [error, setError] = useState<string | null>(null)

  const statusValues = useMemo(() => toApiStatuses(statusFilters), [statusFilters])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await notificationService.list({
        page: listQuery.page,
        pageSize: listQuery.pageSize,
        search: listQuery.search,
        statusValues,
      })
      setRows(result.data.map(toTableRow))
      setListMeta(result.meta)
    } catch (fetchError: any) {
      setRows([])
      setListMeta({ page: listQuery.page, pageSize: listQuery.pageSize, total: 0 })
      setError(fetchError.message || 'Bildirimler alinamadi.')
    } finally {
      setLoading(false)
    }
  }, [listQuery, statusValues])

  useEffect(() => {
    void load()
  }, [load])

  async function openNotification(row: NotificationTableRow) {
    const targetPage = notificationCardParts(row).targetPage
    try {
      if (row.status === 'unread') await notificationService.markRead(row.id)
    } finally {
      window.location.href = targetPage
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 sm:p-6">
      <PageBanner
        mode="list"
        title="Bildirimler"
        subtitle="Form bazli bekleyen is ve onay bildirimleri"
        icon={<BellRing size={24} />}
      />

      <SmartDataTable<NotificationTableRow>
        columns={columns}
        data={rows}
        loading={loading}
        title="Bildirim Listesi"
        storageKey="notifications-table"
        defaultView="list"
        defaultPageSize={listQuery.pageSize}
        emptyText={error || 'Bildirim bulunamadi.'}
        onRefresh={load}
        onRowClick={openNotification}
        statusFilterOptions={STATUS_FILTER_OPTIONS}
        activeStatusFilters={statusFilters}
        onStatusFiltersChange={(next) => {
          setStatusFilters(next.length ? next as NotificationStatusFilter[] : DEFAULT_STATUS_FILTERS)
          setListQuery(current => ({ ...current, page: 1 }))
        }}
        pagination={{
          mode: 'server',
          page: listMeta.page,
          pageSize: listMeta.pageSize,
          total: listMeta.total,
          onPageChange: page => setListQuery(current => ({ ...current, page })),
          onPageSizeChange: pageSize => setListQuery(current => ({ ...current, page: 1, pageSize })),
          onSearchChange: search => setListQuery(current => ({ ...current, page: 1, search })),
        }}
      />
    </main>
  )
}

function toTableRow(notification: NotificationRecord): NotificationTableRow {
  const parts = notificationCardParts(notification)
  const recordStatus = notificationRecordStatusValue(notification.status) as NotificationStatusFilter
  return {
    ...notification,
    record_status: recordStatus,
    status_label: notificationStatusLabel(notification.status),
    record_label: parts.recordLabel,
    card_type: parts.cardType,
    pending_action: parts.pendingAction,
    priority_label: priorityLabel(notification.priority),
  }
}

function toApiStatuses(filters: NotificationStatusFilter[]): NotificationStatus[] {
  const values = filters.flatMap(filter => filter === 'completed' ? ['dismissed', 'archived'] : [filter])
  return Array.from(new Set(values)) as NotificationStatus[]
}

function priorityLabel(value: string) {
  if (value === 'urgent') return 'Acil'
  if (value === 'high') return 'Yuksek'
  if (value === 'low') return 'Dusuk'
  return 'Normal'
}

function StatusBadge({ status, label }: { status: NotificationStatusFilter; label: string }) {
  const classes = {
    unread: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-100',
    read: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100',
    completed: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-100',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${classes[status]}`}>
      {label}
    </span>
  )
}
