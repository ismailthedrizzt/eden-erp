import { NextRequest, NextResponse } from 'next/server'
import { getGeographicTradeReach } from '@/lib/modules/companies/services/geographicTradeReach.server'
import type { GeographicReachDataMode, GeographicReachMode } from '@/lib/modules/companies/services/geographicTradeReach.service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = normalizeMode(searchParams.get('mode'))
  const dataMode = normalizeDataMode(searchParams.get('dataMode'))
  const companyId = searchParams.get('companyId')

  if (mode === 'selected' && !companyId) {
    return NextResponse.json({ error: 'Seçilen şirket modu için companyId gerekli', code: 'COMPANY_ID_REQUIRED' }, { status: 400 })
  }

  try {
    const payload = await getGeographicTradeReach({
      companyId,
      mode,
      dataMode,
      relationTypes: parseCsv(searchParams.get('relationTypes')),
      dateRange: {
        from: searchParams.get('dateFrom') || undefined,
        to: searchParams.get('dateTo') || undefined,
      },
      currency: searchParams.get('currency') || undefined,
    })

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Coğrafi erişim verisi oluşturulamadı',
      code: 'GEOGRAPHIC_REACH_FAILED',
    }, { status: 500 })
  }
}

function normalizeMode(value: string | null): GeographicReachMode {
  return value === 'selected' ? 'selected' : 'all'
}

function normalizeDataMode(value: string | null): GeographicReachDataMode {
  return value === 'trade' ? 'trade' : 'relationship'
}

function parseCsv(value: string | null) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}
