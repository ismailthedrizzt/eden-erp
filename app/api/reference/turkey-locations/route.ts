import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  getFallbackTurkeyLocations,
  normalizeTurkeyLocationsPayload,
  type TurkeyLocationsPayload,
  type TurkeyProvince,
} from '@/lib/reference/turkey-locations'
import { matchesReferenceSearch, normalizeReferenceSearch, parseReferenceLimit, type ReferenceOption } from '@/lib/reference/search'
import { wantsFullReferencePayload } from '@/lib/reference/guardrails'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('reference_data')
      .select('payload, updated_at')
      .eq('key', 'turkey_locations')
      .maybeSingle()

    if (!error) {
      const payload = normalizeTurkeyLocationsPayload(data?.payload)
      if (payload) {
        return NextResponse.json(createTurkeyLocationsResponse(payload, request, data?.updated_at))
      }
    }
  } catch {
    // Fallback below keeps the form usable before migrations/env are ready.
  }

  return NextResponse.json(createTurkeyLocationsResponse(getFallbackTurkeyLocations(), request))
}

function createTurkeyLocationsResponse(payload: TurkeyLocationsPayload, request: NextRequest, cachedAt?: string | null) {
  const searchParams = request.nextUrl.searchParams
  const scope = searchParams.get('scope')
  const provinceQuery = searchParams.get('province') || searchParams.get('city')
  const query = searchParams.get('q') || ''
  const hasScopedRequest = !!scope || !!provinceQuery || searchParams.has('q') || searchParams.has('limit')
  const baseResponse = cachedAt ? { ...payload, cachedAt } : payload
  const scopedBaseResponse = {
    source: payload.source,
    generatedAt: payload.generatedAt,
    ...(cachedAt ? { cachedAt } : {}),
  }

  if (!hasScopedRequest && wantsFullReferencePayload(searchParams)) return baseResponse

  if (provinceQuery) {
    const province = findProvince(payload.provinces, provinceQuery)
    if (!province) {
      return {
        ...scopedBaseResponse,
        province: null,
        districts: [],
        options: [],
        total: 0,
      }
    }

    const limit = parseReferenceLimit(searchParams.get('limit'), province.districts.length, province.districts.length)
    const matchingDistricts = province.districts.filter(district =>
      matchesReferenceSearch([district.name, district.officialName], query)
    )
    const districts = matchingDistricts.slice(0, limit)

    return {
      ...scopedBaseResponse,
      province: {
        id: province.id,
        name: province.name,
        officialName: province.officialName,
      },
      districts,
      options: districts.map(district => ({ value: district.name, label: district.name })),
      total: matchingDistricts.length,
    }
  }

  const limit = parseReferenceLimit(searchParams.get('limit'), 81, 81)
  const matchingProvinces = payload.provinces.filter(province =>
    matchesReferenceSearch([province.name, province.officialName, province.id], query)
  )
  const provinces = matchingProvinces.slice(0, limit).map(province => ({
    id: province.id,
    name: province.name,
    officialName: province.officialName,
    districts: [],
  }))

  return {
    ...scopedBaseResponse,
    scope: scope || 'provinces',
    provinces,
    options: provinces.map(toProvinceOption),
    total: matchingProvinces.length,
  }
}

function findProvince(provinces: TurkeyProvince[], query: string) {
  const normalizedQuery = normalizeReferenceSearch(query)
  return provinces.find(province =>
    normalizeReferenceSearch(province.name) === normalizedQuery ||
    normalizeReferenceSearch(province.officialName) === normalizedQuery
  ) || provinces.find(province =>
    matchesReferenceSearch([province.name, province.officialName], query)
  )
}

function toProvinceOption(province: Pick<TurkeyProvince, 'name'>): ReferenceOption {
  return { value: province.name, label: province.name }
}
