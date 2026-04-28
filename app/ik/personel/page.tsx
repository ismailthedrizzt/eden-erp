'use client'

import { useState, useMemo } from 'react'
import { usePersonel } from '@/hooks/usePersonel'
import { Users, Plus, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// Banner component - tüm sayfalarda kullanılacak
function PageBanner({ title, icon, addHref }: { title: string; icon: React.ReactNode; addHref?: string }) {
  return (
    <div className="bg-gradient-to-r from-eden-blue to-eden-blue-dk rounded-xl p-6 mb-6 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <h1 className="text-2xl font-bold font-display">{title}</h1>
        </div>
        {addHref && (
          <Link
            href={addHref}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Ekle
          </Link>
        )}
      </div>
    </div>
  )
}

// DataTable component - tüm sayfalarda kullanılacak
interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchPlaceholder?: string
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchPlaceholder = "Ara..."
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<Record<string, string>>({})

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(search.toLowerCase())
      )
    )

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(row =>
          String(row[key]).toLowerCase().includes(value.toLowerCase())
        )
      }
    })

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        const direction = sortDirection === 'asc' ? 1 : -1

        if (aVal < bVal) return -1 * direction
        if (aVal > bVal) return 1 * direction
        return 0
      })
    }

    return filtered
  }, [data, search, sortColumn, sortDirection, filters])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleFilter = (column: string, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }))
  }

  return (
    <div className="bg-white dark:bg-eden-navy-2 rounded-xl border border-gray-200 dark:border-eden-navy overflow-hidden">
      {/* Search and Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-eden-navy">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-eden-navy text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-eden-blue/20 focus:border-eden-blue"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-eden-navy">
            <Filter size={16} />
            Filtrele
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-eden-navy">
            <tr>
              {columns.map(column => (
                <th key={String(column.key)} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <button
                        onClick={() => handleSort(String(column.key))}
                        className="flex flex-col gap-0.5"
                      >
                        <ChevronUp size={10} className={cn(
                          'text-gray-300',
                          sortColumn === column.key && sortDirection === 'asc' && 'text-eden-blue'
                        )} />
                        <ChevronDown size={10} className={cn(
                          'text-gray-300 -mt-1',
                          sortColumn === column.key && sortDirection === 'desc' && 'text-eden-blue'
                        )} />
                      </button>
                    )}
                    {column.filterable && (
                      <input
                        type="text"
                        placeholder="Filtre..."
                        value={filters[String(column.key)] || ''}
                        onChange={(e) => handleFilter(String(column.key), e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded
                                   bg-white dark:bg-eden-navy text-gray-900 dark:text-white
                                   focus:outline-none focus:ring-1 focus:ring-eden-blue/20"
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-eden-navy">
            {loading ? (
              Array.from({length: 5}).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 dark:bg-eden-navy rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  Veri bulunamadı
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-eden-navy/50">
                  {columns.map(column => (
                    <td key={String(column.key)} className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                      {column.render ? column.render(row[column.key], row) : String(row[column.key] || '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function CalisanlarPage() {
  const { data: personel, loading } = usePersonel()

  const columns: Column<any>[] = [
    {
      key: 'ad',
      label: 'Ad',
      sortable: true,
      filterable: true,
      render: (value, row) => `${value} ${row.soyad}`
    },
    {
      key: 'birim',
      label: 'Birim',
      sortable: true,
      filterable: true,
      render: (value) => value?.ad || '-'
    },
    {
      key: 'kadronorm_kadrolar',
      label: 'Pozisyon',
      sortable: true,
      filterable: true,
      render: (value) => value?.unvan || '-'
    },
    {
      key: 'cep_telefonu',
      label: 'Telefon',
      sortable: false,
      filterable: true
    },
    {
      key: 'email',
      label: 'E-posta',
      sortable: false,
      filterable: true
    },
    {
      key: 'calisma_durumu',
      label: 'Durum',
      sortable: true,
      filterable: true,
      render: (value) => {
        const statusMap = {
          gorevde: { label: 'Görevde', color: 'bg-green-100 text-green-800' },
          izinde: { label: 'İzinde', color: 'bg-yellow-100 text-yellow-800' },
          ayrilmis: { label: 'Ayrılmış', color: 'bg-red-100 text-red-800' },
          askida: { label: 'Askıda', color: 'bg-gray-100 text-gray-800' }
        }
        const status = statusMap[value as keyof typeof statusMap] || { label: value, color: 'bg-gray-100 text-gray-800' }
        return (
          <span className={cn('px-2 py-1 text-xs font-medium rounded-full', status.color)}>
            {status.label}
          </span>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      <PageBanner
        title="Çalışanlar"
        icon={<Users size={20} />}
        addHref="/app/ik/personel-ekle"
      />

      <DataTable
        data={personel}
        columns={columns}
        loading={loading}
        searchPlaceholder="Çalışan ara..."
      />
    </div>
  )
}