'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { List, Grid, Search, Filter, ChevronUp, ChevronDown, X, Settings } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  filterable?: boolean
  filterType?: 'text' | 'select'
  filterOptions?: { value: string; label: string }[]
  render: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyText?: string
  onRowClick?: (row: T) => void
  searchable?: boolean
  searchPlaceholder?: string
  enableCardView?: boolean
  defaultView?: 'list' | 'card'
}

export default function DataTable<T extends { id: string }>({
  columns, data, loading, emptyText = 'Kayıt bulunamadı', onRowClick,
  searchable = true, searchPlaceholder = 'Ara...', enableCardView = true, defaultView = 'list'
}: DataTableProps<T>) {
  const [view, setView] = useState<'list' | 'card'>(defaultView)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc'; priority: number }[]>([])
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(columns.map(c => c.key)))

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    // Apply global search
    if (searchQuery) {
      result = result.filter(row =>
        columns.some(col => {
          const value = col.render(row)
          return String(value).toLowerCase().includes(searchQuery.toLowerCase())
        })
      )
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(row => {
          const col = columns.find(c => c.key === key)
          if (!col) return true
          const renderValue = col.render(row)
          return String(renderValue).toLowerCase().includes(value.toLowerCase())
        })
      }
    })

    // Apply multi-sort
    sortConfig.forEach(({ key, direction }) => {
      result.sort((a, b) => {
        const col = columns.find(c => c.key === key)
        if (!col) return 0
        const aVal = col.render(a)
        const bVal = col.render(b)
        const comparison = String(aVal).localeCompare(String(bVal))
        return direction === 'asc' ? comparison : -comparison
      })
    })

    return result
  }, [data, searchQuery, columnFilters, sortConfig, columns])

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      const existing = prev.find(s => s.key === key)
      if (existing) {
        // Toggle direction
        const newConfig = prev.map(s =>
          s.key === key ? { ...s, direction: (s.direction === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc' } : s
        )
        return newConfig
      } else {
        // Add new sort with priority
        return [...prev, { key, direction: 'asc' as const, priority: prev.length + 1 }]
      }
    })
  }

  const clearSort = () => setSortConfig([])

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const visibleColumnsList = columns.filter(c => visibleColumns.has(c.key))

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {searchable && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {sortConfig.length > 0 && (
            <button
              onClick={clearSort}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X size={14} />
              Sıralamayı Temizle
            </button>
          )}

          <button
            onClick={() => setShowColumnManager(!showColumnManager)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title="Sütun Yönetimi"
          >
            <Settings size={18} />
          </button>

          {enableCardView && (
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('list')}
                className={cn(
                  'p-2',
                  view === 'list' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setView('card')}
                className={cn(
                  'p-2',
                  view === 'card' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <Grid size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Column Manager */}
      {showColumnManager && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sütun Yönetimi</h3>
          <div className="flex flex-wrap gap-2">
            {columns.map(col => (
              <label key={col.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={visibleColumns.has(col.key)}
                  onChange={() => toggleColumn(col.key)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                {col.header}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {visibleColumnsList.map(col => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && (
                        <button
                          onClick={() => handleSort(col.key)}
                          className="flex items-center gap-1"
                        >
                          {sortConfig.find(s => s.key === col.key) ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-blue-600">
                                {sortConfig.find(s => s.key === col.key)?.priority}
                              </span>
                              {sortConfig.find(s => s.key === col.key)?.direction === 'asc' ? (
                                <ChevronUp size={14} className="text-blue-600" />
                              ) : (
                                <ChevronDown size={14} className="text-blue-600" />
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <ChevronUp size={10} className="text-gray-400" />
                              <ChevronDown size={10} className="text-gray-400" />
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {visibleColumnsList.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnsList.length} className="text-center py-10 text-gray-400 text-sm">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map(row => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {visibleColumnsList.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-sm text-gray-900 dark:text-white',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center'
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Card View */}
      {view === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3" />
              </div>
            ))
          ) : filteredAndSortedData.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-400 text-sm">
              {emptyText}
            </div>
          ) : (
            filteredAndSortedData.map(row => (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer'
                )}
              >
                {visibleColumnsList.map(col => (
                  <div key={col.key} className="mb-2 last:mb-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{col.header}</div>
                    <div className="text-sm text-gray-900 dark:text-white">{col.render(row)}</div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
