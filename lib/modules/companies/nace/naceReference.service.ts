import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { systemParameterDefaultValue } from '@/lib/system/systemParameters.config'
import fallbackNaceCodes from '@/lib/data/nace-codes.json'

export interface NaceReferenceRow {
  nace_code: string
  description: string
  hazard_class: 'Az Tehlikeli' | 'Tehlikeli' | 'Çok Tehlikeli'
  source_name: string
  source_url?: string | null
  source_reference?: string | null
}

interface ImportOptions {
  sourceName: string
  sourceUrl?: string | null
  sourceReference?: string | null
  defaultHazardClass?: NaceReferenceRow['hazard_class']
  columnMap?: {
    code?: string
    description?: string
    hazardClass?: string
  }
}

interface FallbackNacePayload {
  sourceName?: string
  sourceUrl?: string
  sourceReference?: string
  records?: Array<{
    nace_code: string
    description: string
  }>
}

const FALLBACK_NACE_PAYLOAD = fallbackNaceCodes as FallbackNacePayload
const FALLBACK_NACE_SOURCE = {
  name: FALLBACK_NACE_PAYLOAD.sourceName || 'Yerel NACE referans listesi',
  url: FALLBACK_NACE_PAYLOAD.sourceReference || FALLBACK_NACE_PAYLOAD.sourceUrl || 'lib/data/nace-codes.json',
}

const TRUSTED_SOURCES = [
  {
    name: 'Ticaret Bakanlığı Esnaf ve Sanatkar NACE Kodları ve Meslek Listesi',
    url: 'https://ticaret.gov.tr/data/5d418c7e13b87639ac9dffe0/Esnaf%20ve%20Sanatk%C3%A2r%20NACE%20Kodlar%C4%B1%20ve%20Meslek%20Listesi%2029.01.2026.xlsx',
    referenceUrl: 'https://ticaret.gov.tr/esnaf-sanatkarlar/esnaf-ve-sanatkar-meslek-kollari/sektor-meslek-nace-listeleri/guncel-liste',
  },
  {
    name: 'Ticaret Bakanlığı Güncel NACE Rev.2.1 Listesi',
    url: 'https://ticaret.gov.tr/esnaf-sanatkarlar/esnaf-ve-sanatkar-meslek-kollari/sektor-meslek-nace-listeleri/guncel-liste',
  },
  {
    name: 'Ticaret Bakanlığı NACE Güncelleme Duyurusu',
    url: 'https://esnafkoop.ticaret.gov.tr/duyurular/esnaf-ve-sanatkar-meslek-kollari-ve-nace-listesi-guncellendi',
  },
]

const CODE_COLUMN_CANDIDATES = [
  'nace rev. 2.1 kodu',
  'nace rev.2.1 kodu',
  'nace kodu',
  'nace rev.2 altili kod',
  'nace rev.2 altılı kod',
  'altili kod',
  'altılı kod',
  'kod',
]

const DESCRIPTION_COLUMN_CANDIDATES = [
  'nace rev.2.1 tanim',
  'nace rev.2.1 tanım',
  'nace tanimi',
  'nace tanımı',
  'faaliyet tanimi',
  'faaliyet tanımı',
  'nace rev.2 altili tanim',
  'nace rev.2 altılı tanım',
  'meslek tanim',
  'meslek tanım',
  'tanim',
  'tanım',
  'aciklama',
  'açıklama',
]

const HAZARD_COLUMN_CANDIDATES = [
  'tehlike sinifi',
  'tehlike sınıfı',
  'sinifi',
  'sınıfı',
  'ek-1 tehlike sinifi',
  'ek-1 tehlike sınıfı',
]

export class NaceReferenceImportService {
  constructor(private supabase: SupabaseClient) {}

  async importBuffer(buffer: Buffer, filename: string, options: ImportOptions) {
    const importOptions = {
      ...options,
      defaultHazardClass: options.defaultHazardClass || await getDefaultHazardClass(this.supabase),
    }
    const lower = filename.toLocaleLowerCase('tr-TR')
    const rows = lower.endsWith('.csv')
      ? parseCsv(buffer.toString('utf8'), importOptions)
      : lower.endsWith('.xlsx') || lower.endsWith('.xls')
        ? await parseXlsx(buffer, importOptions)
        : []

    if (!rows.length) {
      await this.log('failed', importOptions, 'NACE referans listesi oluşturulamadı. Resmi Ticaret Bakanlığı listesi okunamadı.')
      return { imported: 0, updated: 0, rows: [] as NaceReferenceRow[], warning: 'NACE referans listesi oluşturulamadı. Resmi Ticaret Bakanlığı listesi okunamadı.' }
    }

    const result = await this.upsertRows(rows)
    await this.log('success', importOptions, 'NACE referans listesi içe aktarıldı.', result.imported, result.updated)
    return { ...result, rows }
  }

