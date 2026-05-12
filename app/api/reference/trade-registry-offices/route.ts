import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buildTradeRegistryOfficesPayload,
  normalizeTradeRegistryOfficesPayload,
} from '@/lib/reference/trade-registry-offices'

export const runtime = 'nodejs'

export async function GET() {
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
        return NextResponse.json({ ...payload, cachedAt: data?.updated_at })
      }
    }
  } catch {
    // Live fallback below keeps the form usable before the scheduled cache is populated.
  }

  try {
    return NextResponse.json(await buildTradeRegistryOfficesPayload())
  } catch (error) {
    return NextResponse.json({
      source: {
        name: 'TOBB - Türkiye Ticaret Sicili Gazetesi Ticaret Sicili Müdürlükleri',
        url: 'https://www.ticaretsicil.gov.tr/view/menu/mudurlukler.php',
      },
      generatedAt: new Date().toISOString(),
      offices: [],
      error: error instanceof Error ? error.message : 'Ticaret sicili müdürlükleri alınamadı',
    }, { status: 503 })
  }
}
