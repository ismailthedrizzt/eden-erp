import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'
import { getCountryLabel, normalizeCountryId } from '@/lib/reference/country-nationalities'
import type {
  GeoPoint,
  GeographicReachDataMode,
  GeographicReachMode,
  GeographicTradeReachRequest,
  GeographicTradeReachResponse,
} from './geographicTradeReach.service'

type SupabaseClient = ReturnType<typeof createServiceClient>

interface RawGeoRelation {
  id: string
  sourceType: RelationType
  sourceLabel: string
  companyId?: string | null
  country?: string | null
  city?: string | null
  address?: string | null
  lat?: number
  lng?: number
  stakeholderCategory?: string | null
}

type RelationType =
  | 'company'
  | 'stakeholder'
  | 'customer'
  | 'partner'
  | 'representative'
  | 'dealer'
  | 'project'
  | 'branch'
  | 'office'

const RELATION_LABELS: Record<RelationType, string> = {
  company: 'Şirket',
  stakeholder: 'Paydaş',
  customer: 'Müşteri',
  partner: 'Ortak',
  representative: 'Temsilci',
  dealer: 'Bayi',
  project: 'Proje',
  branch: 'Şube',
  office: 'Ofis',
}

const SOURCE_TABLES: Array<{
  table: string
  type: RelationType
  companyKey?: string
  labelKeys: string[]
  countryKeys: string[]
  cityKeys: string[]
  addressKeys: string[]
}> = [
  {
    table: 'customers',
    type: 'customer',
    companyKey: 'company_id',
    labelKeys: ['display_name', 'name', 'title', 'legal_name', 'customer_name'],
    countryKeys: ['country', 'country'],
    cityKeys: ['city', 'city'],
    addressKeys: ['address', 'address'],
  },
  {
    table: 'branches',
    type: 'branch',
    companyKey: 'company_id',
    labelKeys: ['name', 'branch_name', 'display_name'],
    countryKeys: ['country', 'country'],
    cityKeys: ['city', 'city'],
    addressKeys: ['address', 'address'],
  },
  {
    table: 'offices',
    type: 'office',
    companyKey: 'company_id',
    labelKeys: ['name', 'office_name', 'display_name'],
    countryKeys: ['country', 'country'],
    cityKeys: ['city', 'city'],
    addressKeys: ['address', 'address'],
  },
  {
    table: 'dealers',
    type: 'dealer',
    companyKey: 'company_id',
    labelKeys: ['name', 'dealer_name', 'display_name'],
    countryKeys: ['country', 'country'],
    cityKeys: ['city', 'city'],
    addressKeys: ['address', 'address'],
  },
  {
    table: 'project_locations',
    type: 'project',
    companyKey: 'company_id',
    labelKeys: ['name', 'project_name', 'display_name'],
    countryKeys: ['country', 'country'],
    cityKeys: ['city', 'city'],
    addressKeys: ['address', 'address'],
  },
]

export async function getGeographicTradeReach(params: GeographicTradeReachRequest): Promise<GeographicTradeReachResponse> {
  if ((params.dataMode || 'relationship') === 'trade') {
    return aggregateTradeGeoData(params)
  }

  return aggregateRelationshipGeoData(params)
}

export async function aggregateRelationshipGeoData(params: GeographicTradeReachRequest): Promise<GeographicTradeReachResponse> {
  const supabase = createServiceClient()
  const rows = await collectRelationshipRows(supabase, params)
  const filtered = applyRelationTypeFilter(rows, params.relationTypes || [])
  return buildResponse(filtered, 'relationship')
}

export async function aggregateTradeGeoData(_params: GeographicTradeReachRequest): Promise<GeographicTradeReachResponse> {
  return {
    summary: {
      totalCountries: 0,
      totalCities: 0,
      totalPoints: 0,
      currency: 'TRY',
    },
    turkey: [],
    world: [],
  }
}

