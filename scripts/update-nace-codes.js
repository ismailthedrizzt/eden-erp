const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')

const SOURCE_URL = 'https://ticaret.gov.tr/data/5d418c7e13b87639ac9dffe0/Esnaf%20ve%20Sanatk%C3%A2r%20NACE%20Kodlar%C4%B1%20ve%20Meslek%20Listesi%2029.01.2026.xlsx'
const SOURCE_REFERENCE = 'https://esnafkoop.ticaret.gov.tr/duyurular/esnaf-ve-sanatkar-meslek-kollari-ve-nace-listesi-guncellendi'
const OUTPUT_PATH = path.join(__dirname, '..', 'lib', 'data', 'nace-codes.json')

function normalizeNaceCode(value) {
  const text = String(value || '').trim().replace(',', '.')
  const dotted = text.match(/\d{2}(?:\.\d{1,2}){0,2}/)?.[0]
  if (dotted) return dotted

  const digits = text.replace(/\D/g, '')
  if (/^\d{6}$/.test(digits)) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 6)}`
  if (/^\d{4}$/.test(digits)) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}`
  if (/^\d{2}$/.test(digits)) return digits
  return ''
}

function readFirst(row, keys) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim()) return value
  }
  return ''
}

async function main() {
  const response = await fetch(SOURCE_URL, { cache: 'no-store' })
  if (!response.ok) throw new Error(`NACE source failed: HTTP ${response.status}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  const workbook = xlsx.read(buffer, { type: 'buffer' })
  const rows = workbook.SheetNames.flatMap(sheetName =>
    xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
  )

  const records = []
  const seen = new Set()
  for (const row of rows) {
    const naceCode = normalizeNaceCode(readFirst(row, ['NACE REV. 2.1 KODU ', 'NACE REV.2.1 KODU', 'NACE KODU']))
    const description = String(readFirst(row, ['NACE REV.2.1 TANIM', 'NACE TANIMI', 'FAALIYET TANIMI'])).trim()
    if (!/^\d{2}(\.\d{1,2}){0,2}$/.test(naceCode) || !description || seen.has(naceCode)) continue
    records.push({ nace_code: naceCode, description })
    seen.add(naceCode)
  }

  records.sort((a, b) => a.nace_code.localeCompare(b.nace_code, 'tr'))
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(
    OUTPUT_PATH,
    `${JSON.stringify({
      sourceName: 'Ticaret Bakanligi Esnaf ve Sanatkar NACE Kodlari ve Meslek Listesi',
      sourceUrl: SOURCE_URL,
      sourceReference: SOURCE_REFERENCE,
      generatedAt: new Date().toISOString(),
      records,
    }, null, 2)}\n`,
    'utf8'
  )
  console.log(`Wrote ${records.length} NACE rows to ${OUTPUT_PATH}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
