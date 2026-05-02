import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getFallbackTaxOffices, normalizeTaxOfficesPayload } from '@/lib/reference/tax-offices'

export const runtime = 'nodejs'

export async function GET() {
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
        return NextResponse.json({ ...payload, cachedAt: data?.updated_at })
      }
    }
  } catch {
    // Fallback below keeps the form usable before migrations/env are ready.
  }

  return NextResponse.json(getFallbackTaxOffices())
}
