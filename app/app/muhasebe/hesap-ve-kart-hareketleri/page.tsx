'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileDown, Filter, Link2, Plus, RefreshCw, SearchCheck, WalletCards, X } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, type ColumnDef, type SortConfig, type WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { usePermissions } from '@/lib/security/permissionStore'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import {
  financialInstitutionMovementsService,
  type FinancialInstitutionMovementRow,
  type MovementFilters,
} from '@/lib/modules/accounting/bank-integration/financialInstitutionMovements.service'
import type { ListMeta } from '@/lib/api/listEndpoint'

type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }

const MATCH_LABELS: Record<string, string> = {
  waiting: 'Bekliyor',
  matched: 'Eşleşti',
  manual_match: 'Manuel Eşleşti',
  suggested: 'Öneri Var',
  mismatch_amount: 'Tutar Tutarsız',
  mismatch_date: 'Tarih Tutarsız',
  mismatch_counterparty: 'Karşı Taraf Tutarsız',
  not_found: 'Eşleşme Bulunamadı',
  review_required: 'İnceleme Gerekli',
  cancelled: 'İptal',
}

export default function FinancialInstitutionMovementsPage() {
  return (
    <Suspense fallback={<FinancialInstitutionMovementsFallback />}>
      <FinancialInstitutionMovementsContent />
    </Suspense>
  )
}

function FinancialInstitutionMovementsFallback() {
  return (
    <div className="space-y-4">
      <PageBanner
        mode="list"
        title="Hesap ve Kart Hareketleri"
        subtitle="Hareketler yukleniyor"
        icon={<WalletCards size={24} />}
      />
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
        Yukleniyor...
      </div>
    </div>
  )
}

function FinancialInstitutionMovementsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { can } = usePermissions()
  const [rows, setRows] = useState<FinancialInstitutionMovementRow[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FinancialInstitutionMovementRow | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'movement_date', direction: 'desc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })

  const filters = useMemo<MovementFilters>(() => ({
    bankConnectionId: searchParams.get('bankConnectionId'),
    accountId: searchParams.get('accountId'),
    cardId: searchParams.get('cardId'),
    companyId: searchParams.get('companyId'),
    matchStatus: searchParams.get('matchStatus'),
    movementType: searchParams.get('movementType'),
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
  }), [searchParams])

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await financialInstitutionMovementsService.getMovements({ ...filters, ...listQuery })
      setRows(payload.data || [])
      setSummary(payload.summary || {})
      setListMeta(payload.meta ?? { page: listQuery.page, pageSize: listQuery.pageSize, total: payload.data?.length ?? 0, totalPages: 1 })
    } catch (error) {
      setToast({ type: 'error', title: 'Hata', message: error instanceof Error ? error.message : 'Hareketler yüklenemedi.' })
    } finally {
      setLoading(false)
    }
  }, [filters, listQuery])

  useEffect(() => {
    loadRows()
  }, [loadRows])


  const tableData = useMemo(() => rows.map(row => ({
    ...row,
    source_type_label: sourceTypeLabel(row.source_type),
    direction_label: row.direction === 'credit' ? 'Alacak' : 'Borç',
    match_status_label: MATCH_LABELS[row.match_status] || row.match_status,
    linked_pre_accounting_label: row.matched_pre_accounting_movement_id || '-',
    actions: row.id,
  })), [rows])

  const columns: ColumnDef[] = [
    { key: 'movement_date', label: 'Tarih', type: 'date', width: 105, sortable: true },
    { key: 'company_name', label: 'Şirket', type: 'text', width: 130 },
    { key: 'bank_name', label: 'Banka', type: 'text', width: 120 },
    { key: 'account_card_name', label: 'Hesap / Kart', type: 'text', width: 150 },
    { key: 'source_type_label', label: 'Kaynak Tipi', type: 'text', width: 110 },
    { key: 'movement_type', label: 'Hareket Tipi', type: 'text', width: 110 },
    { key: 'description', label: 'Açıklama', type: 'text', width: 240 },
    { key: 'counterparty_name', label: 'Karşı Taraf', type: 'text', width: 160 },
    { key: 'amount', label: 'Tutar', type: 'number', width: 110 },
    { key: 'currency', label: 'Para Birimi', type: 'text', width: 90 },
    { key: 'direction_label', label: 'Borç / Alacak', type: 'text', width: 110 },
    { key: 'match_status_label', label: 'Eşleşme Durumu', type: 'text', width: 150 },
    { key: 'linked_pre_accounting_label', label: 'Bağlı Ön Muhasebe Hareketi', type: 'text', width: 180 },
    { key: 'source', label: 'Kaynak', type: 'text', width: 80 },
    { key: 'actions', label: 'İşlemler', type: 'text', width: 360, fixedWidth: true, render: (_v, row) => <MovementActions row={row} onSelect={() => setSelected(row)} onToast={setToast} onReload={loadRows} /> },
  ]

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Hareket', render: () => summary.total || 0 },
    { key: 'unmatched', label: 'Eşleşmeyen Hareket', render: () => summary.unmatched || 0 },
    { key: 'matched', label: 'Eşleşen Hareket', render: () => summary.matched || 0 },
    { key: 'review', label: 'Manuel İnceleme Gereken', render: () => summary.reviewRequired || 0 },
    { key: 'credit', label: 'Toplam Giriş', render: () => formatAmount(summary.totalCredit || 0) },
    { key: 'debit', label: 'Toplam Çıkış', render: () => formatAmount(summary.totalDebit || 0) },
  ], [summary])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'movement_date', direction: sort?.direction || 'desc' }))
  }

  if (!can(ACCOUNTING_PERMISSIONS.bankMovementsView)) {
    return <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">Bu sayfayı görüntüleme yetkiniz yok.</div>
  }

  return (
    <div className="relative">
      <PageBanner
        mode="list"
        title="Hesap ve Kart Hareketleri"
        subtitle="Banka hesap ve kart hareketlerini görüntüleyin, ön muhasebe kayıtlarıyla eşleştirin ve mutabakat durumlarını takip edin."
        icon={<WalletCards size={24} />}
        onAddClick={can(ACCOUNTING_PERMISSIONS.bankMovementsInsertManual) ? () => setToast({ type: 'warning', title: 'Manuel Hareket', message: 'Manuel hareket form altyapısı API tarafında hazırlandı.' }) : undefined}
        addButtonText="Manuel Hareket Ekle"
      />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ActiveFilters filters={filters} onClear={() => router.push('/app/muhasebe/hesap-ve-kart-hareketleri')} />
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={loadRows}><RefreshCw size={16} />Senkronize Et</button>
            <button className="btn"><FileDown size={16} />CSV / Excel İçe Aktar</button>
            <button className="btn"><Filter size={16} />Filtreler</button>
            <button className="btn"><FileDown size={16} />Dışa Aktar</button>
          </div>
        </div>

        <SmartDataTable
          columns={columns}
          data={tableData}
          loading={loading}
          widgets={widgets}
          defaultView="list"
          storageKey="financial-institution-movements"
          emptyText="Filtreye uygun banka/kart hareketi bulunamadı"
          onRefresh={loadRows}
          onRowClick={(row: any) => setSelected(row)}
          defaultPageSize={listQuery.pageSize}
          pagination={{
            mode: 'server',
            page: listMeta.page,
            pageSize: listMeta.pageSize,
            total: listMeta.total,
            onPageChange: page => setListQuery(prev => ({ ...prev, page })),
            onPageSizeChange: pageSize => setListQuery(prev => ({ ...prev, page: 1, pageSize })),
            onSearchChange: search => setListQuery(prev => ({ ...prev, page: 1, search })),
            onSortChange: handleListSortChange,
          }}
        />
      </div>

      {selected && <MovementDetailOverlay movement={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function MovementActions({ row, onSelect, onToast, onReload }: { row: FinancialInstitutionMovementRow; onSelect: () => void; onToast: (toast: ToastState) => void; onReload: () => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      <button className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200" onClick={(event) => { event.stopPropagation(); onSelect() }}>Görüntüle</button>
      <button className="rounded bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" onClick={(event) => { event.stopPropagation(); matchRow(row.id, onToast, onReload) }}><Link2 size={11} className="inline" /> Ön Muhasebe ile Eşleştir</button>
      <button className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" onClick={(event) => { event.stopPropagation(); createPreAccounting(row.id, onToast) }}><Plus size={11} className="inline" /> Yeni Ön Muhasebe Hareketi Oluştur</button>
      <button className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200" onClick={(event) => { event.stopPropagation(); reviewRow(row.id, onToast, onReload) }}><SearchCheck size={11} className="inline" /> İncelemeye Al</button>
      <button className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200">Geçmiş</button>
    </div>
  )
}

function MovementDetailOverlay({ movement, onClose }: { movement: FinancialInstitutionMovementRow; onClose: () => void }) {
  const [showRaw, setShowRaw] = useState(false)
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hareket Detayı</h2>
          <p className="text-sm text-gray-500">{movement.description || movement.reference_no || movement.id}</p>
        </div>
        <button className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="grid gap-2">
        <Detail label="Şirket" value={movement.company_name || '-'} />
        <Detail label="Banka" value={movement.bank_name || '-'} />
        <Detail label="Hesap / Kart" value={movement.account_card_name || '-'} />
        <Detail label="Tarih" value={movement.movement_date} />
        <Detail label="Valör Tarihi" value={movement.value_date || '-'} />
        <Detail label="Açıklama" value={movement.description || '-'} />
        <Detail label="Karşı Taraf" value={movement.counterparty_name || '-'} />
        <Detail label="Karşı Taraf IBAN" value={movement.counterparty_iban || '-'} />
        <Detail label="Tutar" value={formatAmount(Number(movement.amount || 0), movement.currency)} />
        <Detail label="Borç / Alacak" value={movement.direction === 'credit' ? 'Alacak' : 'Borç'} />
        <Detail label="Referans No" value={movement.reference_no || '-'} />
        <Detail label="Kaynak" value={movement.source} />
        <Detail label="Eşleşme Durumu" value={MATCH_LABELS[movement.match_status] || movement.match_status} />
        <Detail label="Bağlı Ön Muhasebe Hareketi" value={movement.matched_pre_accounting_movement_id || '-'} />
      </div>
      <button className="btn mt-4" onClick={() => setShowRaw(!showRaw)}>Raw Data</button>
      {showRaw && <pre className="mt-3 overflow-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-100">{JSON.stringify(movement.raw_data || {}, null, 2)}</pre>}
    </div>
  )
}

function ActiveFilters({ filters, onClear }: { filters: MovementFilters; onClear: () => void }) {
  const entries = Object.entries(filters).filter(([, value]) => value)
  if (!entries.length) return <span className="text-sm text-gray-500">Aktif URL filtresi yok</span>
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
      {entries.map(([key, value]) => <span key={key} className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{key}: {value}</span>)}
      <button className="btn" onClick={onClear}>Temizle</button>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950"><div className="text-xs text-gray-500">{label}</div><div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value}</div></div>
}

async function matchRow(id: string, onToast: (toast: ToastState) => void, onReload: () => void) {
  try {
    await financialInstitutionMovementsService.match(id)
    onToast({ type: 'success', title: 'Eşleşti', message: 'Hareket eşleşti olarak işaretlendi.' })
    onReload()
  } catch (error) {
    onToast({ type: 'error', title: 'Eşleştirilemedi', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
  }
}

async function reviewRow(id: string, onToast: (toast: ToastState) => void, onReload: () => void) {
  try {
    await financialInstitutionMovementsService.review(id)
    onToast({ type: 'success', title: 'İncelemeye alındı', message: 'Hareket manuel inceleme kuyruğuna alındı.' })
    onReload()
  } catch (error) {
    onToast({ type: 'error', title: 'İşlem başarısız', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
  }
}

async function createPreAccounting(id: string, onToast: (toast: ToastState) => void) {
  try {
    const result = await financialInstitutionMovementsService.createPreAccounting(id)
    window.location.href = result.data.redirectUrl
  } catch (error) {
    onToast({ type: 'error', title: 'Kayıt açılamadı', message: error instanceof Error ? error.message : 'İşlem tamamlanamadı.' })
  }
}

function sourceTypeLabel(value: string) {
  return ({ bank_account: 'Banka Hesabı', card: 'Kart', pos: 'POS', manual: 'Manuel' } as Record<string, string>)[value] || value
}

function formatAmount(value: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}