async function collectRelationshipRows(supabase: SupabaseClient, params: GeographicTradeReachRequest) {
  const rows: RawGeoRelation[] = []
  const companyId = params.mode === 'selected' ? params.companyId : null

  const companyRows = await fetchRows(supabase, 'companies', query => {
    let next = query.select('id,short_name,trade_name,country,city,district,address,is_deleted')
    if (companyId) next = next.eq('id', companyId)
    return next
  })

  rows.push(...companyRows.map((row: Record<string, any>) => ({
    id: `company:${row.id}`,
    sourceType: 'company' as const,
    sourceLabel: row.short_name || row.trade_name || 'Şirket',
    companyId: row.id,
    country: row.country || 'TR',
    city: row.city,
    address: row.address,
  })))

  const stakeholderRows = await fetchRows(supabase, 'stakeholders', query => {
    let next = query.select('id,company_id,display_name,category,country,city,stakeholder_profile,is_deleted,status')
      .eq('is_deleted', false)
    if (companyId) next = next.eq('company_id', companyId)
    return next
  })

  rows.push(...stakeholderRows.map((row: Record<string, any>) => {
    const profile = safeObject(row.stakeholder_profile)
    return {
      id: `stakeholder:${row.id}`,
      sourceType: 'stakeholder' as const,
      sourceLabel: row.display_name || 'Paydaş',
      companyId: row.company_id,
      country: row.country || profile.country || profile.country,
      city: row.city || profile.city || profile.city,
      address: profile.address || profile.address,
      lat: readNumber(row, profile, ['lat', 'latitude', 'enlem']),
      lng: readNumber(row, profile, ['lng', 'lon', 'longitude', 'boylam']),
      stakeholderCategory: row.category || profile.category || profile.category_code,
    }
  }))

  const sourceResults = await Promise.all(SOURCE_TABLES.map(async source => {
    const columns = sourceColumns(source)
    const sourceRows = await fetchRows(supabase, source.table, query => {
      let next = query.select(columns)
      if (companyId && source.companyKey) next = next.eq(source.companyKey, companyId)
      return next
    })

    return sourceRows.map((row: Record<string, any>, index: number) => ({
      id: `${source.type}:${row.id || index}`,
      sourceType: source.type,
      sourceLabel: firstString(row, source.labelKeys) || RELATION_LABELS[source.type],
      companyId: source.companyKey ? row[source.companyKey] : null,
      country: firstString(row, source.countryKeys),
      city: firstString(row, source.cityKeys),
      address: firstString(row, source.addressKeys),
      lat: readNumber(row, {}, ['lat', 'latitude', 'enlem']),
      lng: readNumber(row, {}, ['lng', 'lon', 'longitude', 'boylam']),
    }))
  }))

  rows.push(...sourceResults.flat())

  return rows.filter(hasMappableLocation)
}

function sourceColumns(source: (typeof SOURCE_TABLES)[number]) {
  return Array.from(new Set([
    'id',
    source.companyKey,
    ...source.labelKeys,
    ...source.countryKeys,
    ...source.cityKeys,
    ...source.addressKeys,
    'lat',
    'latitude',
    'enlem',
    'lng',
    'lon',
    'longitude',
    'boylam',
  ].filter(Boolean))).join(',')
}

async function fetchRows(
  supabase: SupabaseClient,
  table: string,
  build: (query: ReturnType<SupabaseClient['from']>) => any
) {
  const { data, error } = await build(supabase.from(table))
  if (error) {
    const message = error.message || ''
    if (message.includes('Could not find the table') || message.includes('does not exist') || error.code === '42P01') {
      return []
    }
    return []
  }

  return Array.isArray(data) ? data : []
}

