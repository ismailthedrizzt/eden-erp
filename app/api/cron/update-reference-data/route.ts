import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildTradeRegistryOfficesPayload } from '@/lib/reference/trade-registry-offices'
import { NaceReferenceUpdateService } from '@/lib/modules/companies/nace/naceReference.service'
import { PDFParse } from 'pdf-parse'

export const runtime = 'nodejs'

const SOURCE_BASE = 'https://raw.githubusercontent.com/onurusluca/turkey-geo-api/main/data/jsonl'
const TAX_OFFICES_SOURCE_URL = 'https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2FDefterdarl%C4%B1kveVergiDaireleriListesi.pdf'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = await buildTurkeyLocationsPayload()
  const taxOfficesPayload = await buildTaxOfficesPayload(payload.provinces.map(province => province.name))
  const tradeRegistryOfficesPayload = await buildTradeRegistryOfficesPayload()
  const supabase = createServiceClient()
  const naceUpdate = await new NaceReferenceUpdateService(supabase).updateFromTrustedSources()
  const { error } = await supabase
    .from('reference_data')
    .upsert([
      {
        key: 'turkey_locations',
        payload,
        source_url: payload.source.url,
        updated_at: new Date().toISOString(),
      },
      {
        key: 'tax_offices',
        payload: taxOfficesPayload,
        source_url: taxOfficesPayload.source.url,
        updated_at: new Date().toISOString(),
      },
      {
        key: 'trade_registry_offices',
        payload: tradeRegistryOfficesPayload,
        source_url: tradeRegistryOfficesPayload.source.url,
        updated_at: new Date().toISOString(),
      },
    ], { onConflict: 'key' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    provinces: payload.provinces.length,
    districts: payload.provinces.reduce((total, province) => total + province.districts.length, 0),
    taxOffices: taxOfficesPayload.offices.length,
    tradeRegistryOffices: tradeRegistryOfficesPayload.offices.length,
    naceReference: naceUpdate,
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
        'Nüfus ve Vatandaşlık İşleri address sorgu',
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

async function buildTaxOfficesPayload(provinces: string[]) {
  const response = await fetch(TAX_OFFICES_SOURCE_URL, {
    headers: { 'User-Agent': 'eden-erp-reference-updater' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Tax office fetch failed: ${response.status}`)
  }

  const parser = new PDFParse({ data: Buffer.from(await response.arrayBuffer()) })
  const result = await parser.getText()
  await parser.destroy()

  const provinceNames = provinces
    .map(province => province.toLocaleUpperCase('tr-TR'))
    .sort((a, b) => b.length - a.length)

  const offices = result.text
    .split(/\r?\n/)
    .map(line => parseTaxOfficeLine(line.trim(), provinceNames))
    .filter((office): office is NonNullable<typeof office> => !!office)

  return {
    source: {
      name: 'Gelir İdaresi Başkanlığı - Defterdarlık ve Vergi Daireleri Listesi',
      url: TAX_OFFICES_SOURCE_URL,
    },
    generatedAt: new Date().toISOString(),
    offices,
  }
}

function parseTaxOfficeLine(line: string, provinceNames: string[]) {
  const prefix = line.match(/^(\d{2})\s+(.+)$/)
  if (!prefix) return null

  const cityCode = prefix[1]
  const rest = prefix[2]
  const province = provinceNames.find(name => rest.startsWith(`${name} `))
  if (!province) return null

  const afterProvince = rest.slice(province.length).trim()
  const coded = afterProvince.match(/^(.+?)\s+(\d{5})\s+(.+)$/)
  const uncoded = afterProvince.match(/^(.+?)\s+(.+(?:Şubesi|Malmüdürlüğü|Vergi Dairesi Müdürlüğü))$/)
  const district = (coded?.[1] || uncoded?.[1] || '').replace(/\s+\(\*\*\)/g, '').trim()
  const code = coded?.[2] || null
  const name = (coded?.[3] || uncoded?.[2] || '').trim()

  if (!district || !name) return null

  return {
    id: code || `${cityCode}-${slugify(district)}-${slugify(name)}`,
    code,
    name,
    province,
    district,
  }
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
