'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, Globe2, Layers3, MapPinned, RefreshCw } from 'lucide-react'
import { DashboardWidgetShell } from '@/components/dashboard/DashboardWidgetShell'
import { TurkeyReachMap } from '@/components/maps/TurkeyReachMap'
import { WorldReachMap } from '@/components/maps/WorldReachMap'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/lib/security/permissionStore'
import {
  fetchGeographicTradeReach,
  type GeoPoint,
  type GeographicReachDataMode,
  type GeographicReachLocationScope,
  type GeographicReachMode,
  type GeographicTradeReachResponse,
} from '@/lib/modules/companies/services/geographicTradeReach.service'

export interface GeographicTradeReachWidgetAction {
  type: 'filter'
  module: string
  field: 'geo'
  value: {
    country: string
    city?: string
    dataMode: GeographicReachDataMode
    relationType: string
  }
}

interface GeographicTradeReachWidgetProps {
  selectedCompanyId?: string | null
  className?: string
  onWidgetAction?: (action: GeographicTradeReachWidgetAction) => void
}

const RELATION_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'company', label: 'Şirket' },
  { value: 'stakeholder', label: 'Paydaş' },
  { value: 'customer', label: 'Müşteri' },
  { value: 'partner', label: 'Ortak' },
  { value: 'representative', label: 'Temsilci' },
  { value: 'dealer', label: 'Bayi' },
  { value: 'supplier', label: 'Tedarikçi' },
  { value: 'project', label: 'Proje' },
]

const LOCATION_OPTIONS: Array<{ value: GeographicReachLocationScope; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'turkey', label: 'Türkiye' },
  { value: 'world', label: 'Dünya' },
]