  async upsertRows(rows: NaceReferenceRow[]) {
    let imported = 0
    let updated = 0

    for (const row of rows) {
      const { data: existing } = await this.supabase
        .from('nace_codes')
        .select('id,description,hazard_class,version')
        .eq('nace_code', row.nace_code)
        .maybeSingle()

      if (existing?.id) {
        const changed = existing.description !== row.description || existing.hazard_class !== row.hazard_class
        const { error } = await this.supabase
          .from('nace_codes')
          .update({
            description: row.description,
            hazard_class: row.hazard_class,
            source_name: row.source_name,
            source_url: row.source_url || null,
            source_reference: row.source_reference || null,
            is_active: true,
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: changed ? Number(existing.version || 1) + 1 : existing.version,
          })
          .eq('id', existing.id)
        if (error) throw error
        if (changed) updated += 1
      } else {
        const { error } = await this.supabase.from('nace_codes').insert({
          ...row,
          last_checked_at: new Date().toISOString(),
          is_active: true,
        })
        if (error) throw error
        imported += 1
      }
    }

    return { imported, updated }
  }

  private async log(status: string, options: ImportOptions, message: string, imported = 0, updated = 0) {
    await this.supabase.from('nace_reference_update_logs').insert({
      job_name: 'weekly_nace_reference_update',
      source_name: options.sourceName,
      source_url: options.sourceUrl || null,
      status,
      message,
      imported_count: imported,
      updated_count: updated,
      raw_metadata: {
        sourceReference: options.sourceReference || null,
        defaultHazardClass: options.defaultHazardClass || null,
      },
    })
  }
}

export class NaceReferenceUpdateService {
  constructor(private supabase: SupabaseClient) {}

  async seedFromFallback(queryText?: string | null, limit?: number) {
    const fallbackRows = filterFallbackRows(await buildFallbackNaceRows(this.supabase), queryText)
    const rows = typeof limit === 'number' ? fallbackRows.slice(0, limit) : fallbackRows

    if (rows.length === 0) {
      return {
        imported: 0,
        updated: 0,
        rows: [] as NaceReferenceRow[],
        warning: 'NACE referans listesi oluşturulamadı. Resmi Ticaret Bakanlığı listesi okunamadı.',
      }
    }

    const now = new Date().toISOString()
    const { error } = await this.supabase.from('nace_codes').upsert(
      rows.map(row => ({
        ...row,
        is_active: true,
        last_checked_at: now,
        updated_at: now,
      })),
      { onConflict: 'nace_code' }
    )
    if (error) throw error

    try {
      await this.log(
        'success',
        FALLBACK_NACE_SOURCE,
        `Yerel NACE referans listesi içe aktarıldı (${rows.length} kayıt).`
      )
    } catch {
      // Reference lookup should not fail just because update logging is unavailable.
    }
    return { imported: rows.length, updated: 0, rows }
  }

