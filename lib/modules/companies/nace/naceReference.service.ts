import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

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
  columnMap?: {
    code?: string
    description?: string
    hazardClass?: string
  }
}

const TRUSTED_SOURCES = [
  {
    name: 'TÜRMOB İşyeri Tehlike Sınıfları Listesi 2025 PDF',
    url: 'https://www.turmob.org.tr/arsiv/mbs/pratikBilgiler/IS_TEHLIKE-26.01.2025.pdf',
    format: 'pdf',
  },
  {
    name: 'TOBB 2025 İşyeri Tehlike Sınıfları Duyurusu',
    url: 'https://www.tobb.org.tr/MaliveSosyalPolitikalar/Documents/duyurular/2025/T%C3%BCm%20Oda%20Borsalara%20Duyuru%20Yaz%C4%B1s%C4%B1.pdf',
    format: 'pdf',
  },
]

export class NaceReferenceImportService {
  constructor(private supabase: SupabaseClient) {}

  async importBuffer(buffer: Buffer, filename: string, options: ImportOptions) {
    const lower = filename.toLocaleLowerCase('tr-TR')
    const rows = lower.endsWith('.csv')
      ? parseCsv(buffer.toString('utf8'), options)
      : lower.endsWith('.xlsx')
        ? await parseXlsx(buffer, options)
        : []

    if (!rows.length) {
      await this.log('failed', options, 'NACE referans listesi oluşturulamadı. Lütfen admin tarafından resmi liste yükleyin.')
      return { imported: 0, updated: 0, rows: [] as NaceReferenceRow[], warning: 'NACE referans listesi oluşturulamadı. Lütfen admin tarafından resmi liste yükleyin.' }
    }

    const result = await this.upsertRows(rows)
    await this.log('success', options, 'NACE referans listesi içe aktarıldı.', result.imported, result.updated)
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
      raw_metadata: { sourceReference: options.sourceReference || null },
    })
  }
}

export class NaceReferenceUpdateService {
  constructor(private supabase: SupabaseClient) {}

  async updateFromTrustedSources() {
    const importService = new NaceReferenceImportService(this.supabase)

    for (const source of TRUSTED_SOURCES) {
      if (source.format === 'pdf') {
        await this.log('skipped', source, 'PDF kaynak güvenilir tablo olarak otomatik parse edilmedi; admin resmi XLSX/CSV yüklemelidir.')
        continue
      }

      try {
        const response = await fetch(source.url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = Buffer.from(await response.arrayBuffer())
        return importService.importBuffer(buffer, source.url, { sourceName: source.name, sourceUrl: source.url })
      } catch (error) {
        await this.log('failed', source, error instanceof Error ? error.message : 'Kaynak okunamadı')
      }
    }

    return {
      imported: 0,
      updated: 0,
      warning: 'NACE referans listesi oluşturulamadı. Lütfen admin tarafından resmi liste yükleyin.',
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

function parseCsv(text: string, options: ImportOptions) {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map(normalizeHeader)
  const codeIndex = findColumn(headers, options.columnMap?.code, ['nace kodu', 'nace rev.2_altili kod', 'altili kod', 'kod'])
  const descIndex = findColumn(headers, options.columnMap?.description, ['faaliyet tanimi', 'nace rev.2_altili tanim', 'tanim', 'aciklama'])
  const hazardIndex = findColumn(headers, options.columnMap?.hazardClass, ['tehlike sinifi', 'sinifi', 'ek-1 tehlike sinifi'])
  if (codeIndex < 0 || descIndex < 0 || hazardIndex < 0) return []

  return lines.slice(1)
    .map(line => splitCsvLine(line))
    .map(cols => normalizeNaceRow(cols[codeIndex], cols[descIndex], cols[hazardIndex], options))
    .filter((row): row is NaceReferenceRow => !!row)
}

async function parseXlsx(buffer: Buffer, options: ImportOptions) {
  try {
    const xlsx: any = await (new Function('specifier', 'return import(specifier)')('xlsx') as Promise<any>)
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>
    return rows
      .map(row => {
        const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]))
        const code = readMappedValue(normalized, options.columnMap?.code, ['nace kodu', 'nace rev.2_altili kod', 'altili kod', 'kod'])
        const desc = readMappedValue(normalized, options.columnMap?.description, ['faaliyet tanimi', 'nace rev.2_altili tanim', 'tanim', 'aciklama'])
        const hazard = readMappedValue(normalized, options.columnMap?.hazardClass, ['tehlike sinifi', 'sinifi', 'ek-1 tehlike sinifi'])
        return normalizeNaceRow(code, desc, hazard, options)
      })
      .filter((row): row is NaceReferenceRow => !!row)
  } catch {
    return []
  }
}

function normalizeNaceRow(codeValue: unknown, descriptionValue: unknown, hazardValue: unknown, options: ImportOptions): NaceReferenceRow | null {
  const nace_code = String(codeValue || '').trim()
  const description = String(descriptionValue || '').trim()
  const hazard_class = normalizeHazardClass(hazardValue)
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

function normalizeHazardClass(value: unknown): NaceReferenceRow['hazard_class'] | null {
  const text = normalizeHeader(String(value || ''))
  if (text === 'az tehlikeli') return 'Az Tehlikeli'
  if (text === 'tehlikeli') return 'Tehlikeli'
  if (text === 'cok tehlikeli') return 'Çok Tehlikeli'
  return null
}

function findColumn(headers: string[], explicit: string | undefined, candidates: string[]) {
  if (explicit) {
    const index = headers.indexOf(normalizeHeader(explicit))
    if (index >= 0) return index
  }
  return headers.findIndex(header => candidates.includes(header))
}

function readMappedValue(row: Record<string, unknown>, explicit: string | undefined, candidates: string[]) {
  if (explicit && normalizeHeader(explicit) in row) return row[normalizeHeader(explicit)]
  const key = candidates.find(candidate => candidate in row)
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
