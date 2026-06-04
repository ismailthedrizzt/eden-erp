'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { 
  Search, 
  Grid3X3, 
  List, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  X,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  AlertTriangle,
  RefreshCw,
  FileDown,
  Plus,
  ImageIcon,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'
import { WidgetPickerModal, type WidgetPickerItem } from '@/components/dashboard/WidgetPickerModal'
import type { AnyDashboardWidgetConfig, DashboardFilterEvent } from '@/components/dashboard/dashboard.types'
import { moveWidgetId, parseWidgetPreferenceIds, widgetPreferenceStorageKey } from '@/lib/dashboard/widgetPreferences'
import { getCountryLabel, getCountryNationalityLabel } from '@/lib/reference/country-nationalities'
import { getCachedTablePreference, syncUiPreferencesPatch, updateCachedUiPreferences } from '@/lib/user-state/client'

// Column Definition Types
type ColumnType = 'text' | 'number' | 'date' | 'enum' | 'boolean' | 'image' | 'badge' | 'avatar' | 'actions'

const MAX_TABLE_PAGE_SIZE = 100

function clampTablePageSize(value: number) {
  return Math.min(Math.max(Number.isFinite(value) ? value : 10, 1), MAX_TABLE_PAGE_SIZE)
}

export interface ColumnDef {
  key: string
  label: string
  type: ColumnType
  required?: boolean
  sortable?: boolean
  filterable?: boolean
  visible?: boolean
  hideable?: boolean
  fixed?: boolean
  width?: number // Width in pixels
  minWidth?: number
  maxWidth?: number
  fixedWidth?: boolean // If true, width is fixed and won't shrink
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' // Responsive font size
  enumOptions?: string[] // For enum type
  moduleDependency?: string // Module that must be active
  permission?: string // Permission required to view
  render?: (value: any, row: any) => React.ReactNode
  imageFit?: 'cover' | 'contain'
  imageShape?: 'circle' | 'rounded'
  hideHeaderLabel?: boolean
  order?: number // For drag-drop ordering
  category?: string // For grouping columns in selector (e.g., 'Kişisel', 'İş', 'Eğitim')
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
  priority: number
}

export interface FilterConfig {
  key: string
  type: ColumnType
  value: any
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'between'
}

export type TableStatusFilterTone = 'draft' | 'active' | 'passive' | 'neutral'

export interface TableStatusFilterOption {
  value: string
  label: string
  tone?: TableStatusFilterTone
}

export type RecordStatusFilterValue = 'draft' | 'active' | 'passive'

export const RECORD_STATUS_FILTERS: RecordStatusFilterValue[] = ['draft', 'active', 'passive']
export const DEFAULT_RECORD_STATUS_FILTERS: RecordStatusFilterValue[] = ['draft', 'active']
export const RECORD_STATUS_FILTER_OPTIONS: TableStatusFilterOption[] = [
  { value: 'draft', label: 'Taslak', tone: 'draft' },
  { value: 'active', label: 'Aktif', tone: 'active' },
  { value: 'passive', label: 'Pasif', tone: 'passive' },
]

export function normalizeRecordStatusFilters(values: string[]): RecordStatusFilterValue[] {
  const allowed = new Set(RECORD_STATUS_FILTERS)
  const next = values.filter((value): value is RecordStatusFilterValue => allowed.has(value as RecordStatusFilterValue))
  return next.length ? next : DEFAULT_RECORD_STATUS_FILTERS
}

export interface ServerPaginationConfig {
  mode: 'server'
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSearchChange?: (search: string) => void
  onSortChange?: (sorts: SortConfig[]) => void
  onFilterChange?: (filters: FilterConfig[]) => void
}

interface SmartDataTableProps<T extends { id: string }> {
  data: T[]
  columns: ColumnDef[]
  title?: string
  onRowClick?: (row: T) => void
  onRefresh?: () => void
  loading?: boolean
  emptyText?: React.ReactNode
  storageKey?: string // For persisting user preferences
  widgets?: WidgetDef[]
  dashboardWidgets?: AnyDashboardWidgetConfig[]
  onDashboardFilter?: (event: DashboardFilterEvent) => void
  defaultView?: 'list' | 'card'
  defaultPageSize?: number
  pageSizeOptions?: number[]
  /**
   * Use for ERP lists backed by list endpoints.
   * Server mode means data already contains only the current backend page.
   */
  pagination?: ServerPaginationConfig
  realtime?: boolean
  pollingInterval?: number
  /** Shows a toolbar toggle that asks the parent page to include passive records. */
  showPassiveToggle?: boolean
  includePassive?: boolean
  onIncludePassiveChange?: (includePassive: boolean) => void
  includePassiveLabel?: string
  statusFilterOptions?: TableStatusFilterOption[]
  activeStatusFilters?: string[]
  onStatusFiltersChange?: (values: string[]) => void
  quickLookDefaultOpen?: boolean
  forceQuickLookClosed?: boolean
}

export interface WidgetDef<T = any> {
  key: string
  label: string
  render: (row: T) => React.ReactNode
  moduleDependency?: string
}

type StoredTablePreference = {
  viewMode?: 'list' | 'card'
  pageSize?: number
  columns?: StoredColumnPreference[]
  quickLookOpen?: boolean
  quickLookWidgetIds?: string[]
}

type StoredColumnPreference = {
  key: string
  visible?: boolean
  order?: number
}

function getDefaultColumnVisibility(col: ColumnDef) {
  if (col.fixed || col.hideable === false) return true
  if (typeof col.visible === 'boolean') return col.visible
  return col.required !== false
}

