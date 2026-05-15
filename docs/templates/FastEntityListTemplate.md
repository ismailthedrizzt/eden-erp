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
      staleTime: options.staleTime ?? 300_000,
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
  const hasDataRef = useRef(false)

  const fetchEntities = useCallback(async (force = false) => {
    setLoading(previous => force || !hasDataRef.current ? true : previous)
    setError(null)
    try {
      if (force) entityService.invalidateList()
      const result = await entityService.list(query, { useCache: !force })
      setData(result.data ?? [])
      hasDataRef.current = true
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

`onRowClick` verilen listelerde satir tıklanabilirliği SmartDataTable'in merkezi hover vurgusuyla anlatilir. Satir acma davranisini ayrica her sayfada stillendirme; `actions`/`İşlemler` kolonu kendi buton/menu tiklamasini kullanir ve row click'i tetiklemez.

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

## Progressive Form Loading

Form acilisi hicbir zaman master/ref verilerini beklemez. Standart akış `snapshot -> detail -> master -> references` seklindedir:

1. `snapshot`: satira tiklaninca liste satiri hemen forma basilir.
2. `detail`: sayfanin bagli oldugu ana tablo detayi arka planda gelir.
3. `master`: master kisi/kurum kaydi varsa formu zenginlestirir, form acilisini bloke etmez.
4. `references`: dropdown ve baska modullerden gelen secenekler alan bazinda tamamlanir.

```ts
const [detailLoading, setDetailLoading] = useState(false)
const [referencesLoading, setReferencesLoading] = useState(false)
const [referencesReady, setReferencesReady] = useState(false)

const formLoadStages = createProgressiveFormLoadStages({
  mode: formMode,
  hasSnapshot: pageState !== 'create' && !!selectedEntity,
  detailLoading,
  detailError: !!formError,
  detailReady: pageState !== 'create' && !!selectedEntity && !detailLoading,
  hasMaster: !!(selectedEntity?.person_id || selectedEntity?.organization_id || selectedEntity?.master_record_id),
  referencesLoading,
  referencesReady,
})
```

```tsx
<EntityForm
  mode={formMode}
  data={selectedEntity}
  loadStages={formLoadStages}
  ...
/>
```

Edit modu ana detay gelmeden acilmamalidir; referans gerektiren alanlar referanslar gelene kadar disabled/loading davranisi gostermelidir.

## Form Automation Badge

Bir alan veri girilince veya bir buton/lookup calisinca formdaki baska alanlari dolduruyorsa kullanici bunu alan etiketinden anlamalidir. Standart gosterim `AutomationBadge`'dir; `EntityForm` icinde alan `automation` metadata'si ile isaretlenir. `type: 'iban'` alanlari varsayilan olarak otomasyon badge'i alir.

```ts
const fields: FormField[] = [
  {
    name: 'iban',
    label: 'IBAN',
    type: 'iban',
    automation: {
      targetFields: ['bank_name', 'branch_name', 'branch_code', 'account_no'],
      title: 'IBAN girilince banka ve hesap alanlari otomatik doldurulur.',
      workingLabel: 'Cozuluyor',
    },
  },
]
```

Custom formlarda ayni ana badge yapisi korunur: `idle -> working -> done/no_data`. Master kimlik eslestirme gibi butonla baslayan otomasyonlarda badge butona basildiktan sonra `working` durumuna gecer.

## Access, Module Dependency and Workflow

Yeni sayfalar `useEntityAccess` ile modul, yetki ve workflow hazirligini tek yerden alir. Kucuk firmalarda tek rol/legacy allow-all ile ayni yapi calisir; orta ve buyuk firmalarda rol bazli yetki ve onay akislari devreye girer.

```ts
const access = useEntityAccess({
  module: 'employees',
  moduleLabel: 'Insan Kaynaklari',
  resource: 'employees',
  permissions: {
    view: 'employees.view',
    insert: 'employees.insert',
    edit: 'employees.edit',
    approve: 'employees.approve',
    passivate: 'employees.passivate',
  },
  dependencies: [
    { module: 'organization', label: 'Teskilat ve Kadro', reason: 'Birim ve kadro alanlari icin gereklidir.' },
  ],
  workflow: {
    enabled: true,
    workflowKey: 'ik.personel',
    approvalPermission: 'employees.approve',
    interceptActions: ['create', 'update', 'passivate'],
  },
})
```

```tsx
<EntityForm
  access={access}
  moduleDependencies={access.missingDependencies}
  canCreate={access.canInsert}
  canEdit={access.canEdit}
  loadStages={formLoadStages}
/>
```

Bagimli modul kapaliysa alan crash etmez; standart olarak `Bu alandan yararlanabilmek icin X modulunu etkinlestirmeniz gerekir` mesaji gosterilir.

## API List Route

```ts
import { listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'

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
    .select(ENTITY_LIST_SELECT)
    .order(sort, { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  if (!listQuery.includePassive) query = query.eq('is_deleted', false)
  if (listQuery.search) query = query.or(`name.ilike.%${listQuery.search}%,code.ilike.%${listQuery.search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = data || []
  return NextResponse.json({ data: rows, meta: listMetaFromRows(listQuery, rows.length) })
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
- Liste endpointleri `parseListQuery`, `listRange`, `listMetaFromRows`, count'suz narrow `select(ENTITY_LIST_SELECT)` ve `range(from, to)` kullanmali.
- `SmartDataTable` ana ERP listelerinde `pagination={{ mode: 'server', ... }}` ile kullanilmali; client tarafina tum veri basilmamali.
- Hook'lar elde veri varken otomatik yenilemede tabloyu tekrar komple `loading=true` durumuna dusurmemeli; force refresh haricinde stale veri ekranda kalmali.
- Sayfa row click icinde once state/mode set edilmesi, sonra detay await edilmesi.
- `?t=${Date.now()}` ve `cache: 'no-store'` kullanilmamasi.
- Liste endpointinde agir kolon, base64 medya, belge/history JSON ve `select('*')` kullanilmamasi.
- Avatar/foto/logo yuklemeleri kayda yazilmadan once client tarafinda kucultulmeli; form image upload akisi `resizeImageFileAsDataUrl` benzeri helper kullanmali, ham `readFileAsDataUrl(file)` sonucunu avatar alanina yazmamali.
- Migration indeksinin bulunmasi.
