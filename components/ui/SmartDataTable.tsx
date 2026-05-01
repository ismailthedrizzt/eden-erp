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
  MoreHorizontal,
  Filter,
  X,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  AlertTriangle,
  RefreshCw,
  FileDown,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Column Definition Types
type ColumnType = 'text' | 'number' | 'date' | 'enum' | 'boolean' | 'image'

export interface ColumnDef {
  key: string
  label: string
  type: ColumnType
  required?: boolean
  sortable?: boolean
  filterable?: boolean
  visible?: boolean
  width?: number // Width in pixels
  minWidth?: number
  maxWidth?: number
  fixedWidth?: boolean // If true, width is fixed and won't shrink
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' // Responsive font size
  enumOptions?: string[] // For enum type
  moduleDependency?: string // Module that must be active
  permission?: string // Permission required to view
  render?: (value: any, row: any) => React.ReactNode
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

interface SmartDataTableProps<T extends { id: string }> {
  data: T[]
  columns: ColumnDef[]
  title?: string
  onRowClick?: (row: T) => void
  onRefresh?: () => void
  loading?: boolean
  emptyText?: string
  storageKey?: string // For persisting user preferences
  widgets?: WidgetDef[]
  defaultView?: 'list' | 'card'
  defaultPageSize?: number
  pageSizeOptions?: number[]
  realtime?: boolean
  pollingInterval?: number
}

export interface WidgetDef<T = any> {
  key: string
  label: string
  render: (row: T) => React.ReactNode
  moduleDependency?: string
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
  defaultView = 'list',
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  realtime = false,
  pollingInterval = 30000
}: SmartDataTableProps<T>) {
  // User Preferences State
  const [viewMode, setViewMode] = useState<'list' | 'card'>(() => {
    if (typeof window === 'undefined') return defaultView
    const saved = localStorage.getItem(`${storageKey}-view`)
    return (saved as 'list' | 'card') || defaultView
  })
  
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === 'undefined') return defaultPageSize
    const saved = localStorage.getItem(`${storageKey}-pageSize`)
    return saved ? parseInt(saved, 10) : defaultPageSize
  })

  const [columnConfig, setColumnConfig] = useState<ColumnDef[]>(() => {
    if (typeof window === 'undefined') return initialColumns
    const saved = localStorage.getItem(`${storageKey}-columns`)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return initialColumns
      }
    }
    // Default: show only required columns
    return initialColumns.map(col => ({
      ...col,
      visible: col.required !== false
    }))
  })

  // Active Data State
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([])
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [showWidgets, setShowWidgets] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // Screen Size Detection
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [tableWidth, setTableWidth] = useState(0)

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const columnSelectorRef = useRef<HTMLDivElement>(null)

  // Persist preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${storageKey}-view`, viewMode)
      localStorage.setItem(`${storageKey}-pageSize`, pageSize.toString())
      localStorage.setItem(`${storageKey}-columns`, JSON.stringify(columnConfig))
    }
  }, [viewMode, pageSize, columnConfig, storageKey])

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

    // Global search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(row => {
        return columnConfig
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
  }, [data, searchQuery, filters, sortConfigs, columnConfig])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  // Screen size detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) setScreenSize('sm')
      else if (width < 768) setScreenSize('md')
      else if (width < 1024) setScreenSize('lg')
      else setScreenSize('xl')
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  // Calculate column economy
  const columnEconomy = useMemo(() => {
    const visibleCols = columnConfig.filter(col => col.visible !== false)
    const totalWidth = visibleCols.reduce((sum, col) => {
      return sum + (col.width || 150)
    }, 0)
    
    const maxTableWidth = screenSize === 'sm' ? 360 : 
                         screenSize === 'md' ? 540 :
                         screenSize === 'lg' ? 768 : 1200
    
    const availableWidth = tableWidth > 0 ? tableWidth : maxTableWidth
    const overflow = totalWidth - availableWidth
    
    // Calculate widths with font size adjustments
    const columnWidths = visibleCols.map(col => {
      const baseWidth = col.width || 150
      const isFixed = col.fixedWidth
      
      if (isFixed) {
        return { ...col, calculatedWidth: baseWidth, fontSize: col.fontSize || 'sm' }
      }
      
      // If overflowing, reduce font size and potentially width
      if (overflow > 0) {
        const ratio = availableWidth / totalWidth
        const adjustedWidth = Math.max(col.minWidth || 80, Math.floor(baseWidth * ratio))
        
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
  }, [columnConfig, tableWidth, screenSize])

  // Visible columns with responsive limits
  const visibleColumns = useMemo(() => {
    let cols = columnConfig.filter(col => col.visible !== false)
    
    // On small screens, limit to first 3-4 columns
    if (screenSize === 'sm') {
      cols = cols.slice(0, 3)
    } else if (screenSize === 'md') {
      cols = cols.slice(0, 4)
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
  }, [columnConfig, columnEconomy, screenSize])

  // Handlers
  const handleSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value)
      setCurrentPage(1)
    }, 300)
  }, [])

  const handleSort = useCallback((key: string) => {
    setSortConfigs(prev => {
      const existing = prev.find(s => s.key === key)
      if (existing) {
        if (existing.direction === 'asc') {
          // Switch to desc
          return prev.map(s => 
            s.key === key ? { ...s, direction: 'desc' } : s
          )
        } else {
          // Remove sort
          const filtered = prev.filter(s => s.key !== key)
          // Update priorities
          return filtered.map((s, idx) => ({ ...s, priority: idx + 1 }))
        }
      }
      // Add new sort
      return [...prev, { key, direction: 'asc', priority: prev.length + 1 }]
    })
  }, [])

  const toggleColumn = useCallback((key: string) => {
    setColumnConfig(prev => {
      const col = prev.find(c => c.key === key)
      if (!col) return prev
      
      // Check if trying to show a column when at capacity
      if (col.visible === false) {
        const visibleCols = prev.filter(c => c.visible !== false)
        const newTotalWidth = visibleCols.reduce((sum, c) => sum + (c.width || 150), 0) + (col.width || 150)
        const maxWidth = screenSize === 'sm' ? 360 : screenSize === 'md' ? 540 : screenSize === 'lg' ? 768 : 1200
        
        if (newTotalWidth > maxWidth * 1.2) {
          // Show warning - quota exceeded
          return prev
        }
      }
      
      return prev.map(c => 
        c.key === key ? { ...c, visible: c.visible === false ? true : false } : c
      )
    })
  }, [screenSize])

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
    
    // For image type, handle specially (even if custom render exists, prefer type-based render)
    if (col.type === 'image' || forceImageType) {
      const imageUrl = value || r?.profileImage || r?.image || r?.photo || r?.avatar || r?.profile_image || r?.foto || r?.fotograf_url
      const initials = (r?.firstName?.[0] || r?.name?.[0] || r?.ad?.[0] || r?.soyad?.[0] || '?').toUpperCase()
      const fullName = r?.firstName || r?.name || r?.ad || r?.fullname || 'İsimsiz'
      
      // Debug log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Image render:', { key: col.key, value, imageUrl, availableKeys: Object.keys(r).filter(k => k.includes('foto') || k.includes('image') || k.includes('photo')) })
      }
      
      return (
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={imageUrl} 
              alt={fullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const fallback = target.parentElement?.querySelector('.fallback-avatar')
                if (fallback) fallback.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={cn("fallback-avatar w-full h-full flex items-center justify-center text-blue-600 text-sm font-bold", imageUrl ? "hidden" : "flex")}>
            {initials}
          </div>
        </div>
      )
    }
    
    // Use custom render if provided
    if (col.render) return col.render(value, row)
    
    // Handle nationality column
    if (col.key === 'nationality' || col.key === 'country' || col.key === 'uyruk' || col.key === 'vatandaslik') {
      const nationality = convertToNationality(value)
      return <span className="capitalize inline-block">{nationality}</span>
    }
    
    // Handle gender column
    if (col.key === 'gender' || col.key === 'cinsiyet') {
      const genderMap: Record<string, string> = {
        'erkek': 'Erkek',
        'kadın': 'Kadın',
        'kadin': 'Kadın',
        'male': 'Erkek',
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
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Evet
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Hayır
        </span>
      )
    }
    
    return value ?? '-'
  }

  return (
    <div className="w-full space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Left: Title and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
          {title && <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>}
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Ara..."
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right: View Toggle, Filter, Settings */}
        <div className="flex items-center gap-2">
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

          {/* AI Assistant */}
          <button
            onClick={() => alert('AI Asistan yakında geliyor!')}
            className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 transition-colors"
            title="AI Asistan"
          >
            <Sparkles size={18} />
          </button>

          {/* Widget Toggle - Fixed to toggle overlay properly */}
          <button
            onClick={() => setShowWidgets(!showWidgets)}
            onMouseEnter={() => !showWidgets && setHoveredRow('widget-preview')}
            className={cn(
              "p-2 rounded-lg transition-colors relative",
              showWidgets 
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            )}
            title="Widget görünümü"
          >
            <Eye size={18} />
            {widgets.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {widgets.length}
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
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'list' 
                  ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
              title="Liste görünümü"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'card' 
                  ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
              title="Kart görünümü"
            >
              <Grid3X3 size={18} />
            </button>
          </div>

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
                      {columnConfig.filter(c => c.visible !== false).length} / {columnConfig.length}
                    </span>
                  </div>
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
                  {/* Group visible columns by category */}
                  {(() => {
                    const visibleCols = columnConfig.filter(c => c.visible !== false)
                    const grouped = visibleCols.reduce((acc, col) => {
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
                                checked={true}
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
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                  
                  {/* Hidden columns section - also grouped */}
                  {columnConfig.filter(c => c.visible === false).length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 mb-2 uppercase tracking-wide">
                        Gizli Sütunlar
                      </p>
                      {(() => {
                        const hiddenCols = columnConfig.filter(c => c.visible === false)
                        const grouped = hiddenCols.reduce((acc, col) => {
                          const category = col.category || 'Genel'
                          if (!acc[category]) acc[category] = []
                          acc[category].push(col)
                          return acc
                        }, {} as Record<string, ColumnDef[]>)
                        
                        return Object.entries(grouped).map(([category, cols]) => (
                          <div key={`hidden-${category}`} className="mb-2">
                            <p className="text-xs text-gray-400 dark:text-gray-500 px-2 mb-1">{category}</p>
                            <div className="space-y-1">
                              {cols.map(col => (
                                <div
                                  key={col.key}
                                  className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg opacity-50 hover:opacity-80 transition-opacity",
                                    !columnEconomy.canAddMore && "cursor-not-allowed"
                                  )}
                                >
                                  <div className="w-4" />
                                  <input
                                    type="checkbox"
                                    checked={false}
                                    disabled={!columnEconomy.canAddMore}
                                    onChange={() => toggleColumn(col.key)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                  />
                                  <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                                    {col.label}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {col.width || 150}px
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Overlay - Shows when toggled or when hovering row with widgets */}
      {(showWidgets || (hoveredRow && hoveredRow !== 'widget-preview' && widgets.length > 0)) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Eye size={16} />
              Hızlı Bilgi
            </h3>
            <button 
              onClick={() => {
                setShowWidgets(false)
                setHoveredRow(null)
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {widgets.length > 0 ? widgets.map(widget => (
              <div key={widget.key} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{widget.label}</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {(() => {
                    const targetRow = hoveredRow && hoveredRow !== 'widget-preview' 
                      ? data.find(r => r.id === hoveredRow)
                      : data[0]
                    return targetRow ? widget.render(targetRow) : '-'
                  })()}
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                Henüz widget eklenmemiş. Widget tanımlamak için SmartDataTable bileşenine widgets prop&apos;u ekleyin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Filter Panel */}
      {showFilterPanel && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Filter size={16} />
              Sütun Filtreleri
            </h3>
            <button
              onClick={() => setFilters([])}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Tümünü Temizle
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {emptyText}
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div 
          ref={tableContainerRef}
          className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <table className="w-full text-sm" style={{ minWidth: columnEconomy.totalWidth }}>
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {visibleColumns.map(col => {
                  const sort = sortConfigs.find(s => s.key === col.key)
                  return (
                    <th
                      key={col.key}
                      draggable
                      onDragStart={(e) => handleDragStart(e, col.key)}
                      onDragOver={(e) => handleDragOver(e, col.key)}
                      onDrop={(e) => handleDrop(e, col.key)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0",
                        col.sortable !== false && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none",
                        dropTarget === col.key && "bg-blue-50 dark:bg-blue-900/30",
                        draggedColumn === col.key && "opacity-50"
                      )}
                      style={{ 
                        width: col.calculatedWidth || col.width || 150,
                        minWidth: col.minWidth || 80
                      }}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      <div className="flex items-center justify-center gap-2 w-full">
                        <GripVertical size={14} className="text-gray-400 opacity-0 hover:opacity-100 transition-opacity flex-shrink-0" />
                        <span className="whitespace-nowrap text-sm font-medium">{col.label}</span>
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
                <th className="px-4 py-3 w-10 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.map(row => (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {visibleColumns.map(col => (
                    <td 
                      key={col.key} 
                      className={cn(
                        "px-4 py-3 text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-800 last:border-r-0 text-center pointer-events-none",
                        col.calculatedWidth && col.calculatedWidth < 100 && "text-xs",
                        col.calculatedWidth && col.calculatedWidth >= 100 && col.calculatedWidth < 150 && "text-sm",
                        (!col.calculatedWidth || col.calculatedWidth >= 150) && "text-base"
                      )}
                      style={{ 
                        width: col.calculatedWidth || col.width || 150,
                        maxWidth: col.calculatedWidth || col.width || 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        {renderCellValue(col, getNestedValue(row, col.key), row)}
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <button 
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Action menu logic here
                      }}
                    >
                      <MoreHorizontal size={16} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card View - New Design: Large image left, required fields right */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedData.map(row => {
            // @ts-ignore
            const r = row as Record<string, any>
            const imageCol = visibleColumns.find(c => c.type === 'image')
            const imageValue = imageCol ? getNestedValue(row, imageCol.key) : null
            const imageUrl = imageValue || r?.profileImage || r?.image || r?.photo || r?.avatar || r?.profile_image || r?.foto || r?.fotograf_url
            const firstInitial = (r?.firstName?.[0] || r?.name?.[0] || r?.ad?.[0] || '?').toUpperCase()
            const lastInitial = (r?.soyad?.[0] || r?.lastName?.[0] || r?.surname?.[0] || '').toUpperCase()
            const initials = firstInitial + lastInitial || '?'
            const fullName = r?.fullname || `${r?.ad || r?.firstName || r?.name || ''} ${r?.soyad || r?.lastName || r?.surname || ''}`.trim() || 'İsimsiz'
            
            // Get required columns only, fallback to first 2 non-image columns
            const requiredCols = visibleColumns.filter(c => c.required && c.type !== 'image')
            const displayCols = requiredCols.length > 0 ? requiredCols : visibleColumns.filter(c => c.type !== 'image').slice(0, 2)
            
            return (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row)}
                onMouseEnter={() => setHoveredRow(row.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={cn(
                  "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer",
                  "hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200"
                )}
              >
                <div className="flex">
                  {/* Large Image Area - 4x bigger (160x160) */}
                  <div className="w-40 h-40 flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center relative overflow-hidden">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={imageUrl} 
                        alt={fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const fallback = target.parentElement?.querySelector('.card-fallback')
                          if (fallback) fallback.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={cn("card-fallback w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200", imageUrl ? "hidden" : "flex")}>
                      <span className="text-4xl font-bold text-blue-600 dark:text-blue-500">{initials}</span>
                      <span className="text-xs text-gray-500 mt-1 px-2 text-center truncate max-w-full">{fullName}</span>
                    </div>
                  </div>
                  
                  {/* Required Fields Area */}
                  <div className="flex-1 p-4 flex flex-col justify-center">
                    {displayCols.length > 0 ? displayCols.map(col => (
                      <div key={col.key} className="mb-3 last:mb-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{col.label}</span>
                        <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {renderCellValue(col, getNestedValue(row, col.key), row)}
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
            Toplam {filteredData.length} kayıt
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sayfa başı:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            İlk
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
          
          <span className="text-sm font-medium text-gray-900 dark:text-white px-4">
            {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Son
          </button>
        </div>
      </div>
    </div>
  )
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
