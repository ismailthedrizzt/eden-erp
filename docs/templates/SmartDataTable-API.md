# SmartDataTable Component API

**Current as of May 2024**

## Props Reference

```typescript
interface SmartDataTableProps<T extends { id: string }> {
  /** Data array - MUST have 'id' field */
  data: T[]
  
  /** Column definitions */
  columns: ColumnDef[]
  
  /** Optional table title */
  title?: string
  
  /** Row click handler - typically opens detail view */
  onRowClick?: (row: T) => void
  
  /** Refresh button handler */
  onRefresh?: () => void
  
  /** Loading state */
  loading?: boolean
  
  /** Empty state text */
  emptyText?: string
  
  /** LocalStorage key for persisting preferences */
  storageKey?: string
  
  /** Custom widgets to display */
  widgets?: WidgetDef[]
  
  /** Default view mode: 'list' or 'card' */
  defaultView?: 'list' | 'card'
  
  /** Default page size */
  defaultPageSize?: number
  
  /** Available page size options */
  pageSizeOptions?: number[]

  /**
   * Server-side pagination for ERP list endpoints.
   * In server mode, data must contain only the current backend page.
   */
  pagination?: {
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
  
  /** Enable realtime updates */
  realtime?: boolean
  
  /** Polling interval in ms (if realtime=true) */
  pollingInterval?: number
}
```

## ColumnDef Interface

```typescript
export interface ColumnDef {
  key: string                    // Data key
  label: string                  // Display header
  type: 'text' | 'number' | 'date' | 'enum' | 'boolean' | 'image'
  required?: boolean
  sortable?: boolean
  filterable?: boolean
  visible?: boolean              // Default visibility
  width?: number                 // Width in pixels
  minWidth?: number
  maxWidth?: number
  fixedWidth?: boolean
  fontSize?: 'xs' | 'sm' | 'base' | 'lg'
  enumOptions?: string[]         // For enum type
  moduleDependency?: string      // Required module
  permission?: string            // Required permission
  render?: (value: any, row: any) => React.ReactNode
  order?: number                 // Display order
  category?: string              // For grouping (e.g., 'Kişisel', 'İş')
}
```

## Usage Examples

### ⚠️ UI Rule: No title when PageBanner is present
```tsx
// ❌ WRONG - Duplicate title
<PageBanner title="Çalışanlar" ... />
<SmartDataTable title="Personel Listesi" ... />  // ❌ Don't do this!

// ✅ CORRECT - PageBanner provides the title
<PageBanner title="Çalışanlar" ... />
<SmartDataTable ... />  // ✅ No title prop
```

### Basic Usage
```tsx
<SmartDataTable
  data={records}
  columns={columns}
  loading={loading}
  onRowClick={(row) => {
    setSelectedRecord(row)
    setPageState('view')
  }}
/>
```

### With All Features
```tsx
<SmartDataTable
  data={records}
  columns={columns}
  title="Personel Listesi"
  loading={loading}
  emptyText="Kayıt bulunamadı"
  onRowClick={handleRowClick}
  onRefresh={fetchRecords}
  storageKey="personel-table-v1"
  defaultView="list"
  defaultPageSize={25}
  pageSizeOptions={[10, 25, 50, 100]}
/>
```

### Server-Paginated ERP List

Ana ERP listelerinde tercih edilen yapi budur. `data` tum tabloyu degil, backend'in dondurdugu mevcut sayfayi tasir.

```tsx
<SmartDataTable
  data={rows}
  columns={columns}
  loading={loading}
  defaultPageSize={query.pageSize}
  pagination={{
    mode: 'server',
    page: meta.page,
    pageSize: meta.pageSize,
    total: meta.total,
    onPageChange: page => setQuery(prev => ({ ...prev, page })),
    onPageSizeChange: pageSize => setQuery(prev => ({ ...prev, page: 1, pageSize })),
    onSearchChange: search => setQuery(prev => ({ ...prev, page: 1, search })),
    onSortChange: sorts => setQuery(prev => ({
      ...prev,
      page: 1,
      sort: sorts[0]?.key,
      direction: sorts[0]?.direction,
    })),
  }}
/>
```

## Common Mistakes

### ❌ WRONG: These props DO NOT EXIST
```tsx
<SmartDataTable
  entityName="Personel"           // ❌ Doesn't exist!
  groupByCategory                  // ❌ Doesn't exist!
  showExport                       // ❌ Doesn't exist!
  columnSelector                   // ❌ Doesn't exist!
  views={{                         // ❌ Doesn't exist!
    default: { name: 'Varsayılan', columns: [...] },
    iletisim: { name: 'İletişim', columns: [...] }
  }}
  defaultView="default"            // ❌ Use 'list' or 'card'
/>
```

### ✅ CORRECT
```tsx
<SmartDataTable
  data={records}
  columns={columns}
  loading={loading}
  onRowClick={handleRowClick}
  defaultView="list"               // ✅ 'list' or 'card'
  defaultPageSize={25}
/>
```

## Current Features (via UI, not props)

These features are **built-in** and accessible via the table UI:

- ✅ Column visibility toggle (column selector icon)
- ✅ View mode toggle (list/card)
- ✅ Search/filter
- ✅ Sort (click headers)
- ✅ Pagination
- ✅ Export (CSV) - via action menu
- ✅ Column resize
- ✅ Column reorder (drag-drop)

No additional props needed.

## Migration from Old API

| Old Prop | New Approach |
|----------|--------------|
| `entityName` | Remove - not used |
| `groupByCategory` | Remove - use `category` in ColumnDef |
| `showExport` | Remove - export is always available in menu |
| `columnSelector` | Remove - visibility toggle always available |
| `views` | Remove - not supported, use column visibility |
| `defaultView="default"` | Change to `defaultView="list"` |

---

**Source**: `@/components/ui/SmartDataTable.tsx`
