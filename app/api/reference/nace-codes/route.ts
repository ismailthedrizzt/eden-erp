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

function queryNaceCodes(supabase: ReturnType<typeof createServiceClient>, queryText: string | null) {
  let query = supabase
    .from('nace_codes')
    .select('id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at,created_at,updated_at,version')
    .eq('is_active', true)
    .order('nace_code', { ascending: true })
    .limit(50)

  if (queryText) query = query.or(`nace_code.ilike.%${queryText}%,description.ilike.%${queryText}%`)
  return query
}

function isMissingTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('Could not find the table')
}
