export type ListSortDirection = 'asc' | 'desc'

export interface ListQuery {
  page: number
  pageSize: number
  search?: string
  sort?: string
  direction?: ListSortDirection
  includePassive?: boolean
}

export interface ListMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ListResponse<T> {
  data: T[]
  meta: ListMeta
  warning?: string
}

export function parseListQuery(searchParams: URLSearchParams, defaults: Partial<ListQuery> = {}): ListQuery {
  const page = parsePositiveInt(searchParams.get('page'), defaults.page ?? 1)
  const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), defaults.pageSize ?? 50), 100)
  const direction = searchParams.get('direction') === 'desc' ? 'desc' : 'asc'

  return {
    page,
    pageSize,
    search: searchParams.get('search')?.trim() || defaults.search,
    sort: searchParams.get('sort') || defaults.sort,
    direction,
    includePassive: searchParams.get('include_passive') === 'true' || defaults.includePassive === true,
  }
}

export function listRange(query: Pick<ListQuery, 'page' | 'pageSize'>) {
  const from = (query.page - 1) * query.pageSize
  return { from, to: from + query.pageSize - 1 }
}

export function listMeta(query: Pick<ListQuery, 'page' | 'pageSize'>, total: number): ListMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = value ? Number.parseInt(value, 10) : fallback
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
