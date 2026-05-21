import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buildTradeRegistryOfficesPayload,
  normalizeTradeRegistryOfficesPayload,
  type TradeRegistryOffice,
  type TradeRegistryOfficesPayload,
} from '@/lib/reference/trade-registry-offices'
import { hasReferenceQuery, matchesReferenceSearch, parseReferenceLimit, type ReferenceOption } from '@/lib/reference/search'
import { referenceQueryRequiredResponse, wantsFullReferencePayload } from '@/lib/reference/guardrails'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  if (!hasReferenceQuery(request.nextUrl.searchParams) && !wantsFullReferencePayload(request.nextUrl.searchParams)) {
    return referenceQueryRequiredResponse('Ticaret sicili müdürlüğü')
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('reference_data')
      .select('payload, updated_at')
      .eq('key', 'trade_registry_offices')
      .maybeSingle()

    if (!error) {
      const payload = normalizeTradeRegistryOfficesPayload(data?.payload)
      if (payload) {
        return NextResponse.json(createTradeRegistryOfficesResponse(payload, request, data?.updated_at))
      }
    }
  } catch {
    // Live fallback below keeps the form usable before the scheduled cache is populated.
  }

  try {
    return NextResponse.json(createTradeRegistryOfficesResponse(await buildTradeRegistryOfficesPayload(), request))
  } catch (error) {
    return NextResponse.json({
      source: {
        name: 'TOBB - Türkiye Ticaret Sicili Gazetesi Ticaret Sicili Müdürlükleri',
        url: 'https://www.ticaretsicil.gov.tr/view/menu/mudurlukler.php',
      },
      generatedAt: new Date().toISOString(),
      offices: [],
      options: [],
      error: error instanceof Error ? error.message : 'Ticaret sicili müdürlükleri alınamadı',
    }, { status: 503 })
  }
}

function createTradeRegistryOfficesResponse(payload: TradeRegistryOfficesPayload, request: NextRequest, cachedAt?: string | null) {
  const searchParams = request.nextUrl.searchParams
  const baseResponse = cachedAt ? { ...payload, cachedAt } : payload
  if (!hasReferenceQuery(searchParams)) return baseResponse

  const query = searchParams.get('q') || ''
  const limit = parseReferenceLimit(searchParams.get('limit'), 50, 100)
  const matchingOffices = payload.offices.filter(office =>
    matchesReferenceSearch([office.id, office.name, toTradeRegistryOfficeLabel(office)], query)
  )
  const offices = matchingOffices.slice(0, limit)

  return {
    ...baseResponse,
    offices,
    options: offices.map(toTradeRegistryOfficeOption),
    total: matchingOffices.length,
  }
}

function toTradeRegistryOfficeOption(office: TradeRegistryOffice): ReferenceOption {
  const label = toTradeRegistryOfficeLabel(office)
  return { value: label, label }
}

function toTradeRegistryOfficeLabel(office: TradeRegistryOffice) {
  const name = String(office.name || '').trim()
  if (!name) return ''
  return name.toLocaleLowerCase('tr-TR').includes('ticaret sicili')
    ? name
    : `${name} Ticaret Sicili Müdürlüğü`
}
