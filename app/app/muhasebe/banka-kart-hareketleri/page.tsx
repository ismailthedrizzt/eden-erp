'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, WalletCards } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { usePermissions } from '@/lib/security/permissionStore'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { bankCardMovementsService } from '@/lib/modules/accounting/bank-integration/bankCardMovements.service'
import type { BankAndCardMovementRow } from '@/lib/modules/accounting/bank-integration/bankIntegration.types'

const columns: ColumnDef[] = [
  { key: 'source_label', label: 'Kaynak', type: 'text', width: 90 },
  { key: 'provider_code', label: 'Sağlayıcı', type: 'text', width: 120 },
  { key: 'transaction_date', label: 'Tarih', type: 'date', width: 120, sortable: true },
  { key: 'description', label: 'Açıklama', type: 'text', width: 260 },
  { key: 'counterparty_display', label: 'Karşı Taraf / Üye İşyeri', type: 'text', width: 240 },
  { key: 'direction_label', label: 'Yön', type: 'text', width: 100 },
  { key: 'amount', label: 'Tutar', type: 'number', width: 130 },
  { key: 'currency', label: 'Para Birimi', type: 'text', width: 100 },
  { key: 'match_label', label: 'Eşleşme', type: 'text', width: 140 },
]

export default function BankCardMovementsPage() {
  const { can } = usePermissions()
  const [rows, setRows] = useState<BankAndCardMovementRow[]>([])
  const [connections, setConnections] = useState<Array<Record<string, any>>>([])
  const [loading, setLoading] = useState(true)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; title?: string; message: string } | null>(null)

  const loadConnections = useCallback(async () => {
    const connectionPayload = await bankCardMovementsService.getConnections()
    setConnections(Array.isArray(connectionPayload.data) ? connectionPayload.data : [])
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const transactionPayload = await bankCardMovementsService.getTransactions('waiting')
      setRows(Array.isArray(transactionPayload.data) ? transactionPayload.data : [])
      loadConnections().catch(() => setConnections([]))
    } catch (error) {
      setToast({ type: 'error', title: 'Hata', message: error instanceof Error ? error.message : 'Banka hareketleri yüklenemedi.' })
    } finally {
      setLoading(false)
    }
  }, [loadConnections])

  useEffect(() => {
    loadData()
  }, [loadData])

  const tableData = useMemo(() => rows.map(row => ({
    ...row,
    source_label: row.source_type === 'card' ? 'Kart' : 'Banka',
    counterparty_display: row.counterparty_name || row.merchant_name || '-',
    direction_label: row.direction === 'credit' ? 'Giriş' : 'Çıkış',
    match_label: matchLabel(row.match_status),
  })), [rows])

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'waiting', label: 'Bekleyen', render: () => tableData.filter(row => row.match_status === 'waiting').length },
    { key: 'bank', label: 'Banka', render: () => tableData.filter(row => row.source_type === 'bank').length },
    { key: 'card', label: 'Kart', render: () => tableData.filter(row => row.source_type === 'card').length },
    { key: 'connections', label: 'Bağlantı', render: () => connections.length },
  ], [tableData, connections.length])

  const syncConnection = async (connectionId: string) => {
    setSyncingId(connectionId)
    try {
      const result = await bankCardMovementsService.syncConnection(connectionId)
      setToast({
        type: 'success',
        title: 'Senkronizasyon tamamlandı',
        message: `${result.data.bankTransactionsUpserted} banka, ${result.data.cardTransactionsUpserted} kart hareketi işlendi.`,
      })
      await loadData()
    } catch (error) {
      setToast({ type: 'error', title: 'Senkronizasyon başarısız', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
    } finally {
      setSyncingId(null)
    }
  }

  return (
    <div className="relative">
      <PageBanner
        mode="list"
        title="Banka ve Kart Hareketleri"
        subtitle="Banka ve kredi kartı hareketlerini güvenli sağlayıcı bağlantılarından içe aktarın ve ön muhasebe hareketleriyle eşleştirin."
        icon={<WalletCards size={24} />}
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Banka Bağlantıları</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Kimlik bilgileri frontend tarafına gönderilmez; sadece credential_id referansı backend tarafında çözülür.</p>
            </div>
            <button className="btn" onClick={loadData}><RefreshCw size={16} />Yenile</button>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {connections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-700">Henüz banka bağlantısı yok.</div>
            ) : connections.map(connection => (
              <div key={connection.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{connection.connection_name || connection.provider_display_name}</p>
                  <p className="text-xs text-gray-500">{connection.provider_code} · {connection.status} · {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString('tr-TR') : 'Henüz sync yok'}</p>
                </div>
                {can(ACCOUNTING_PERMISSIONS.bankConnectionsEdit) && (
                  <button disabled={syncingId === connection.id} className="btn btn-primary" onClick={() => syncConnection(connection.id)}>
                    <RefreshCw size={16} className={syncingId === connection.id ? 'animate-spin' : ''} />
                    Sync
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <SmartDataTable
          columns={columns}
          data={tableData}
          loading={loading}
          widgets={widgets}
          defaultView="list"
          storageKey="accounting-bank-card-movements"
          emptyText="Bekleyen banka veya kart hareketi bulunamadı"
          onRefresh={loadData}
        />
      </div>
    </div>
  )
}

function matchLabel(status: string) {
  return ({
    waiting: 'Bekliyor',
    matched: 'Eşleşti',
    mismatch_amount: 'Tutar Tutarsız',
    mismatch_date: 'Tarih Tutarsız',
    mismatch_counterparty: 'Karşı Taraf Tutarsız',
    not_found: 'Bulunamadı',
    manual_match: 'Manuel Eşleşti',
    ignored: 'Yok Sayıldı',
  } as Record<string, string>)[status] || status
}
