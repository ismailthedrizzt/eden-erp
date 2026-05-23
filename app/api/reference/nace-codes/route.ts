import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { NaceReferenceUpdateService } from '@/lib/modules/companies/nace/naceReference.service'

const EMPTY_NACE_WARNING = 'NACE referans listesi oluşturulamadı. Resmi Ticaret Bakanlığı listesi okunamadı.'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()

  const { searchParams } = new URL(request.url)
  const queryText = searchParams.get('q')

  const firstResult = await queryNaceCodes(supabase, queryText)
  if (firstResult.error) {
    if (isMissingTableError(firstResult.error)) {
      return NextResponse.json({ data: [], warning: EMPTY_NACE_WARNING })
    }
    return NextResponse.json({ error: firstResult.error.message }, { status: 500 })
  }

  let data = firstResult.data || []
  if (data.length === 0) {
    const seedResult = await new NaceReferenceUpdateService(supabase).seedFromFallback(queryText, 50)
    if (!seedResult.warning) {
      const refreshed = await queryNaceCodes(supabase, queryText)
      data = refreshed.data || []
    }
  }

  return NextResponse.json({
    data,
    warning: data.length === 0 ? EMPTY_NACE_WARNING : undefined,
  })
}

async function queryNaceCodes(supabase: ReturnType<typeof createServiceClient>, queryText: string | null) {
  const searchTerms = normalizeNaceSearchTerms(queryText)
  const databaseSearchTerm = selectDatabaseSearchTerm(searchTerms)
  let query = supabase
    .from('nace_codes')
    .select('id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at,created_at,updated_at,version')
    .eq('is_active', true)
    .order('nace_code', { ascending: true })
    .limit(searchTerms.length > 1 ? 300 : 50)

  if (databaseSearchTerm) {
    query = query.or(`nace_code.ilike.%${databaseSearchTerm}%,description.ilike.%${databaseSearchTerm}%`)
  }

  const result = await query
  if (result.error || searchTerms.length <= 1) return result

  return {
    ...result,
    data: filterNaceRowsByTerms(result.data || [], searchTerms).slice(0, 50),
  }
}

function normalizeNaceSearchTerms(queryText: string | null) {
  const normalizedText = String(queryText || '').normalize('NFKC').trim()
  if (!normalizedText) return []

  const seen = new Set<string>()
  const terms: string[] = []

  for (const part of normalizedText.split(/[\s,;:!?()\[\]{}"'\u2018\u2019\u201c\u201d`~@#$%^&*+=<>\\|\/]+/)) {
    const term = part
      .trim()
      .replace(/^[-.]+|[-.]+$/g, '')
      .replace(/[%_]/g, '')

    if (!term) continue
    const key = term.toLocaleLowerCase('tr-TR')
    if (seen.has(key)) continue

    seen.add(key)
    terms.push(term)
    if (terms.length >= 6) break
  }

  return terms
}

function selectDatabaseSearchTerm(terms: string[]) {
  if (terms.length === 0) return ''
  return terms.reduce((selected, term) => (
    normalizeNaceSearchText(term).length > normalizeNaceSearchText(selected).length ? term : selected
  ), terms[0])
}

function filterNaceRowsByTerms(rows: any[], terms: string[]) {
  const normalizedTerms = terms.map(normalizeNaceSearchText).filter(Boolean)
  if (normalizedTerms.length === 0) return rows

  return rows.filter(row => {
    const haystack = normalizeNaceSearchText(`${row?.nace_code || ''} ${row?.description || ''}`)
    return normalizedTerms.every(term => haystack.includes(term))
  })
}

function normalizeNaceSearchText(value: any) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ')
}

function isMissingTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('Could not find the table')
}
