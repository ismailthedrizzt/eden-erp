import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getFallbackSgkCodeLists, normalizeSgkCodeListsPayload, type SgkCodeListsPayload } from '@/lib/reference/sgk-code-lists'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const q = normalizeSearch(searchParams.get('q'))

  let payload = getFallbackSgkCodeLists()
  let cachedAt: string | undefined

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('reference_data')
      .select('payload, updated_at')
      .eq('key', 'sgk_code_lists')
      .maybeSingle()

    if (!error) {
      const normalized = normalizeSgkCodeListsPayload(data?.payload)
      if (normalized) {
        payload = normalized
        cachedAt = data?.updated_at
      }
    }
  } catch {
    // Fallback keeps SGK forms usable before reference_data or env setup is ready.
  }

  const filtered = filterPayload(payload, category, q)
  return NextResponse.json({ ...filtered, cachedAt })
}

function filterPayload(payload: SgkCodeListsPayload, category: string | null, q: string) {
  const selectedCategories = category
    ? { [category]: payload.categories[category] || [] }
    : payload.categories

  if (!q) return { ...payload, categories: selectedCategories }

  return {
    ...payload,
    categories: Object.fromEntries(
      Object.entries(selectedCategories).map(([key, options]) => [
        key,
        options.filter((option) => {
          const haystack = normalizeSearch(`${option.value} ${option.label}`)
          return haystack.includes(q)
        }).slice(0, 50),
      ])
    ),
  }
}

function normalizeSearch(value: string | null) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
}
