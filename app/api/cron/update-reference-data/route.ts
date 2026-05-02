import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const SOURCE_BASE = 'https://raw.githubusercontent.com/onurusluca/turkey-geo-api/main/data/jsonl'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = await buildTurkeyLocationsPayload()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('reference_data')
    .upsert({
      key: 'turkey_locations',
      payload,
      source_url: payload.source.url,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    provinces: payload.provinces.length,
    districts: payload.provinces.reduce((total, province) => total + province.districts.length, 0),
  })
}

async function buildTurkeyLocationsPayload() {
  const provinces = parseJsonl(await getText(`${SOURCE_BASE}/provinces.jsonl`))
    .map(province => ({
      id: province.id,
      name: toTitleCase(province.name),
      officialName: province.full_official_name,
      districts: [] as Array<{ id: number; name: string; officialName?: string }>,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'))

  for (const province of provinces) {
    province.districts = parseJsonl(await getText(`${SOURCE_BASE}/province-${province.id}/districts.jsonl`))
      .map(district => ({
        id: district.id,
        name: toTitleCase(district.name),
        officialName: district.full_official_name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }

  return {
    source: {
      name: 'onurusluca/turkey-geo-api',
      url: 'https://github.com/onurusluca/turkey-geo-api',
      upstreamSources: [
        'Nüfus ve Vatandaşlık İşleri adres sorgu',
        'Türkiye İstatistik Kurumu',
        'Harita Genel Müdürlüğü',
      ],
      license: 'MIT',
    },
    generatedAt: new Date().toISOString(),
    provinces,
  }
}

async function getText(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'eden-erp-reference-updater' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${url}`)
  }

  return response.text()
}

function parseJsonl(text: string) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line))
}

function toTitleCase(value: string) {
  return value.toLocaleLowerCase('tr-TR').replace(/(^|\s|-)(\p{L})/gu, (_, prefix, char) => `${prefix}${char.toLocaleUpperCase('tr-TR')}`)
}
