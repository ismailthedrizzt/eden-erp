# Fast Entity List Template

Bu sablon, ana ERP liste ekranlarinda liste acilisini ve satir tiklama deneyimini hizli tutmak icin kullanilir. Hedef: liste 0.2 sn civarinda gorunur, satir tiklaninca form 0.5 sn icinde acilir.

## Service

```ts
import { apiClient, ApiClientOptions } from '@/lib/api/apiClient'

export const entityService = {
  list(filters: EntityFilters = {}, options: ApiClientOptions = {}) {
    return apiClient.get<{ data: Entity[] }>('/api/module/entities', {
      ...options,
      skipAuth: options.skipAuth ?? true,
      staleTime: options.staleTime ?? 120_000,
      query: {
        search: filters.search,
        include_passive: filters.includePassive ? 'true' : undefined,
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
export function useEntities(filters: EntityFilters = {}) {
  const [data, setData] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntities = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      if (force) entityService.invalidateList()
      const result = await entityService.list(filters, { useCache: !force })
      setData(result.data ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchEntities()
  }, [fetchEntities])

  return { data, loading, error, yenile: () => fetchEntities(true) }
}
```

## Page Row Click

```ts
const tableData = useMemo(() => (entities || []).map(entity => ({
  ...entity,
  status_label: entity.is_deleted ? 'Pasif' : 'Aktif',
})), [entities])

const handleRowClick = async (row: EntityTableRow) => {
  setFormError(null)
  setSelectedEntity(row as Entity)
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
export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const includePassive = searchParams.get('include_passive') === 'true'

  let query = supabase
    .from('entities')
    .select('id,name,code,is_deleted,updated_at,created_at')
    .order('name', { ascending: true })

  if (!includePassive) query = query.eq('is_deleted', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
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
- Sayfa row click icinde once state/mode set edilmesi, sonra detay await edilmesi.
- `?t=${Date.now()}` ve `cache: 'no-store'` kullanilmamasi.
- Liste endpointinde agir kolon ve `select('*')` kullanilmamasi.
- Migration indeksinin bulunmasi.
