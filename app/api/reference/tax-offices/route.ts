import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getFallbackTaxOffices, normalizeTaxOfficesPayload, type TaxOffice, type TaxOfficesPayload } from '@/lib/reference/tax-offices'
import { hasReferenceQuery, matchesReferenceSearch, parseReferenceLimit, type ReferenceOption } from '@/lib/reference/search'
import { referenceQueryRequiredResponse, wantsFullReferencePayload } from '@/lib/reference/guardrails'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  if (!hasReferenceQuery(request.nextUrl.searchParams) && !wantsFullReferencePayload(request.nextUrl.searchParams)) {
    return referenceQueryRequiredResponse('Vergi dairesi')
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('reference_data')
      .select('payload, updated_at')
      .eq('key', 'tax_offices')
      .maybeSingle()

    if (!error) {
      const payload = normalizeTaxOfficesPayload(data?.payload)
      if (payload) {
        return NextResponse.json(createTaxOfficesResponse(payload, request, data?.updated_at))
      }
    }
  } catch {
    // Fallback below keeps the form usable before migrations/env are ready.
  }

  return NextResponse.json(createTaxOfficesResponse(getFallbackTaxOffices(), request))
}

function createTaxOfficesResponse(payload: TaxOfficesPayload, request: NextRequest, cachedAt?: string | null) {
  const searchParams = request.nextUrl.searchParams
  const baseResponse = cachedAt ? { ...payload, cachedAt } : payload
  if (!hasReferenceQuery(searchParams)) return baseResponse

  const query = searchParams.get('q') || ''
  const limit = parseReferenceLimit(searchParams.get('limit'), 50, 100)
  const matchingOffices = payload.offices.filter(office =>
    matchesReferenceSearch([office.code, office.name, office.province, office.district], query)
  )
  const offices = matchingOffices.slice(0, limit)

  return {
    ...baseResponse,
    offices,
    options: toTaxOfficeOptions(offices),
    total: matchingOffices.length,
  }
}

function toTaxOfficeOptions(offices: TaxOffice[]): ReferenceOption[] {
  const byName = new Map<string, ReferenceOption>()

  offices.forEach(office => {
    const name = String(office.name || '').trim()
    if (!name || byName.has(name)) return
    const code = String(office.code || '').trim()
    const location = [office.province, office.district]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join('/')
    const label = [code ? `${code} - ${name}` : name, location ? `(${location})` : '']
      .filter(Boolean)
      .join(' ')
    byName.set(name, { value: name, label })
  })

  return Array.from(byName.values()).sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}
