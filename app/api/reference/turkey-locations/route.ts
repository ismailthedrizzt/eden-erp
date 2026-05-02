import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getFallbackTurkeyLocations, normalizeTurkeyLocationsPayload } from '@/lib/reference/turkey-locations'

export const runtime = 'nodejs'

export async function GET() {
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
        return NextResponse.json({ ...payload, cachedAt: data?.updated_at })
      }
    }
  } catch {
    // Fallback below keeps the form usable before migrations/env are ready.
  }

  return NextResponse.json(getFallbackTurkeyLocations())
}