function buildResponse(rows: RawGeoRelation[], dataMode: GeographicReachDataMode): GeographicTradeReachResponse {
  const countries = new Set<string>()
  const cities = new Set<string>()

  rows.forEach(row => {
    const country = normalizeCountry(row.country, row.city)
    if (country) countries.add(country)
    if (row.city) cities.add(`${country}:${normalizeText(row.city)}`)
  })

  return {
    summary: {
      totalCountries: countries.size,
      totalCities: cities.size,
      totalPoints: rows.length,
      currency: 'TRY',
    },
    turkey: groupRows(rows.filter(row => normalizeCountry(row.country, row.city) === 'TR' && row.city), 'city', dataMode),
    world: groupRows(rows.filter(row => normalizeCountry(row.country, row.city)), 'country', dataMode),
  }
}

function groupRows(rows: RawGeoRelation[], scope: 'city' | 'country', dataMode: GeographicReachDataMode) {
  const grouped = new Map<string, RawGeoRelation[]>()

  rows.forEach(row => {
    const country = normalizeCountry(row.country, row.city) || 'TR'
    const key = scope === 'city'
      ? `${country}:${normalizeText(row.city)}`
      : country
    const bucket = grouped.get(key) || []
    bucket.push(row)
    grouped.set(key, bucket)
  })

  return Array.from(grouped.entries()).map(([key, items]): GeoPoint => {
    const first = items[0]
    const countryId = normalizeCountry(first.country, first.city) || key
    const city = scope === 'city' ? normalizeCityLabel(first.city || key.split(':').at(-1) || '') : undefined

    return {
      id: `${scope}:${key}`,
      country: getCountryLabel(countryId),
      city,
      lat: first.lat,
      lng: first.lng,
      totalCount: items.length,
      relationBreakdown: buildBreakdown(items),
      ...(dataMode === 'trade'
        ? { trade: { transactionCount: 0, totalAmount: 0, currency: 'TRY' } }
        : {}),
    }
  }).sort((a, b) => b.totalCount - a.totalCount)
}

function buildBreakdown(rows: RawGeoRelation[]) {
  const byType = new Map<string, { count: number; children: Map<string, number> }>()

  rows.forEach(row => {
    const label = RELATION_LABELS[row.sourceType]
    const current = byType.get(label) || { count: 0, children: new Map<string, number>() }
    current.count += 1
    if (row.sourceType === 'stakeholder') {
      const category = normalizeStakeholderCategory(row.stakeholderCategory)
      current.children.set(category, (current.children.get(category) || 0) + 1)
    }
    byType.set(label, current)
  })

  return Array.from(byType.entries()).map(([type, item]) => ({
    type,
    count: item.count,
    children: item.children.size
      ? Array.from(item.children.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
      : undefined,
  }))
}

function applyRelationTypeFilter(rows: RawGeoRelation[], relationTypes: string[]) {
  const normalized = relationTypes.map(item => normalizeText(item)).filter(Boolean)
  if (!normalized.length || normalized.includes('all') || normalized.includes('tumu')) return rows

  return rows.filter(row => {
    if (normalized.includes('supplier') || normalized.includes('tedarikci')) {
      const category = normalizeText(row.stakeholderCategory)
      if (row.sourceType === 'stakeholder' && (category === 'tedarikci' || category === 'supplier')) return true
    }

    return normalized.includes(row.sourceType)
  })
}

function hasMappableLocation(row: RawGeoRelation) {
  return !!(row.country || row.city || (Number.isFinite(row.lat) && Number.isFinite(row.lng)))
}

function normalizeCountry(country?: string | null, city?: string | null) {
  const raw = String(country || '').trim()
  if (!raw && city) return 'TR'
  if (!raw) return ''
  return normalizeCountryId(raw)
}

function normalizeStakeholderCategory(value?: string | null) {
  const raw = String(value || '').trim()
  const key = normalizeText(raw)
  if (key === 'supplier' || key === 'tedarikci') return 'Tedarikçi'
  return raw || 'Diğer'
}

function normalizeCityLabel(value: string) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g, char => char.toLocaleUpperCase('tr-TR'))
}

function normalizeText(value?: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

function firstString(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function readNumber(row: Record<string, any>, profile: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = row[key] ?? profile[key]
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return undefined
}

function safeObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}
