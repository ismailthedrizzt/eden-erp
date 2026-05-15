# Fast Entity List Template

Bu sablon, ana ERP liste ekranlarinda liste acilisini ve satir tiklama deneyimini hizli tutmak icin kullanilir. Hedef: liste 0.2 sn civarinda gorunur, satir tiklaninca form 0.5 sn icinde acilir.

Ana kural: liste endpointi sadece SmartDataTable'da gorunen satir alanlarini ve sadece istenen backend sayfasini dondurur. Form, referans ve agir JSON/media/history alanlari liste payload'ina girmez.

## Service

```ts
import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'
import type { ListQuery, ListResponse } from '@/lib/api/listEndpoint'

export interface EntityListRow {
  id: string
  name: string
  code: string | null
  status_label: string
  is_deleted: boolean
  updated_at: string | null
}

export type EntityListQuery = Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction' | 'includePassive'>

export const entityService = {
  list(query: EntityListQuery, options: ApiClientOptions = {}) {
    return apiClient.get<ListResponse<EntityListRow>>('/api/module/entities', {
      ...options,
      skipAuth: options.skipAuth ?? true,
      staleTime: options.staleTime ?? 120_000,
      query: {
        page: String(query.page),
        pageSize: String(query.pageSize),
        search: query.search,
        sort: query.sort,
        direction: query.direction,
        include_passive: query.includePassive ? 'true' : undefined,
        ...options.query,
      },
    })
  },

  detail(id: string) {
    return apiClient.get<{ data: Entity }>(`/api/module/entities/${id}`, {
      skipAuth: true,
      staleTime: 120_000,
    })
  },

  invalidateList() {
    apiClient.invalidate('/api/module/entities')
  },
}
```

## Hook

```ts
export function useEntities() {
  const [query, setQuery] = useState<EntityListQuery>({ page: 1, pageSize: 50, sort: 'name', direction: 'asc' })
  const [data, setData] = useState<EntityListRow[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntities = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      if (force) entityService.invalidateList()
      const result = await entityService.list(query, { useCache: !force })
      setData(result.data ?? [])
      setMeta(result.meta)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchEntities()
  }, [fetchEntities])

  return { data, meta, query, setQuery, loading, error, yenile: () => fetchEntities(true) }
}
```

## SmartDataTable

```tsx
<SmartDataTable<EntityListRow>
  columns={columns}
  data={data}
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
      sort: sorts[0]?.key || 'name',
      direction: sorts[0]?.direction || 'asc',
    })),
  }}
  onRefresh={yenile}
  onRowClick={handleRowClick}
/>
```

## Page Row Click

```ts
const handleRowClick = async (row: EntityListRow) => {
  setFormError(null)
  setSelectedEntity(row as unknown as Entity)
  setPageState('view')

  try {
    const result = await entityService.detail(row.id)
    if (!result.data) throw new Error('Detay yuklenemedi')
    setSelectedEntity(result.data)
  } catch (err: any) {
    setFormError(err.message || 'Detay yuklenemedi')
  }
}
```

## API List Route

```ts
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'

const ENTITY_LIST_SELECT = 'id,name,code,status,is_deleted,updated_at'
const allowedSorts = new Set(['name', 'code', 'updated_at'])

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'name', direction: 'asc' })
  const { from, to } = listRange(listQuery)
  const sort = allowedSorts.has(listQuery.sort || '') ? listQuery.sort! : 'name'

  let query = supabase
    .from('entities')
    .select(ENTITY_LIST_SELECT, { count: 'exact' })
    .order(sort, { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  if (!listQuery.includePassive) query = query.eq('is_deleted', false)
  if (listQuery.search) query = query.or(`name.ilike.%${listQuery.search}%,code.ilike.%${listQuery.search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [], meta: listMeta(listQuery, count ?? 0) })
}
```

## Migration

```sql
create index if not exists idx_entities_active_name_fast
on public.entities (is_deleted, name, id);
```

## Guard

Ana liste ekrani kritikse `scripts/check-performance-contracts.js` icindeki kontrata ekle. En azindan sunlari denetle:

- Liste ve detay servislerinde `skipAuth` ve `staleTime`.
- Liste servisleri `ListResponse<T>` donmeli; `page`, `pageSize`, `search`, `sort`, `direction`, `include_passive` query parametrelerini backend'e tasimali.
- Liste endpointleri `parseListQuery`, `listRange`, `listMeta`, `select(..., { count: 'exact' })` ve `range(from, to)` kullanmali.
- `SmartDataTable` ana ERP listelerinde `pagination={{ mode: 'server', ... }}` ile kullanilmali; client tarafina tum veri basilmamali.
- Sayfa row click icinde once state/mode set edilmesi, sonra detay await edilmesi.
- `?t=${Date.now()}` ve `cache: 'no-store'` kullanilmamasi.
- Liste endpointinde agir kolon ve `select('*')` kullanilmamasi.
- Migration indeksinin bulunmasi.
