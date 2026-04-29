'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePersonel } from '@/hooks/usePersonel'
import { Users, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageBanner } from '@/components/ui/PageBanner'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterColumn, setFilterColumn] = useState<keyof T | null>(null)
  const [filterValue, setFilterValue] = useState('')

  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    if (searchTerm) {
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (filterColumn && filterValue) {
      result = result.filter(row =>
        String(row[filterColumn]).toLowerCase().includes(filterValue.toLowerCase())
      )
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        
        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        
        const comparison = String(aVal).localeCompare(String(bVal))
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, searchTerm, filterColumn, filterValue, sortColumn, sortDirection])

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortableColumns = columns.filter(col => col.sortable)
  const filterableColumns = columns.filter(col => col.filterable)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {filterableColumns.length > 0 && (
          <select
            value={String(filterColumn || '')}
            onChange={(e) => {
              setFilterColumn((e.target.value || null) as keyof T | null)
              setFilterValue('')
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Filtrele</option>
            {filterableColumns.map(col => (
              <option key={String(col.key)} value={String(col.key)}>
                {col.label}
              </option>
            ))}
          </select>
        )}
        
        {filterColumn && (
          <input
            type="text"
            placeholder="Filtre değeri..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && (
                        <button
                          onClick={() => handleSort(column.key)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                          {sortColumn === column.key ? (
                            sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                          ) : (
                            <Filter size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-200 dark:border-gray-800">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {column.render ? column.render(row[column.key], row) : String(row[column.key] || '-')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function CalisanlarPage() {
  const router = useRouter()
  const { data: personel, loading, yenile } = usePersonel()

  const columns: Column<any>[] = [
    {
      key: 'photo',
      header: 'Resim',
      width: '80px',
      align: 'center',
      sortable: false,
      render: (row) => (
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {row.photo ? (
            <img src={row.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-gray-500">-</span>
          )}
        </div>
      )
    },
    {
      key: 'fullname',
      header: 'Adı Soyadı',
      sortable: true,
      render: (row) => `${row.ad || ''} ${row.soyad || ''}`
    },
    {
      key: 'dogum_tarihi',
      header: 'Doğum Tarihi',
      sortable: true,
      render: (row) => row.dogum_tarihi ? new Date(row.dogum_tarihi).toLocaleDateString('tr-TR') : '-'
    },
    {
      key: 'birim',
      header: 'Birim',
      sortable: true,
      render: (row) => row.birim?.ad || row.unit || '-'
    },
    {
      key: 'position',
      header: 'Görevi',
      sortable: true,
      render: (row) => row.kadro?.unvan || row.position || '-'
    }
  ]

  return (
    <>
      <PageBanner
        title="Çalışanlar"
        icon={<Users size={24} />}
        onAddClick={() => router.push('/app/ik/personel/ekle')}
        addButtonText="+Ekle"
        showAddIcon={false}
      />

      <div className="mt-6">
        <DataTable
          data={personel}
          columns={columns}
          loading={loading}
          searchPlaceholder="Çalışan ara..."
          enableCardView={true}
        />
      </div>
    </>
  )
}
