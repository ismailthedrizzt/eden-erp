// BACKEND_MIGRATION_STATUS: local_reference_fallback
// CANONICAL_BACKEND: Static local reference data

import { NextRequest, NextResponse } from 'next/server'
import { getFallbackTurkeyLocations } from '@/lib/reference/turkey-locations'

export const runtime = 'nodejs'

function normalizeLocation(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export async function GET(request: NextRequest) {
  const locations = getFallbackTurkeyLocations()
  const scope = request.nextUrl.searchParams.get('scope') || ''
  const provinceQuery = request.nextUrl.searchParams.get('province') || ''
  const query = request.nextUrl.searchParams.get('q') || request.nextUrl.searchParams.get('query') || ''
  const limit = Number(request.nextUrl.searchParams.get('limit') || 0)

  if (provinceQuery) {
    const key = normalizeLocation(provinceQuery)
    const province = locations.provinces.find(item =>
      normalizeLocation(item.name) === key || normalizeLocation(item.officialName || '') === key
    )
    const districts = province?.districts || []
    const filtered = query
      ? districts.filter(item => normalizeLocation(item.name).includes(normalizeLocation(query)))
      : districts
    return NextResponse.json(
      { districts: limit > 0 ? filtered.slice(0, limit) : filtered },
      { headers: { 'cache-control': 'no-store, max-age=0' } }
    )
  }

  const provinces = query
    ? locations.provinces.filter(item => normalizeLocation(item.name).includes(normalizeLocation(query)) || normalizeLocation(item.officialName || '').includes(normalizeLocation(query)))
    : locations.provinces

  return NextResponse.json(
    { provinces: limit > 0 ? provinces.slice(0, limit) : provinces },
    { headers: { 'cache-control': 'no-store, max-age=0' } }
  )
}