  async updateFromTrustedSources() {
    const importService = new NaceReferenceImportService(this.supabase)

    for (const source of TRUSTED_SOURCES) {
      try {
        const discovered = await discoverDownloadSource(source.url)
        const response = await fetch(discovered.url, { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = Buffer.from(await response.arrayBuffer())
        const result = await importService.importBuffer(buffer, discovered.filename, {
          sourceName: source.name,
          sourceUrl: discovered.url,
          sourceReference: 'referenceUrl' in source ? source.referenceUrl : source.url,
        })
        if (!result.warning) return result
      } catch (error) {
        await this.log('failed', source, error instanceof Error ? error.message : 'Kaynak okunamadı')
      }
    }

    try {
      const fallbackRows = await buildFallbackNaceRows(this.supabase)
      if (fallbackRows.length > 0) {
        const result = await importService.upsertRows(fallbackRows)
        await this.log(
          'success',
          FALLBACK_NACE_SOURCE,
          `Yerel NACE referans listesi içe aktarıldı (${fallbackRows.length} kayıt).`
        )
        return { ...result, rows: fallbackRows }
      }
    } catch (error) {
      await this.log('failed', FALLBACK_NACE_SOURCE, error instanceof Error ? error.message : 'Yerel NACE listesi okunamadı')
    }

    return {
      imported: 0,
      updated: 0,
      warning: 'NACE referans listesi oluşturulamadı. Resmi Ticaret Bakanlığı listesi okunamadı.',
    }
  }

  private async log(status: string, source: { name: string; url: string }, message: string) {
    await this.supabase.from('nace_reference_update_logs').insert({
      job_name: 'weekly_nace_reference_update',
      source_name: source.name,
      source_url: source.url,
      status,
      message,
      raw_metadata: { scheduler: 'Pazartesi 03:00', cron: '0 3 * * 1' },
    })
  }
}

async function discoverDownloadSource(sourceUrl: string) {
  const response = await fetch(sourceUrl, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Kaynak sayfa okunamadı: HTTP ${response.status}`)
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('spreadsheet') || /\.(xlsx|xls|csv)(\?|$)/i.test(sourceUrl)) {
    return { url: sourceUrl, filename: filenameFromUrl(sourceUrl) || 'nace.xlsx' }
  }

  const html = await response.text()
  const matches = Array.from(html.matchAll(/href=["']([^"']+\.(?:xlsx|xls|csv)(?:\?[^"']*)?)["']/gi))
  const href = matches.find(match => /nace|rev|liste|meslek/i.test(match[1]))?.[1] || matches[0]?.[1]
  if (!href) throw new Error('Resmi sayfada indirilebilir XLSX/CSV NACE dosyası bulunamadı.')

  const url = new URL(href, sourceUrl).toString()
  return { url, filename: filenameFromUrl(url) || 'nace.xlsx' }
}

function filenameFromUrl(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
  } catch {
    return ''
  }
}

function parseCsv(text: string, options: ImportOptions) {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map(normalizeHeader)
  const codeIndex = findColumn(headers, options.columnMap?.code, CODE_COLUMN_CANDIDATES)
  const descIndex = findColumn(headers, options.columnMap?.description, DESCRIPTION_COLUMN_CANDIDATES)
  const hazardIndex = findColumn(headers, options.columnMap?.hazardClass, HAZARD_COLUMN_CANDIDATES)
  if (codeIndex < 0 || descIndex < 0) return []

  return lines.slice(1)
    .map(line => splitCsvLine(line))
    .map(cols => normalizeNaceRow(cols[codeIndex], cols[descIndex], hazardIndex >= 0 ? cols[hazardIndex] : '', options))
    .filter((row): row is NaceReferenceRow => !!row)
}

async function parseXlsx(buffer: Buffer, options: ImportOptions) {
  try {
    const xlsx: any = await import('xlsx')
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const parsedRows = workbook.SheetNames.flatMap((sheetName: string) => {
      const sheet = workbook.Sheets[sheetName]
      const objectRows = xlsx.utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>
      const fromObjects = objectRows.map(row => normalizeNaceJsonRow(row, options)).filter((row): row is NaceReferenceRow => !!row)
      if (fromObjects.length > 0) return fromObjects

      const matrixRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
      return normalizeNaceMatrixRows(matrixRows, options)
    })
    return dedupeRows(parsedRows)
  } catch {
    return []
  }
}

function normalizeNaceJsonRow(row: Record<string, unknown>, options: ImportOptions) {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]))
  const code = readMappedValue(normalized, options.columnMap?.code, CODE_COLUMN_CANDIDATES)
  const desc = readMappedValue(normalized, options.columnMap?.description, DESCRIPTION_COLUMN_CANDIDATES)
  const hazard = readMappedValue(normalized, options.columnMap?.hazardClass, HAZARD_COLUMN_CANDIDATES)
  return normalizeNaceRow(code, desc, hazard, options)
}

function normalizeNaceMatrixRows(rows: unknown[][], options: ImportOptions) {
  const headerRowIndex = rows.findIndex(row => {
    const headers = row.map(cell => normalizeHeader(String(cell || '')))
    return findColumn(headers, options.columnMap?.code, CODE_COLUMN_CANDIDATES) >= 0 &&
      findColumn(headers, options.columnMap?.description, DESCRIPTION_COLUMN_CANDIDATES) >= 0
  })
  if (headerRowIndex < 0) return []

  const headers = rows[headerRowIndex].map(cell => normalizeHeader(String(cell || '')))
  const codeIndex = findColumn(headers, options.columnMap?.code, CODE_COLUMN_CANDIDATES)
  const descIndex = findColumn(headers, options.columnMap?.description, DESCRIPTION_COLUMN_CANDIDATES)
  const hazardIndex = findColumn(headers, options.columnMap?.hazardClass, HAZARD_COLUMN_CANDIDATES)
  if (codeIndex < 0 || descIndex < 0) return []

  return rows.slice(headerRowIndex + 1)
    .map(row => normalizeNaceRow(row[codeIndex], row[descIndex], hazardIndex >= 0 ? row[hazardIndex] : '', options))
    .filter((row): row is NaceReferenceRow => !!row)
}

function normalizeNaceRow(codeValue: unknown, descriptionValue: unknown, hazardValue: unknown, options: ImportOptions): NaceReferenceRow | null {
  const nace_code = normalizeNaceCode(codeValue)
  const description = String(descriptionValue || '').trim()
  const hazard_class = normalizeHazardClass(hazardValue) || options.defaultHazardClass || 'Az Tehlikeli'
  if (!/^\d{2}(\.\d{1,2}){0,2}$/.test(nace_code) || !description || !hazard_class) return null
  return {
    nace_code,
    description,
    hazard_class,
    source_name: options.sourceName,
    source_url: options.sourceUrl || null,
    source_reference: options.sourceReference || null,
  }
}

function normalizeNaceCode(value: unknown) {
  const text = String(value || '').trim().replace(',', '.')
  const dotted = text.match(/\d{2}(?:\.\d{1,2}){0,2}/)?.[0]
  if (dotted) return dotted

  const digits = text.replace(/\D/g, '')
  if (/^\d{6}$/.test(digits)) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 6)}`
  if (/^\d{4}$/.test(digits)) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}`
  if (/^\d{2}$/.test(digits)) return digits
  return ''
}

function normalizeHazardClass(value: unknown): NaceReferenceRow['hazard_class'] | null {
  const text = normalizeHeader(String(value || ''))
  if (text === 'az tehlikeli') return 'Az Tehlikeli'
  if (text === 'tehlikeli') return 'Tehlikeli'
  if (text === 'cok tehlikeli' || text === 'çok tehlikeli') return 'Çok Tehlikeli'
  return null
}

async function getDefaultHazardClass(supabase: SupabaseClient): Promise<NaceReferenceRow['hazard_class']> {
  const fallback = normalizeHazardClass(systemParameterDefaultValue('nace.default_hazard_class')) || 'Az Tehlikeli'
  const { data } = await supabase
    .from('system_parameters')
    .select('value')
    .eq('parameter_key', 'nace.default_hazard_class')
    .maybeSingle()
  return normalizeHazardClass((data as any)?.value?.value) || fallback
}

async function buildFallbackNaceRows(supabase: SupabaseClient): Promise<NaceReferenceRow[]> {
  const defaultHazardClass = await getDefaultHazardClass(supabase)
  const records = Array.isArray(FALLBACK_NACE_PAYLOAD.records) ? FALLBACK_NACE_PAYLOAD.records : []

  return records
    .map<NaceReferenceRow>(record => ({
      nace_code: normalizeNaceCode(record.nace_code),
      description: String(record.description || '').trim(),
      hazard_class: defaultHazardClass,
      source_name: FALLBACK_NACE_PAYLOAD.sourceName || 'Yerel NACE referans listesi',
      source_url: FALLBACK_NACE_PAYLOAD.sourceUrl || null,
      source_reference: FALLBACK_NACE_PAYLOAD.sourceReference || null,
    }))
    .filter(row => /^\d{2}(\.\d{1,2}){0,2}$/.test(row.nace_code) && !!row.description)
}

function filterFallbackRows(rows: NaceReferenceRow[], queryText?: string | null) {
  const needles = normalizeFallbackSearchTerms(queryText)
  if (needles.length === 0) return rows
  return rows.filter(row => {
    const haystack = normalizeHeader(`${row.nace_code} ${row.description}`)
    return needles.every(needle => haystack.includes(needle))
  })
}

function normalizeFallbackSearchTerms(queryText?: string | null) {
  const normalizedText = String(queryText || '').normalize('NFKC').trim()
  if (!normalizedText) return []

  const seen = new Set<string>()
  const terms: string[] = []

  for (const part of normalizedText.split(/[\s,;:!?()\[\]{}"'\u2018\u2019\u201c\u201d`~@#$%^&*+=<>\\|\/]+/)) {
    const term = normalizeHeader(part.replace(/^[-.]+|[-.]+$/g, '').replace(/[%_]/g, ''))
    if (!term || seen.has(term)) continue
    seen.add(term)
    terms.push(term)
    if (terms.length >= 6) break
  }

  return terms
}

function findColumn(headers: string[], explicit: string | undefined, candidates: string[]) {
  if (explicit) {
    const index = headers.indexOf(normalizeHeader(explicit))
    if (index >= 0) return index
  }
  return headers.findIndex(header => candidates.map(normalizeHeader).includes(header))
}

function readMappedValue(row: Record<string, unknown>, explicit: string | undefined, candidates: string[]) {
  if (explicit && normalizeHeader(explicit) in row) return row[normalizeHeader(explicit)]
  const normalizedCandidates = candidates.map(normalizeHeader)
  const key = normalizedCandidates.find(candidate => candidate in row)
  return key ? row[key] : ''
}

function splitCsvLine(line: string) {
  const delimiter = line.includes(';') ? ';' : ','
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
}

function dedupeRows(rows: NaceReferenceRow[]) {
  return Array.from(new Map(rows.map(row => [row.nace_code, row])).values())
}