export function GeographicTradeReachWidget({ selectedCompanyId, className, onWidgetAction }: GeographicTradeReachWidgetProps) {
  const { can } = usePermissions()
  const [manualAll, setManualAll] = useState(false)
  const [dataMode, setDataMode] = useState<GeographicReachDataMode>('relationship')
  const [relationType, setRelationType] = useState('all')
  const [locationScope, setLocationScope] = useState<GeographicReachLocationScope>('all')
  const [payload, setPayload] = useState<GeographicTradeReachResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canViewTrade = can('trade_reach.view') && can('account_movements.view_summary')
  const mode: GeographicReachMode = selectedCompanyId && !manualAll ? 'selected' : 'all'

  useEffect(() => {
    if (!selectedCompanyId) setManualAll(false)
  }, [selectedCompanyId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchGeographicTradeReach({
      companyId: mode === 'selected' ? selectedCompanyId : undefined,
      mode,
      dataMode,
      relationTypes: relationType === 'all' ? [] : [relationType],
    })
      .then(nextPayload => {
        if (!cancelled) setPayload(nextPayload)
      })
      .catch(fetchError => {
        if (!cancelled) {
          setPayload(null)
          setError(fetchError instanceof Error ? fetchError.message : 'Coğrafi erişim verisi alınamadı')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCompanyId, mode, dataMode, relationType])

  const visibleTurkey = locationScope === 'all' || locationScope === 'turkey'
  const visibleWorld = locationScope === 'all' || locationScope === 'world'

  const emptyText = dataMode === 'trade'
    ? 'Ticari hareket verisi henüz oluşmadı. Cari hareketler, banka/kart hareketleri ve faturalar girildikçe bu harita ticari ağı gösterecektir.'
    : 'Coğrafi bağlantı verisi bulunamadı.'

  const totalVisiblePoints = (payload?.turkey.length || 0) + (payload?.world.length || 0)

  const summaryItems = useMemo(() => ([
    { label: 'Toplam Ülke', value: payload?.summary.totalCountries ?? '-' },
    { label: 'Toplam İl / Şehir', value: payload?.summary.totalCities ?? '-' },
    { label: 'Toplam Bağlantı Noktası', value: payload?.summary.totalPoints ?? '-' },
    {
      label: 'Toplam Ticari Hacim',
      value: payload?.summary.totalTradeAmount
        ? formatAmount(payload.summary.totalTradeAmount, payload.summary.currency || 'TRY')
        : 'Veri bekleniyor',
    },
  ]), [payload])

  const handlePointClick = (point: GeoPoint) => {
    onWidgetAction?.({
      type: 'filter',
      module: 'companies',
      field: 'geo',
      value: {
        country: point.country,
        city: point.city,
        dataMode,
        relationType,
      },
    })
  }

  return (
    <DashboardWidgetShell
      title="Coğrafi Erişim ve Ticari Ağ"
      description="Şirket bağlantılarının Türkiye ve dünya üzerindeki dağılımı"
      className={cn('min-h-[520px]', className)}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {summaryItems.map(item => (
            <div key={item.label} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{item.label}</div>
              <div className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-md border border-gray-100 bg-white p-2 dark:border-gray-800 dark:bg-gray-950 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              label="Görünüm"
              value={mode}
              options={[
                { value: 'all', label: 'Tüm Şirketler' },
                { value: 'selected', label: 'Seçilen Şirket', disabled: !selectedCompanyId },
              ]}
              onChange={value => setManualAll(value === 'all')}
            />
            <SegmentedControl
              label="Veri Modu"
              value={dataMode}
              options={[
                { value: 'relationship', label: 'Bağlantı Ağı' },
                { value: 'trade', label: 'Ticari Ağ', disabled: !canViewTrade },
              ]}
              onChange={value => setDataMode(value as GeographicReachDataMode)}
            />
          </div>

          {selectedCompanyId && mode === 'selected' && (
            <button
              type="button"
              onClick={() => setManualAll(true)}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw size={13} />
              Tümünü Göster
            </button>
          )}
        </div>

        {!canViewTrade && dataMode === 'trade' ? (
          <EmptyPanel text="Ticari ağı görüntüleme yetkiniz yok. Bağlantı Ağı gösterilebilir." />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <SelectFilter label="Bağlantı Türü" value={relationType} options={RELATION_OPTIONS} onChange={setRelationType} />
              <SelectFilter label="Lokasyon" value={locationScope} options={LOCATION_OPTIONS} onChange={value => setLocationScope(value as GeographicReachLocationScope)} />
              {dataMode === 'trade' && (
                <div className="inline-flex items-center gap-2 rounded-md border border-dashed border-gray-200 px-2 py-1 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <BarChart3 size={13} />
                  Tarih, para birimi ve işlem tipi filtreleri veri geldiğinde aktifleşecek
                </div>
              )}
            </div>

            {error && <EmptyPanel text={error} tone="error" />}
            {!error && loading && <LoadingPanel />}
            {!error && !loading && totalVisiblePoints === 0 && <EmptyPanel text={emptyText} />}

            {!error && !loading && totalVisiblePoints > 0 && (
              <div className={cn('grid gap-3', visibleTurkey && visibleWorld ? 'lg:grid-cols-2' : 'grid-cols-1')}>
                {visibleTurkey && (
                  <MapPanel title="Türkiye Erişimi" icon={<MapPinned size={15} />}>
                    <TurkeyReachMap points={payload?.turkey || []} dataMode={dataMode} relationType={relationType} onPointClick={handlePointClick} />
                  </MapPanel>
                )}
                {visibleWorld && (
                  <MapPanel title="Dünya Erişimi" icon={<Globe2 size={15} />}>
                    <WorldReachMap points={payload?.world || []} dataMode={dataMode} relationType={relationType} onPointClick={handlePointClick} />
                  </MapPanel>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardWidgetShell>
  )
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string; disabled?: boolean }>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-800 dark:bg-gray-900">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-7 px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
              value === option.value
                ? 'rounded bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SelectFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      {label}
      <select
        value={value}
        onChange={event => onChange(event.target.value as T)}
        className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 outline-none focus:border-blue-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function MapPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function LoadingPanel() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {[0, 1].map(item => (
        <div key={item} className="h-72 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900" />
      ))}
    </div>
  )
}

function EmptyPanel({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'error' }) {
  return (
    <div className={cn(
      'rounded-lg border border-dashed p-6 text-sm',
      tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300'
        : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300'
    )}>
      <div className="flex items-center gap-2">
        <Layers3 size={16} />
        <span>{text}</span>
      </div>
    </div>
  )
}

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}