function mergeColumnConfig(allColumns: ColumnDef[], savedColumns?: ColumnDef[]) {
  const savedByKey = new Map((savedColumns || []).map(col => [col.key, col]))

  return allColumns
    .map((col, index) => {
      const saved = savedByKey.get(col.key)
      const canHide = col.hideable !== false && !col.fixed
      const pinnedOrder = getPinnedSmartListColumnOrder(col, index)

      return {
        ...col,
        visible: canHide ? saved?.visible ?? getDefaultColumnVisibility(col) : true,
        order: pinnedOrder ?? col.order ?? saved?.order ?? index,
      }
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function getPinnedSmartListColumnOrder(col: ColumnDef, index: number) {
  const key = col.key.toLocaleLowerCase('tr-TR')
  if (key === 'record_status' || key === 'status') return -100 + index / 1000
  if (col.type === 'avatar') return -90 + index / 1000
  return null
}

function isActionColumn(col: ColumnDef) {
  return col.type === 'actions' || col.key === 'actions'
}

function quickLookWidgetId(kind: 'summary' | 'dashboard', key: string) {
  return `${kind}:${key}`
}

function cleanDisplayText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getRowDisplayName(row: Record<string, any>, fallback = 'Kayıt') {
  return cleanDisplayText(row.full_name)
    || cleanDisplayText(row.fullname)
    || cleanDisplayText(row.display_name)
    || cleanDisplayText(row.name)
    || cleanDisplayText(row.short_name)
    || cleanDisplayText(row.trade_name)
    || cleanDisplayText(row.company_name)
    || cleanDisplayText(row.branch_name)
    || cleanDisplayText(row.title)
    || cleanDisplayText(row.code)
    || fallback
}

function getRowInitials(row: Record<string, any>) {
  const firstInitial = cleanDisplayText(row.first_name || row.firstName).charAt(0)
  const lastInitial = cleanDisplayText(row.last_name || row.lastName || row.surname).charAt(0)
  const directInitials = `${firstInitial}${lastInitial}`.toUpperCase()
  if (directInitials) return directInitials

  const displayName = getRowDisplayName(row, '')
  if (!displayName) return ''

  const words = displayName
    .split(/\s+/)
    .map(part => part.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)

  return words
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
}

const LEGACY_PASSIVE_STATUS_FILTERS: TableStatusFilterOption[] = [
  { value: 'active', label: 'Aktif', tone: 'active' },
  { value: 'passive', label: 'Pasif', tone: 'passive' },
]

const statusFilterToneClasses: Record<TableStatusFilterTone, { dot: string; active: string; inactive: string }> = {
  draft: {
    dot: 'bg-amber-400',
    active: 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm dark:border-amber-400 dark:bg-amber-500/15 dark:text-amber-100',
    inactive: 'border-amber-200 bg-white text-amber-700 opacity-55 hover:opacity-80 dark:border-amber-500/30 dark:bg-gray-900 dark:text-amber-200',
  },
  active: {
    dot: 'bg-emerald-500',
    active: 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-100',
    inactive: 'border-emerald-200 bg-white text-emerald-700 opacity-55 hover:opacity-80 dark:border-emerald-500/30 dark:bg-gray-900 dark:text-emerald-200',
  },
  passive: {
    dot: 'bg-slate-400',
    active: 'border-slate-500 bg-slate-100 text-slate-900 shadow-sm dark:border-slate-300 dark:bg-slate-500/20 dark:text-slate-100',
    inactive: 'border-slate-200 bg-white text-slate-600 opacity-55 hover:opacity-80 dark:border-slate-500/30 dark:bg-gray-900 dark:text-slate-300',
  },
  neutral: {
    dot: 'bg-blue-500',
    active: 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-100',
    inactive: 'border-blue-200 bg-white text-blue-700 opacity-55 hover:opacity-80 dark:border-blue-500/30 dark:bg-gray-900 dark:text-blue-200',
  },
}

function StatusDotFilter({
  options,
  activeValues,
  lockedValues = [],
  ariaLabel,
  onChange,
}: {
  options: TableStatusFilterOption[]
  activeValues: string[]
  lockedValues?: string[]
  ariaLabel: string
  onChange: (values: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const activeSet = new Set(activeValues)
  const lockedSet = new Set(lockedValues)
  const activeOptions = options.filter(option => activeSet.has(option.value))

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  const toggle = (value: string) => {
    if (lockedSet.has(value) && activeSet.has(value)) return

    const next = activeSet.has(value)
      ? activeValues.filter(item => item !== value)
      : [...activeValues, value]

    if (!next.length) return
    onChange(options.map(option => option.value).filter(value => next.includes(value)))
  }

  return (
    <div
      ref={dropdownRef}
      className="relative shrink-0"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(previous => !previous)}
        className="flex h-10 max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        <span className="flex shrink-0 items-center -space-x-1" aria-hidden="true">
          {(activeOptions.length ? activeOptions : options.slice(0, 1)).slice(0, 5).map(option => (
            <span
              key={option.value}
              className={cn(
                'h-3 w-3 rounded-full border border-white dark:border-gray-900',
                activeSet.has(option.value) ? statusFilterToneClasses[option.tone || 'neutral'].dot : 'bg-gray-300 dark:bg-gray-600'
              )}
            />
          ))}
        </span>
        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {activeOptions.length}/{options.length}
        </span>
        <ChevronDown size={15} className={cn('shrink-0 text-gray-500 transition-transform dark:text-gray-400', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-950"
        >
          {options.map(option => {
            const tone = statusFilterToneClasses[option.tone || 'neutral']
            const active = activeSet.has(option.value)
            const locked = lockedSet.has(option.value) && active

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemcheckbox"
                aria-checked={active}
                aria-label={`${option.label} kayıtları ${active ? 'gizle' : 'göster'}`}
                disabled={locked}
                onClick={() => toggle(option.value)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-default disabled:opacity-80 dark:text-gray-200 dark:hover:bg-gray-900',
                  active && 'bg-gray-50 dark:bg-gray-900'
                )}
              >
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded border text-[13px] leading-none',
                    active
                      ? 'border-gray-800 bg-gray-100 text-gray-900 dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                      : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-950'
                  )}
                  aria-hidden="true"
                >
                  {active ? '✓' : ''}
                </span>
                <span className={cn('h-3.5 w-3.5 shrink-0 rounded-full', tone.dot)} aria-hidden="true" />
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SmartDataTable<T extends { id: string }>({
  data,
  columns: initialColumns,
  title,
  onRowClick,
  onRefresh,
  loading = false,
  emptyText = 'Kayıt bulunamadı',
  storageKey = 'smart-table-default',
  widgets = [],
  dashboardWidgets = [],
  onDashboardFilter,
  defaultView = 'list',
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  pagination,
  realtime = false,
  pollingInterval = 30000,
  showPassiveToggle = false,
  includePassive = false,
  onIncludePassiveChange,
  statusFilterOptions,
  activeStatusFilters,
  onStatusFiltersChange,
  quickLookDefaultOpen = false,
  forceQuickLookClosed = false,
}: SmartDataTableProps<T>) {
  const isServerPaginated = pagination?.mode === 'server'
  const columnSignature = initialColumns.map(col => `${col.key}:${col.label}:${col.visible ?? ''}:${col.required ?? ''}:${col.fixed ?? ''}:${col.hideable ?? ''}:${col.order ?? ''}:${col.width ?? ''}:${col.fixedWidth ?? ''}`).join('|')
  const quickLookWidgetIds = [
    ...dashboardWidgets.map(widget => quickLookWidgetId('dashboard', widget.id)),
    ...widgets.map(widget => quickLookWidgetId('summary', widget.key)),
  ]
  const quickLookWidgetSignature = quickLookWidgetIds.join('|')
  const quickLookPreferenceScope = `${storageKey}:quick-look`
  const recordStatusFiltersEnabled = !!onStatusFiltersChange || !!activeStatusFilters?.length
  const customStatusFiltersEnabled = !!statusFilterOptions?.length || recordStatusFiltersEnabled
  const resolvedStatusFilterOptions = statusFilterOptions?.length
    ? statusFilterOptions ?? []
    : recordStatusFiltersEnabled
      ? RECORD_STATUS_FILTER_OPTIONS
      : showPassiveToggle
      ? LEGACY_PASSIVE_STATUS_FILTERS
      : []
  const resolvedActiveStatusFilters = customStatusFiltersEnabled
    ? activeStatusFilters?.length
      ? activeStatusFilters
      : resolvedStatusFilterOptions.map(option => option.value)
    : includePassive
      ? ['active', 'passive']
      : ['active']
  const resolvedPageSizeOptions = pageSizeOptions
    .map(option => clampTablePageSize(option))
    .filter((option, index, options) => options.indexOf(option) === index)
  const lockedStatusFilters = customStatusFiltersEnabled ? [] : ['active']
  const handleStatusFiltersChange = (values: string[]) => {
    if (customStatusFiltersEnabled) {
      onStatusFiltersChange?.(values)
      return
    }

    onIncludePassiveChange?.(values.includes('passive'))
  }

  // User Preferences State
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'card'>(defaultView)
  
  const [pageSize, setPageSize] = useState(() => clampTablePageSize(defaultPageSize))

  const [columnConfig, setColumnConfig] = useState<ColumnDef[]>(() => mergeColumnConfig(initialColumns))

  // Active Data State
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([])
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [showWidgets, setShowWidgets] = useState(quickLookDefaultOpen)
  const [showWidgetPicker, setShowWidgetPicker] = useState(false)
  const [selectedQuickLookWidgetIds, setSelectedQuickLookWidgetIds] = useState<string[]>(quickLookWidgetIds)
  const [loadedPreferenceSignature, setLoadedPreferenceSignature] = useState<string | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // Screen Size Detection
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [tableWidth, setTableWidth] = useState(0)

  // SmartLists keep record operations on the form/detail surface, not in list rows.
  const displayColumnConfig = useMemo(
    () => columnConfig.filter(col => !isActionColumn(col)),
    [columnConfig]
  )

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const preferenceSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const columnSelectorRef = useRef<HTMLDivElement>(null)
  const serverPaginationRef = useRef(pagination)
  const serverFilterSignatureRef = useRef(JSON.stringify(filters))
  const preferenceSignature = `${storageKey}|${defaultView}|${defaultPageSize}|${columnSignature}|${quickLookWidgetSignature}`

  useEffect(() => {
    serverPaginationRef.current = pagination
  }, [pagination])

  useEffect(() => {
    const cachedTablePreference = getCachedTablePreference<StoredTablePreference>(storageKey)
    const savedView = localStorage.getItem(`${storageKey}-view`)
    if (cachedTablePreference?.viewMode === 'list' || cachedTablePreference?.viewMode === 'card') {
      setViewMode(cachedTablePreference.viewMode)
    } else if (savedView === 'list' || savedView === 'card') {
      setViewMode(savedView)
    } else {
      setViewMode(defaultView)
    }

    const savedPageSize = localStorage.getItem(`${storageKey}-pageSize`)
    const parsedPageSize = typeof cachedTablePreference?.pageSize === 'number'
      ? cachedTablePreference.pageSize
      : savedPageSize ? parseInt(savedPageSize, 10) : defaultPageSize
    setPageSize(clampTablePageSize(Number.isFinite(parsedPageSize) ? parsedPageSize : defaultPageSize))

    const savedColumns = localStorage.getItem(`${storageKey}-columns`)
    if (Array.isArray(cachedTablePreference?.columns)) {
      setColumnConfig(mergeColumnConfig(initialColumns, cachedTablePreference.columns as ColumnDef[]))
    } else if (savedColumns) {
      try {
        setColumnConfig(mergeColumnConfig(initialColumns, JSON.parse(savedColumns) as ColumnDef[]))
      } catch {
        setColumnConfig(mergeColumnConfig(initialColumns))
      }
    } else {
      setColumnConfig(mergeColumnConfig(initialColumns))
    }

    const widgetPreferenceKey = widgetPreferenceStorageKey(quickLookPreferenceScope)
    setShowWidgets(forceQuickLookClosed ? false : quickLookDefaultOpen)
    setSelectedQuickLookWidgetIds(parseWidgetPreferenceIds(
      Array.isArray(cachedTablePreference?.quickLookWidgetIds)
        ? JSON.stringify(cachedTablePreference.quickLookWidgetIds)
        : localStorage.getItem(`${widgetPreferenceKey}:ids`) ?? localStorage.getItem(`${storageKey}-widgets`),
      quickLookWidgetIds,
    ))
    setLoadedPreferenceSignature(preferenceSignature)
    setPreferencesLoaded(true)
  }, [storageKey, defaultView, defaultPageSize, columnSignature, quickLookWidgetSignature, preferenceSignature, quickLookDefaultOpen, forceQuickLookClosed])

  useEffect(() => {
    if (forceQuickLookClosed) setShowWidgets(false)
  }, [forceQuickLookClosed])

  useEffect(() => {
    setColumnConfig(prev => mergeColumnConfig(initialColumns, prev))
  }, [columnSignature])

  useEffect(() => {
    setSelectedQuickLookWidgetIds(prev => {
      const allowedIds = new Set(quickLookWidgetIds)
      if (prev.length === 0 && quickLookWidgetIds.length > 0 && typeof window !== 'undefined' && !localStorage.getItem(`${widgetPreferenceStorageKey(quickLookPreferenceScope)}:ids`) && !localStorage.getItem(`${storageKey}-widgets`)) {
        return quickLookWidgetIds
      }
      return prev.filter(id => allowedIds.has(id))
    })
  }, [quickLookWidgetSignature, storageKey])

  // Persist preferences
  useEffect(() => {
    if (!preferencesLoaded) return
    if (loadedPreferenceSignature !== preferenceSignature) return
    const tablePreference: StoredTablePreference = {
      viewMode,
      pageSize,
      columns: serializeColumnPreferences(columnConfig),
      quickLookOpen: showWidgets,
      quickLookWidgetIds: selectedQuickLookWidgetIds,
    }
    localStorage.setItem(`${storageKey}-view`, viewMode)
    localStorage.setItem(`${storageKey}-pageSize`, pageSize.toString())
    localStorage.setItem(`${storageKey}-columns`, JSON.stringify(tablePreference.columns))
    const widgetPreferenceKey = widgetPreferenceStorageKey(quickLookPreferenceScope)
    localStorage.setItem(`${widgetPreferenceKey}:open`, String(showWidgets))
    localStorage.setItem(`${storageKey}-quickLook`, String(showWidgets))
    localStorage.setItem(`${widgetPreferenceKey}:ids`, JSON.stringify(selectedQuickLookWidgetIds))
    updateCachedUiPreferences({
      tablePreferences: {
        [storageKey]: tablePreference,
      },
    })
    if (preferenceSyncTimeoutRef.current) clearTimeout(preferenceSyncTimeoutRef.current)
    preferenceSyncTimeoutRef.current = setTimeout(() => {
      syncUiPreferencesPatch({
        tablePreferences: {
          [storageKey]: tablePreference,
        },
      }).catch(() => undefined)
    }, 700)

    return () => {
      if (preferenceSyncTimeoutRef.current) clearTimeout(preferenceSyncTimeoutRef.current)
    }
  }, [preferencesLoaded, loadedPreferenceSignature, preferenceSignature, viewMode, pageSize, columnConfig, showWidgets, selectedQuickLookWidgetIds, storageKey, quickLookPreferenceScope])

  const setQuickLookOpen = useCallback((nextOpen: boolean) => {
    if (forceQuickLookClosed && nextOpen) return
    setShowWidgets(nextOpen)
    if (typeof window === 'undefined') return

    const widgetPreferenceKey = widgetPreferenceStorageKey(quickLookPreferenceScope)
    localStorage.setItem(`${widgetPreferenceKey}:open`, String(nextOpen))
    localStorage.setItem(`${storageKey}-quickLook`, String(nextOpen))
  }, [forceQuickLookClosed, quickLookPreferenceScope, storageKey])

  // Click outside handler for column selector
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false)
      }
    }
    
    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColumnSelector])

  // Realtime polling
  useEffect(() => {
    if (realtime && onRefresh) {
      pollingRef.current = setInterval(onRefresh, pollingInterval)
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }
  }, [realtime, onRefresh, pollingInterval])

  // Filter and Sort Logic
  const filteredData = useMemo(() => {
    let result = [...data]

    if (isServerPaginated) return data

    // Global search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(row => {
        return displayColumnConfig
          .filter(col => col.visible)
          .some(col => {
            const value = String(getNestedValue(row, col.key) ?? '').toLowerCase()
            return value.includes(query)
          })
      })
    }

    // Column filters
    filters.forEach(filter => {
      result = result.filter(row => {
        const value = getNestedValue(row, filter.key)
        switch (filter.operator) {
          case 'equals':
            return value === filter.value
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
          case 'gt':
            return value > filter.value
          case 'lt':
            return value < filter.value
          case 'between':
            return value >= filter.value[0] && value <= filter.value[1]
          default:
            return true
        }
      })
    })

    // Multi-column sorting
    if (sortConfigs.length > 0) {
      result.sort((a, b) => {
        for (const sort of sortConfigs.sort((x, y) => x.priority - y.priority)) {
          const aVal = getNestedValue(a, sort.key)
          const bVal = getNestedValue(b, sort.key)
          const comparison = compareValues(aVal, bVal)
          if (comparison !== 0) {
            return sort.direction === 'asc' ? comparison : -comparison
          }
        }
        return 0
      })
    }

    return result
  }, [data, searchQuery, filters, sortConfigs, displayColumnConfig, isServerPaginated])

  // Pagination
  const activePage = isServerPaginated ? pagination.page : currentPage
  const activePageSize = isServerPaginated ? clampTablePageSize(pagination.pageSize) : pageSize
  const totalRows = isServerPaginated ? pagination.total : filteredData.length
  const totalPages = Math.max(1, Math.ceil(totalRows / activePageSize))
  const paginatedData = useMemo(() => {
    if (isServerPaginated) return filteredData
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize, isServerPaginated])

  // Screen size detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobileViewport(width < 640)
      if (width < 640) setScreenSize('sm')
      else if (width < 768) setScreenSize('md')
      else if (width < 1024) setScreenSize('lg')
      else setScreenSize('xl')
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const effectiveViewMode = isMobileViewport ? 'card' : viewMode

  // Table width measurement
  useEffect(() => {
    if (tableContainerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setTableWidth(entry.contentRect.width)
        }
      })
      resizeObserver.observe(tableContainerRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [])

  const estimateColumnWidth = useCallback((col: ColumnDef) => {
    if (col.type === 'image') return 56

    const sampleValues = data
      .slice(0, 50)
      .map(row => getNestedValue(row, col.key))
      .filter(value => value !== null && value !== undefined && value !== '')
      .map(value => String(value))

    const averageValueLength = sampleValues.length > 0
      ? sampleValues.reduce((sum, value) => sum + value.length, 0) / sampleValues.length
      : 0

    const typeWidth = col.type === 'date' ? 112 :
                      col.type === 'boolean' ? 76 :
                      col.type === 'number' ? 88 :
                      col.type === 'enum' ? 108 : 96

    const labelWidth = col.label.length * 7 + 30
    const dataWidth = averageValueLength * 7 + 30
    const configuredWidth = col.width || 0
    const naturalWidth = Math.ceil(Math.max(typeWidth, labelWidth, dataWidth))
    const cappedWidth = configuredWidth > 0 ? Math.min(configuredWidth, naturalWidth) : naturalWidth
    const minWidth = col.minWidth || (col.type === 'text' ? 72 : 64)
    const maxWidth = col.maxWidth || (col.key === 'fullname' ? 180 : col.type === 'text' ? 150 : 130)

    return Math.max(minWidth, Math.min(maxWidth, cappedWidth))
  }, [data])

  // Calculate column economy
  const columnEconomy = useMemo(() => {
    const visibleCols = displayColumnConfig.filter(col => col.visible !== false)
    const totalWidth = visibleCols.reduce((sum, col) => {
      return sum + estimateColumnWidth(col)
    }, 0)
    
    const maxTableWidth = screenSize === 'sm' ? 360 : 
                         screenSize === 'md' ? 540 :
                         screenSize === 'lg' ? 768 : 1200
    
    const availableWidth = tableWidth > 0 ? tableWidth : maxTableWidth
    const overflow = totalWidth - availableWidth
    
    // Calculate widths with font size adjustments
    const columnWidths = visibleCols.map(col => {
      const baseWidth = estimateColumnWidth(col)
      const isFixed = col.fixedWidth
      
      if (isFixed) {
        return { ...col, calculatedWidth: baseWidth, fontSize: col.fontSize || 'sm' }
      }
      
      // If overflowing, reduce font size and potentially width
      if (overflow > 0) {
        const ratio = availableWidth / totalWidth
        const adjustedWidth = Math.max(col.type === 'image' ? 52 : col.minWidth || 64, Math.floor(baseWidth * ratio))
        
        // Determine font size based on width
        let fontSize: 'xs' | 'sm' | 'base' = 'sm'
        if (adjustedWidth < 100) fontSize = 'xs'
        else if (adjustedWidth > 200) fontSize = 'base'
        
        return { ...col, calculatedWidth: adjustedWidth, fontSize }
      }
      
      return { ...col, calculatedWidth: baseWidth, fontSize: col.fontSize || 'sm' }
    })
    
    return {
      totalWidth,
      availableWidth,
      overflow,
      columns: columnWidths,
      canAddMore: totalWidth < availableWidth * 1.1 // 10% tolerance
    }
  }, [displayColumnConfig, tableWidth, screenSize, estimateColumnWidth])

  // Visible columns with responsive limits
  const visibleColumns = useMemo(() => {
    const cols = displayColumnConfig.filter(col => col.visible !== false)
    const availableWidth = Math.max(280, columnEconomy.availableWidth)

    if (screenSize === 'sm' || screenSize === 'md') {
      const minColumns = screenSize === 'sm' ? 3 : 4
      const maxColumns = screenSize === 'sm' ? 5 : 6
      const selected: ColumnDef[] = []
      let usedWidth = 0

      for (const col of cols) {
        const ecoCol = columnEconomy.columns.find(c => c.key === col.key)
        const width = ecoCol?.calculatedWidth || estimateColumnWidth(col)
        const canFit = usedWidth + width <= availableWidth

        if (selected.length < minColumns || (canFit && selected.length < maxColumns)) {
          selected.push(col)
          usedWidth += width
        }
      }

      return selected.map(col => {
        const ecoCol = columnEconomy.columns.find(c => c.key === col.key)
        return {
          ...col,
          calculatedWidth: ecoCol?.calculatedWidth,
          fontSize: ecoCol?.fontSize
        }
      })
    }
    
    // Add calculated widths
    return cols.map(col => {
      const ecoCol = columnEconomy.columns.find(c => c.key === col.key)
      return {
        ...col,
        calculatedWidth: ecoCol?.calculatedWidth,
        fontSize: ecoCol?.fontSize
      }
    })
  }, [displayColumnConfig, columnEconomy, screenSize, estimateColumnWidth])

  const visibleTableWidth = useMemo(() => {
    const columnsWidth = visibleColumns.reduce((sum, col) => {
      return sum + (col.calculatedWidth || estimateColumnWidth(col))
    }, 0)
    return columnsWidth
  }, [visibleColumns, estimateColumnWidth])

  // Handlers
  const handleSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value)
      if (isServerPaginated) {
        pagination.onSearchChange?.(value)
        pagination.onPageChange(1)
      } else {
        setCurrentPage(1)
      }
    }, 300)
  }, [isServerPaginated, pagination])

  const handleSort = useCallback((key: string) => {
    setSortConfigs(prev => {
      const existing = prev.find(s => s.key === key)
      let next: SortConfig[]
      if (existing) {
        if (existing.direction === 'asc') {
          next = prev.map(s =>
            s.key === key ? { ...s, direction: 'desc' } : s
          )
        } else {
          const filtered = prev.filter(s => s.key !== key)
          next = filtered.map((s, idx) => ({ ...s, priority: idx + 1 }))
        }
      } else {
        next = [...prev, { key, direction: 'asc', priority: prev.length + 1 }]
      }
      if (isServerPaginated) {
        pagination.onSortChange?.(next)
        pagination.onPageChange(1)
      }
      return next
    })
  }, [isServerPaginated, pagination])

  useEffect(() => {
    if (!isServerPaginated) return
    const filterSignature = JSON.stringify(filters)
    if (filterSignature === serverFilterSignatureRef.current) return
    serverFilterSignatureRef.current = filterSignature
    const serverPagination = serverPaginationRef.current
    serverPagination?.onFilterChange?.(filters)
    serverPagination?.onPageChange(1)
  }, [filters, isServerPaginated])

  const handlePageChange = useCallback((page: number) => {
    const nextPage = Math.min(totalPages, Math.max(1, page))
    if (isServerPaginated) pagination.onPageChange(nextPage)
    else setCurrentPage(nextPage)
  }, [isServerPaginated, pagination, totalPages])

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    const safePageSize = clampTablePageSize(nextPageSize)
    if (isServerPaginated) {
      pagination.onPageSizeChange?.(safePageSize)
      pagination.onPageChange(1)
    } else {
      setPageSize(safePageSize)
      setCurrentPage(1)
    }
  }, [isServerPaginated, pagination])

  const toggleColumn = useCallback((key: string) => {
    setColumnConfig(prev => {
      const col = prev.find(c => c.key === key)
      if (!col) return prev
      if (col.fixed || col.hideable === false) return prev

      return prev.map(c => 
        c.key === key ? { ...c, visible: c.visible === false ? true : false } : c
      )
    })
  }, [])

  const resetColumnsToDefault = useCallback(() => {
    setColumnConfig(mergeColumnConfig(initialColumns))
  }, [initialColumns])

  const toggleQuickLookWidget = useCallback((id: string) => {
    setSelectedQuickLookWidgetIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }, [])

  const resetQuickLookWidgetsToDefault = useCallback(() => {
    setSelectedQuickLookWidgetIds(quickLookWidgetIds)
  }, [quickLookWidgetSignature])

  const reorderColumns = useCallback((dragKey: string, dropKey: string) => {
    setColumnConfig(prev => {
      const visible = prev.filter(c => c.visible !== false)
      const invisible = prev.filter(c => c.visible === false)
      
      const dragIndex = visible.findIndex(c => c.key === dragKey)
      const dropIndex = visible.findIndex(c => c.key === dropKey)
      
      if (dragIndex === -1 || dropIndex === -1) return prev
      
      const [dragged] = visible.splice(dragIndex, 1)
      visible.splice(dropIndex, 0, dragged)
      
      // Update order property
      const reordered = [...visible, ...invisible].map((c, idx) => ({ ...c, order: idx }))
      return reordered
    })
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnKey)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    if (columnKey !== draggedColumn) {
      setDropTarget(columnKey)
    }
  }, [draggedColumn])

  const handleDrop = useCallback((e: React.DragEvent, dropKey: string) => {
    e.preventDefault()
    const dragKey = e.dataTransfer.getData('text/plain') || draggedColumn
    if (dragKey && dragKey !== dropKey) {
      reorderColumns(dragKey, dropKey)
    }
    setDraggedColumn(null)
    setDropTarget(null)
  }, [draggedColumn, reorderColumns])

  const handleDragEnd = useCallback(() => {
    setDraggedColumn(null)
    setDropTarget(null)
  }, [])

  // Helper functions
  function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj)
  }

  function compareValues(a: any, b: any): number {
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1
    if (b === null || b === undefined) return 1
    if (typeof a === 'number' && typeof b === 'number') return a - b
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
    return String(a).localeCompare(String(b))
  }

  // Nationality converter: Country -> Demonym
  function convertToNationality(value: string): string {
    const referenceLabel = getCountryNationalityLabel(value)
    if (referenceLabel !== value && referenceLabel !== '-') return referenceLabel
    if (!value) return '-'
    const upperValue = value.toUpperCase().trim()
    const cleanValue = value.trim()
    
    const nationalityMap: Record<string, string> = {
      // Turkish variations
      'Türkiye': 'Türk',
      'Turkey': 'Türk',
      'TC': 'Türk',
      'T.C.': 'Türk',
      'T.C': 'Türk',
      'TÜRKİYE CUMHURİYETİ': 'Türk',
      'TURKIYE CUMHURIYETI': 'Türk',
      'TURKEY CUMHURIYETI': 'Türk',
      'TÜRKIYE': 'Türk',
      'TURKIYE': 'Türk',
      'Yunanistan': 'Yunan',
      'Greece': 'Yunan',
      'Almanya': 'Alman',
      'Germany': 'Alman',
      'Fransa': 'Fransız',
      'France': 'Fransız',
      'İngiltere': 'İngiliz',
      'United Kingdom': 'İngiliz',
      'İtalya': 'İtalyan',
      'Italy': 'İtalyan',
      'İspanya': 'İspanyol',
      'Spain': 'İspanyol',
      'ABD': 'Amerikalı',
      'USA': 'Amerikalı',
      'Amerika': 'Amerikalı',
      'Rusya': 'Rus',
      'Russia': 'Rus',
      'Çin': 'Çinli',
      'China': 'Çinli',
      'Japonya': 'Japon',
      'Japan': 'Japon',
      'Hollanda': 'Hollandalı',
      'Netherlands': 'Hollandalı',
      'Belçika': 'Belçikalı',
      'Belgium': 'Belçikalı',
      'Avusturya': 'Avusturyalı',
      'Austria': 'Avusturyalı',
      'İsviçre': 'İsviçreli',
      'Switzerland': 'İsviçreli',
      'İsveç': 'İsveçli',
      'Sweden': 'İsveçli',
      'Norveç': 'Norveçli',
      'Norway': 'Norveçli',
      'Danimarka': 'Danimarkalı',
      'Denmark': 'Danimarkalı',
      'Finlandiya': 'Fin',
      'Finland': 'Fin',
      'Polonya': 'Polonyalı',
      'Poland': 'Polonyalı',
      'Ukrayna': 'Ukraynalı',
      'Ukraine': 'Ukraynalı',
      'Bulgaristan': 'Bulgar',
      'Bulgaria': 'Bulgar',
      'Romanya': 'Rumen',
      'Romania': 'Rumen',
      'Sırbistan': 'Sırp',
      'Serbia': 'Sırp',
      'Hırvatistan': 'Hırvat',
      'Croatia': 'Hırvat',
      'Yugoslavya': 'Yugoslav',
      'Yugoslavia': 'Yugoslav',
      'Çekya': 'Çek',
      'Czech Republic': 'Çek',
      'Slovakya': 'Slovak',
      'Slovakia': 'Slovak',
      'Macaristan': 'Macar',
      'Hungary': 'Macar',
      'Portekiz': 'Portekizli',
      'Portugal': 'Portekizli',
      'İrlanda': 'İrlandalı',
      'Ireland': 'İrlandalı',
      'Kanada': 'Kanadalı',
      'Canada': 'Kanadalı',
      'Avustralya': 'Avustralyalı',
      'Australia': 'Avustralyalı',
      'Brezilya': 'Brezilyalı',
      'Brazil': 'Brezilyalı',
      'Arjantin': 'Arjantinli',
      'Argentina': 'Arjantinli',
      'Meksika': 'Meksikalı',
      'Mexico': 'Meksikalı',
      'Mısır': 'Mısırlı',
      'Egypt': 'Mısırlı',
      'Güney Afrika': 'Güney Afrikalı',
      'South Africa': 'Güney Afrikalı',
      'Hindistan': 'Hintli',
      'India': 'Hintli',
      'Pakistan': 'Pakistanlı',
      'Bangladeş': 'Bangladeşli',
      'Bangladesh': 'Bangladeşli',
      'Endonezya': 'Endonezyalı',
      'Indonesia': 'Endonezyalı',
      'Malezya': 'Malezya',
      'Malaysia': 'Malezya',
      'Tayland': 'Taylandlı',
      'Thailand': 'Taylandlı',
      'Vietnam': 'Vietnamlı',
      'Güney Kore': 'Güney Koreli',
      'South Korea': 'Güney Koreli',
      'Kuzey Kore': 'Kuzey Koreli',
      'North Korea': 'Kuzey Koreli',
      'İran': 'İranlı',
      'Iran': 'İranlı',
      'Irak': 'Iraklı',
      'Iraq': 'Iraklı',
      'Suriye': 'Suriyeli',
      'Syria': 'Suriyeli',
      'Suudi Arabistan': 'Suudi Arabistanlı',
      'Saudi Arabia': 'Suudi Arabistanlı',
      'BAE': 'BAE',
      'UAE': 'BAE',
      'İsrail': 'İsrailli',
      'Israel': 'İsrailli',
      'Ürdün': 'Ürdünlü',
      'Jordan': 'Ürdünlü',
      'Lübnan': 'Lübnanlı',
      'Lebanon': 'Lübnanlı',
      'Tunus': 'Tunuslu',
      'Tunisia': 'Tunuslu',
      'Fas': 'Faslı',
      'Morocco': 'Faslı',
      'Cezayir': 'Cezayirli',
      'Algeria': 'Cezayirli',
      'Libya': 'Libyalı',
      'Sudan': 'Sudanlı',
      'Etiyopya': 'Etiyopyalı',
      'Ethiopia': 'Etiyopyalı',
      'Nijerya': 'Nijeryalı',
      'Nigeria': 'Nijeryalı',
      'Kenya': 'Kenyalı',
      'Tanzanya': 'Tanzanyalı',
      'Tanzania': 'Tanzanyalı',
      'Kamerun': 'Kamerunlu',
      'Cameroon': 'Kamerunlu',
      'Uganda': 'Ugandalı',
      'Gana': 'Ganalı',
      'Ghana': 'Ganalı',
      'Mozambik': 'Mozambikli',
      'Mozambique': 'Mozambikli',
      'Zambiya': 'Zambiyalı',
      'Zambia': 'Zambiyalı',
      'Zimbabve': 'Zimbabveli',
      'Zimbabwe': 'Zimbabveli',
      'Botsvana': 'Botsvanalı',
      'Botswana': 'Botsvanalı',
      'Namibya': 'Namibyalı',
      'Namibia': 'Namibyalı',
      'Angola': 'Angolalı',
      'Madagaskar': 'Madagaskarlı',
      'Madagascar': 'Madagaskarlı',
      'Mauritius': 'Mauritiuslu',
      'Seyşeller': 'Seyşelli',
      'Seychelles': 'Seyşelli',
    }
    
    // Try exact match first, then uppercase match
    return nationalityMap[cleanValue] || nationalityMap[upperValue] || nationalityMap[value] || value
  }

  function renderCellValue(col: ColumnDef, value: any, row: T, forceImageType: boolean = false): React.ReactNode {
    // @ts-ignore - dynamic property access on generic type
    const r = row as Record<string, any>

    // For image/avatar type, handle specially (even if custom render exists, prefer type-based render)
    if (col.type === 'image' || col.type === 'avatar' || forceImageType) {
      const imageUrl = value || r?.profileImage || r?.image || r?.photo || r?.avatar || r?.profile_image || r?.photo_url
      const initials = getRowInitials(r)
      const fullName = getRowDisplayName(r)
      const imageFit = col.imageFit || 'cover'
      const imageShape = col.imageShape || 'circle'
      
      return (
        <div className={cn(
          'h-11 w-11 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm',
          imageShape === 'rounded' ? 'rounded-lg' : 'rounded-full',
          imageFit === 'contain'
            ? 'border border-gray-200 bg-transparent dark:border-gray-700'
            : 'border-2 border-white bg-gradient-to-br from-blue-100 to-blue-200'
        )}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={imageUrl} 
              alt={fullName}
              className={cn('w-full h-full', imageFit === 'contain' ? 'object-contain p-1' : 'object-cover')}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const fallback = target.parentElement?.querySelector('.fallback-avatar')
                if (fallback) fallback.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={cn(
            "fallback-avatar w-full h-full items-center justify-center bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-300",
            initials && "text-blue-600 dark:text-blue-300 text-sm font-bold",
            imageUrl ? "hidden" : "flex"
          )}>
            {initials || (imageShape === 'circle' ? <User size={16} /> : <ImageIcon size={16} />)}
          </div>
        </div>
      )
    }
    
    // Use custom render if provided
    if (col.render) return col.render(value, row)
    
    // Handle nationality column
    if (col.key === 'country') {
      return <span className="inline-block text-gray-900 dark:text-gray-100">{getCountryLabel(value)}</span>
    }

    if (col.key === 'nationality' || col.key === 'nationality' || col.key === 'vatandaslik') {
      return <span className="inline-block text-gray-900 dark:text-gray-100">{convertToNationality(value)}</span>
    }
    
    // Handle gender column
    if (col.key === 'gender' || col.key === 'gender') {
      const genderMap: Record<string, string> = {
        'male': 'Erkek',
        'kadın': 'Kadın',
        'female': 'Kadın',

        'E': 'Erkek',
        'K': 'Kadın',
        'M': 'Erkek',
        'F': 'Kadın',
      }
      const gender = genderMap[String(value).toLowerCase()] || (value ? String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase() : '-')
      return gender
    }
    
    if (col.type === 'boolean') {
      return value ? (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
          Evet
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
          Hayır
        </span>
      )
    }
    
    if (col.type === 'enum') {
      return <span className="inline-block text-gray-500 dark:text-gray-400">{value ?? '-'}</span>
    }

    return value ?? '-'
  }

  function getCellTitle(value: any): string | undefined {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'object') return undefined
    const text = String(value)
    return text.length > 0 ? text : undefined
  }

  function isLeftAlignedColumn(col: ColumnDef): boolean {
    return col.type === 'text' || col.type === 'enum' || col.type === 'badge'
  }

  const dashboardWidgetByQuickLookId = new Map(dashboardWidgets.map(widget => [quickLookWidgetId('dashboard', widget.id), widget]))
  const summaryWidgetByQuickLookId = new Map(widgets.map(widget => [quickLookWidgetId('summary', widget.key), widget]))
  const selectedDashboardWidgets = selectedQuickLookWidgetIds
    .map(id => dashboardWidgetByQuickLookId.get(id))
    .filter((widget): widget is AnyDashboardWidgetConfig => Boolean(widget))
  const selectedSummaryWidgets = selectedQuickLookWidgetIds
    .map(id => summaryWidgetByQuickLookId.get(id))
    .filter((widget): widget is WidgetDef => Boolean(widget))
  const quickLookPickerItems: WidgetPickerItem[] = [
    ...dashboardWidgets.map(widget => ({
      id: quickLookWidgetId('dashboard', widget.id),
      title: widget.title,
      description: widget.description || widget.dataSource,
      moduleKey: widget.module,
      moduleLabel: widget.module,
      pageKey: storageKey,
      pageLabel: title || storageKey,
    })),
    ...widgets.map(widget => ({
      id: quickLookWidgetId('summary', widget.key),
      title: widget.label,
      moduleKey: 'summary',
      moduleLabel: 'Sayfa Ozeti',
      pageKey: storageKey,
      pageLabel: title || storageKey,
    })),
  ]
  const hasQuickLookContent = widgets.length > 0 || dashboardWidgets.length > 0
  const hasSelectedQuickLookContent = selectedSummaryWidgets.length > 0 || selectedDashboardWidgets.length > 0
  const quickLookPanel = (showWidgets && hasQuickLookContent) ? (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <Eye size={16} />
          Hızlı Bakış
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowWidgetPicker(true)}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
            title="Widget ekle veya cikar"
          >
            <Plus size={14} />
            Ekle
          </button>
          <button
            onClick={() => {
              setQuickLookOpen(false)
              setHoveredRow(null)
            }}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800"
            title="Kapat"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {selectedDashboardWidgets.length > 0 && (
          <DashboardGrid
            widgets={selectedDashboardWidgets}
            onFilter={onDashboardFilter}
            unauthorizedMode="hide"
            compact
            draggable
            onOrderChange={(ids) => {
              const nextDashboardIds = ids.map(id => quickLookWidgetId('dashboard', id))
              setSelectedQuickLookWidgetIds(prev => [
                ...nextDashboardIds,
                ...prev.filter(id => !nextDashboardIds.includes(id)),
              ])
            }}
          />
        )}

        {selectedSummaryWidgets.length > 0 && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {selectedSummaryWidgets.map(widget => (
              <div
                key={widget.key}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', quickLookWidgetId('summary', widget.key))
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const draggedId = event.dataTransfer.getData('text/plain')
                  setSelectedQuickLookWidgetIds(prev => moveWidgetId(prev, draggedId, quickLookWidgetId('summary', widget.key)))
                }}
                className="cursor-move rounded-lg bg-white p-2 shadow-sm dark:bg-gray-800"
              >
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{widget.label}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {(() => {
                    const targetRow = hoveredRow && hoveredRow !== 'widget-preview'
                      ? data.find(r => r.id === hoveredRow)
                      : data[0]
                    return targetRow ? widget.render(targetRow) : '-'
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasSelectedQuickLookContent && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
            Tercihlerde seçili hızlı bakış widget&apos;ı yok.
          </div>
        )}
      </div>
    </div>
  ) : null

  return (
    <div data-tour-id="smart-list" className="w-full space-y-4">
      <WidgetPickerModal
        open={showWidgetPicker}
        title="Widget Ekle"
        description="Bu sayfanin widget repository'sinden hizli bakis overlay'inde gorunecek widget'lari secin."
        items={quickLookPickerItems}
        selectedWidgetIds={selectedQuickLookWidgetIds}
        enableFilters={false}
        onClose={() => setShowWidgetPicker(false)}
        onSave={(ids) => setSelectedQuickLookWidgetIds(parseWidgetPreferenceIds(JSON.stringify(ids), [], quickLookWidgetIds))}
      />
      {quickLookPanel}

      {/* Header Toolbar */}
      <div className="flex flex-col gap-3 bg-white p-3 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-visible">
        {/* Left: Title and Search */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
          {title && <h2 className="hidden sm:block text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">{title}</h2>}
          
          <div className="relative flex-1 min-w-0 max-w-none sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Ara..."
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!!resolvedStatusFilterOptions.length && (
            <StatusDotFilter
              options={resolvedStatusFilterOptions}
              activeValues={resolvedActiveStatusFilters}
              lockedValues={lockedStatusFilters}
              ariaLabel="Kayıt durumu filtresi"
              onChange={handleStatusFiltersChange}
            />
          )}
        </div>

        {/* Right: View Toggle, Filter, Settings */}
        <div
          data-tour-id="view-preferences"
          className="flex w-full flex-wrap items-center justify-end gap-1 overflow-visible scrollbar-hide sm:w-auto sm:flex-shrink-0 sm:gap-2"
        >
          {/* Screen Size Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Monitor size={14} className="text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              {screenSize}
            </span>
            {columnEconomy.overflow > 0 && (
              <span title="Sütun genişliği aşıldı">
                <AlertTriangle size={14} className="text-orange-500" />
              </span>
            )}
          </div>

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              title="Yenile"
            >
              <RefreshCw size={18} />
            </button>
          )}

          {/* Quick Look Toggle */}
          <button
            onClick={() => setQuickLookOpen(!showWidgets)}
            className={cn(
              "p-2 rounded-lg transition-colors relative",
              showWidgets 
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            )}
            title="Hızlı Bakış"
          >
            <Eye size={18} />
            {hasQuickLookContent && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {selectedDashboardWidgets.length + selectedSummaryWidgets.length}
              </span>
            )}
          </button>

          {/* Filter Panel Toggle */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={cn(
              "p-2 rounded-lg transition-colors flex items-center gap-2",
              showFilterPanel || filters.length > 0
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            )}
          >
            <Filter size={18} />
            {filters.length > 0 && <span className="text-sm font-medium">{filters.length}</span>}
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1" title={isMobileViewport ? 'Mobil ekranda kart gorunumu kullanilir.' : undefined}>
            <button
              onClick={() => setViewMode('list')}
              disabled={isMobileViewport}
              className={cn(
                "p-2 rounded-md transition-colors",
                effectiveViewMode === 'list'
                  ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
                isMobileViewport && "cursor-not-allowed opacity-40"
              )}
              title="Liste görünümü"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                "p-2 rounded-md transition-colors",
                effectiveViewMode === 'card'
                  ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
              title="Kart görünümü"
            >
              <Grid3X3 size={18} />
            </button>
          </div>
          {isMobileViewport && (
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
              Mobil kart
            </span>
          )}

          {/* Export */}
          <button
            onClick={() => exportToCSV(filteredData, visibleColumns)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title="CSV olarak dışa aktar"
          >
            <FileDown size={18} />
          </button>

          {/* Column Selector */}
          <div className="relative" ref={columnSelectorRef}>
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showColumnSelector
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              )}
              title="Sütun ayarları"
            >
              <Settings size={18} />
            </button>

            {showColumnSelector && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">Sütunlar</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {displayColumnConfig.filter(c => c.visible !== false).length} / {displayColumnConfig.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={resetColumnsToDefault}
                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Sütunları Varsayılana Döndür
                  </button>
                  {hasQuickLookContent && (
                    <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200">Widget Tercihleri</h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {selectedQuickLookWidgetIds.length} / {quickLookWidgetIds.length} seçili
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={resetQuickLookWidgetsToDefault}
                          className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Varsayılan
                        </button>
                      </div>
                      <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                        {dashboardWidgets.map(widget => {
                          const id = quickLookWidgetId('dashboard', widget.id)
                          return (
                            <label key={id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                              <input
                                type="checkbox"
                                checked={selectedQuickLookWidgetIds.includes(id)}
                                onChange={() => toggleQuickLookWidget(id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">{widget.title}</span>
                            </label>
                          )
                        })}
                        {widgets.map(widget => {
                          const id = quickLookWidgetId('summary', widget.key)
                          return (
                            <label key={id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                              <input
                                type="checkbox"
                                checked={selectedQuickLookWidgetIds.includes(id)}
                                onChange={() => toggleQuickLookWidget(id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">{widget.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {/* Width Quota Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Genişlik Kotası</span>
                      <span className={cn(
                        columnEconomy.overflow > 0 ? "text-orange-500" : "text-green-600 dark:text-green-400"
                      )}>
                        {columnEconomy.totalWidth}px / {columnEconomy.availableWidth}px
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          columnEconomy.overflow > 0 ? "bg-orange-500" : "bg-blue-500"
                        )}
                        style={{ width: `${Math.min(100, (columnEconomy.totalWidth / columnEconomy.availableWidth) * 100)}%` }}
                      />
                    </div>
                    {columnEconomy.overflow > 0 && (
                      <p className="text-xs text-orange-500 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Ekrana sığmayan sütunlar var. Font boyutu küçültüldü.
                      </p>
                    )}
                    {!columnEconomy.canAddMore && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Kotanın üzerinde sütun seçilemez.
                      </p>
                    )}
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-3">
                  {/* Column selector is backed by all columns; visibility only controls rendering. */}
                  {(() => {
                    const grouped = displayColumnConfig.reduce((acc, col) => {
                      const category = col.category || 'Genel'
                      if (!acc[category]) acc[category] = []
                      acc[category].push(col)
                      return acc
                    }, {} as Record<string, ColumnDef[]>)
                    
                    const categoryStyles: Record<string, string> = {
                      'Kişisel': 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-400',
                      'İş': 'bg-green-50 dark:bg-green-900/20 border-l-2 border-green-400',
                      'Eğitim': 'bg-purple-50 dark:bg-purple-900/20 border-l-2 border-purple-400',
                      'İletişim': 'bg-orange-50 dark:bg-orange-900/20 border-l-2 border-orange-400',
                      'Adres': 'bg-gray-50 dark:bg-gray-700/30 border-l-2 border-gray-400',
                      'Genel': 'bg-gray-50 dark:bg-gray-700/30',
                    }
                    
                    return Object.entries(grouped).map(([category, cols]) => (
                      <div key={category} className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-1 uppercase tracking-wide">
                          {category}
                        </p>
                        <div className="space-y-1">
                          {cols.map(col => (
                            <div
                              key={col.key}
                              draggable
                              onDragStart={(e) => handleDragStart(e, col.key)}
                              onDragOver={(e) => handleDragOver(e, col.key)}
                              onDrop={(e) => handleDrop(e, col.key)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg cursor-move transition-all",
                                categoryStyles[category] || categoryStyles['Genel'],
                                dropTarget === col.key && "bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300",
                                draggedColumn === col.key && "opacity-50"
                              )}
                            >
                              <GripVertical size={16} className="text-gray-400" />
                              <input
                                type="checkbox"
                                checked={col.visible !== false}
                                disabled={col.fixed || col.hideable === false}
                                onChange={() => toggleColumn(col.key)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                {col.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {col.width || 150}px
                              </span>
                              {col.required && (
                                <span className="text-xs text-red-500">zorunlu</span>
                              )}
                              {(col.fixed || col.hideable === false) && (
                                <span className="text-xs text-blue-500">sabit</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column Filter Panel */}
      {showFilterPanel && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[82dvh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-gray-50 p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:static sm:max-h-none sm:rounded-lg sm:bg-gray-50 sm:shadow-none dark:sm:bg-gray-800/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Filter size={16} />
              Sütun Filtreleri
            </h3>
            <button
              onClick={() => setFilters([])}
              className="min-h-11 rounded-lg px-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 sm:min-h-0 dark:hover:bg-red-950/30"
            >
              Tümünü Temizle
            </button>
            <button
              type="button"
              onClick={() => setShowFilterPanel(false)}
              className="min-h-11 rounded-lg px-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 sm:hidden"
            >
              Kapat
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleColumns.filter(c => c.filterable !== false).map(col => (
              <ColumnFilterInput
                key={col.key}
                column={col}
                value={filters.find(f => f.key === col.key)?.value}
                onChange={(value, operator) => {
                  if (value === null || value === '' || value === undefined) {
                    setFilters(prev => prev.filter(f => f.key !== col.key))
                  } else {
                    setFilters(prev => {
                      const existing = prev.find(f => f.key === col.key)
                      if (existing) {
                        return prev.map(f => f.key === col.key ? { ...f, value, operator } : f)
                      }
                      return [...prev, { key: col.key, type: col.type, value, operator }]
                    })
                  }
                  setCurrentPage(1)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        effectiveViewMode === 'card' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map(index => (
              <div key={index} className="min-h-36 animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 rounded bg-gray-100 dark:bg-gray-700" />
                  <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-700" />
                  <div className="h-3 w-3/5 rounded bg-gray-100 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {emptyText}
        </div>
      ) : effectiveViewMode === 'list' ? (
        /* List View */
        <div 
          ref={tableContainerRef}
          className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <table className="w-full table-fixed text-sm" style={{ minWidth: visibleTableWidth }}>
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {visibleColumns.map(col => {
                  const sort = sortConfigs.find(s => s.key === col.key)
                  const showHeaderLabel = !col.hideHeaderLabel
                  return (
                    <th
                      key={col.key}
                      draggable
                      onDragStart={(e) => handleDragStart(e, col.key)}
                      onDragOver={(e) => handleDragOver(e, col.key)}
                      onDrop={(e) => handleDrop(e, col.key)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "px-2 sm:px-3 py-3 text-center font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0",
                        col.sortable !== false && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none",
                        dropTarget === col.key && "bg-blue-50 dark:bg-blue-900/30",
                        draggedColumn === col.key && "opacity-50"
                      )}
                      style={{ 
                        width: col.calculatedWidth || col.width || 150,
                        minWidth: col.type === 'image' ? 52 : col.minWidth || 64
                      }}
                      title={col.label}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      <div className="flex items-center justify-center gap-1 sm:gap-2 w-full min-w-0">
                        <GripVertical size={14} className="hidden sm:block text-gray-400 opacity-0 hover:opacity-100 transition-opacity flex-shrink-0" />
                        {showHeaderLabel ? (
                          <span className={cn(
                            "whitespace-nowrap font-medium truncate",
                            col.fontSize === 'xs' ? 'text-xs' : 'text-sm'
                          )}>{col.label}</span>
                        ) : (
                          <span className="sr-only">{col.label}</span>
                        )}
                        {sort && (
                          <span className="flex items-center gap-1 text-blue-600">
                            {sort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span className="text-[10px] font-bold">{sort.priority}</span>
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.map((row, rowIndex) => {
                const firstRowClickColumnKey = visibleColumns[0]?.key

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "group/row transition-colors duration-150",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(row)}
                    title={onRowClick ? 'Detayi ac' : undefined}
                    data-tour-id={rowIndex === 0 ? 'smart-list-first-row' : undefined}
                  >
                    {visibleColumns.map(col => {
                      return (
                        <td
                          key={col.key}
                          title={getCellTitle(getNestedValue(row, col.key))}
                          className={cn(
                            "px-2 py-2 text-gray-900 dark:text-gray-100 dark:[&_*]:!text-gray-100 border-r border-gray-100 dark:border-gray-800 last:border-r-0 whitespace-nowrap overflow-hidden transition-[background-color,box-shadow] duration-150",
                            onRowClick && "group-hover/row:bg-sky-50/80 group-hover/row:shadow-[inset_0_1px_0_rgba(14,165,233,0.16),inset_0_-1px_0_rgba(14,165,233,0.16)] dark:group-hover/row:bg-sky-950/25",
                            onRowClick && col.key === firstRowClickColumnKey && "relative before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:origin-center before:scale-y-50 before:rounded-full before:bg-sky-500 before:opacity-0 before:transition-all before:duration-150 group-hover/row:before:scale-y-100 group-hover/row:before:opacity-100",
                            isLeftAlignedColumn(col) ? "text-left" : "text-center",
                            col.fontSize === 'xs' ? 'text-xs' : 'text-sm'
                          )}
                          style={{
                            width: col.calculatedWidth || estimateColumnWidth(col),
                            minWidth: col.type === 'image' ? 52 : col.minWidth || 64,
                            maxWidth: col.maxWidth || (col.type === 'image' ? 56 : 180)
                          }}
                        >
                      <div className={cn(
                        "flex h-full min-w-0 truncate text-gray-900 dark:text-gray-100",
                        isLeftAlignedColumn(col) ? "items-center justify-start" : "items-center justify-center",
                        col.type !== 'image' && col.type !== 'boolean' && "dark:[&_*]:!text-gray-100"
                      )}>
                        {col.type === 'enum' ? (
                          <span data-enum-cell className="inline-flex min-w-0 max-w-full items-center truncate text-gray-500 dark:text-gray-400">
                            {renderCellValue(col, getNestedValue(row, col.key), row)}
                          </span>
                        ) : renderCellValue(col, getNestedValue(row, col.key), row)}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedData.map(row => {
            // @ts-ignore
            const r = row as Record<string, any>
            const imageCol = displayColumnConfig.find(c => c.type === 'image' || c.type === 'avatar')
            const imageValue = imageCol ? getNestedValue(row, imageCol.key) : null
            const imageUrl = imageValue || r?.profileImage || r?.image || r?.photo || r?.avatar || r?.profile_image || r?.photo_url
            const imageFit = imageCol?.imageFit || 'contain'
            const initials = getRowInitials(r)
            const fullName = getRowDisplayName(r)
            
            const cardFieldPool = displayColumnConfig.filter(c => c.type !== 'image' && c.type !== 'avatar')
            const requiredCols = cardFieldPool.filter(c => c.required)
            const visibleCardCols = cardFieldPool.filter(c => c.visible)
            const displayCols = (requiredCols.length > 0 ? requiredCols : visibleCardCols.length > 0 ? visibleCardCols : cardFieldPool).slice(0, isMobileViewport ? 5 : 3)
            
            return (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onKeyDown={(event) => {
                  if (!onRowClick) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onRowClick(row)
                  }
                }}
                className="relative min-h-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex min-h-0 flex-col sm:min-h-44 sm:flex-row">
                  <div className={cn(
                    'relative flex h-28 w-full shrink-0 self-stretch overflow-hidden sm:h-auto sm:w-36 xl:w-40',
                    imageFit === 'contain'
                      ? 'bg-transparent'
                      : 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30'
                  )}>
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={imageUrl} 
                        alt={fullName}
                        className={cn('h-full w-full', imageFit === 'contain' ? 'object-contain p-2' : 'object-cover')}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const fallback = target.parentElement?.querySelector('.card-fallback')
                          if (fallback) fallback.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={cn("card-fallback h-full w-full flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-950/40 dark:to-indigo-950/40", imageUrl ? "hidden" : "flex")}>
                      {initials ? (
                        <span className="text-3xl font-bold text-blue-600 dark:text-blue-300">{initials}</span>
                      ) : (
                        <ImageIcon size={30} className="text-blue-500 dark:text-blue-300" />
                      )}
                      <span className="text-xs text-gray-500 mt-1 px-2 text-center truncate max-w-full">{fullName}</span>
                    </div>
                  </div>
                  
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-4">
                    {displayCols.length > 0 ? displayCols.map(col => (
                      <div key={col.key} className="min-w-0">
                        <span className="block truncate text-[11px] font-medium uppercase text-gray-500 dark:text-gray-400">{col.label}</span>
                        <div className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-white" title={getCellTitle(getNestedValue(row, col.key))}>
                          {col.type === 'enum' ? (
                            <span data-enum-cell className="inline-flex min-w-0 max-w-full items-center truncate text-gray-500 dark:text-gray-400">
                              {renderCellValue(col, getNestedValue(row, col.key), row)}
                            </span>
                          ) : renderCellValue(col, getNestedValue(row, col.key), row)}
                        </div>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Zorunlu alan tanımlanmamış
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Toplam {totalRows} kayıt
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sayfa başı:</span>
            <select
              value={activePageSize}
              onChange={(e) => {
                handlePageSizeChange(Number(e.target.value))
              }}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              {resolvedPageSizeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={activePage === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            İlk
          </button>
          <button
            onClick={() => handlePageChange(activePage - 1)}
            disabled={activePage === 1}
            className="p-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
          
          <span className="text-sm font-medium text-gray-900 dark:text-white px-4">
            {activePage} / {totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(activePage + 1)}
            disabled={activePage === totalPages}
            className="p-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={activePage === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Son
          </button>
        </div>
      </div>
    </div>
  )
}

function serializeColumnPreferences(columns: ColumnDef[]): StoredColumnPreference[] {
  return columns.map(column => ({
    key: column.key,
    visible: column.visible,
    order: column.order,
  }))
}

// Column Filter Input Component
function ColumnFilterInput({ 
  column, 
  value, 
  onChange 
}: { 
  column: ColumnDef
  value: any
  onChange: (value: any, operator: FilterConfig['operator']) => void 
}) {
  if (column.type === 'enum' && column.enumOptions) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{column.label}</label>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null, 'equals')}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        >
          <option value="">Tümü</option>
          {column.enumOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  if (column.type === 'date') {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{column.label}</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={value?.[0] || ''}
            onChange={(e) => {
              const newValue = [e.target.value, value?.[1] || '']
              onChange(newValue, 'between')
            }}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            placeholder="Başlangıç"
          />
          <input
            type="date"
            value={value?.[1] || ''}
            onChange={(e) => {
              const newValue = [value?.[0] || '', e.target.value]
              onChange(newValue, 'between')
            }}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            placeholder="Bitiş"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{column.label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null, 'contains')}
        placeholder="Ara..."
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
      />
    </div>
  )
}

// CSV Export Helper
function exportToCSV<T extends { id: string }>(
  data: T[],
  columns: ColumnDef[]
) {
  if (data.length === 0) {
    alert('Dışa aktarılacak veri yok')
    return
  }

  // Get nested value helper
  const getValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj)
  }

  // CSV headers
  const headers = columns.map(col => col.label).join(',')
  
  // CSV rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = getValue(row, col.key)
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = value === null || value === undefined ? '' : String(value)
      const escaped = stringValue.replace(/"/g, '""')
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
        ? `"${escaped}"` 
        : escaped
    }).join(',')
  })

  // Combine
  const csv = [headers, ...rows].join('\n')
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `export_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
