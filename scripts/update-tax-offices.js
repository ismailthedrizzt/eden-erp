const fs = require('fs')
const path = require('path')
const { PDFParse } = require('pdf-parse')

const SOURCE_URL = 'https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2FDefterdarl%C4%B1kveVergiDaireleriListesi.pdf'
const OUT_PATH = path.join(__dirname, '..', 'lib', 'data', 'tax-offices.json')
const LOCATIONS_PATH = path.join(__dirname, '..', 'lib', 'data', 'turkey-locations.json')

async function main() {
  const response = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'eden-erp-reference-updater' },
  })

  if (!response.ok) {
    throw new Error(`GIB tax office list fetch failed: ${response.status}`)
  }

  const parser = new PDFParse({ data: Buffer.from(await response.arrayBuffer()) })
  const result = await parser.getText()
  await parser.destroy()

  const provinceNames = JSON.parse(fs.readFileSync(LOCATIONS_PATH, 'utf8'))
    .provinces
    .map(province => province.name.toLocaleUpperCase('tr-TR'))
    .sort((a, b) => b.length - a.length)

  const offices = []
  const lines = result.text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

  for (const line of lines) {
    const prefix = line.match(/^(\d{2})\s+(.+)$/)
    if (!prefix) continue

    const cityCode = prefix[1]
    const rest = prefix[2]
    const province = provinceNames.find(name => rest.startsWith(`${name} `))
    if (!province) continue

    const afterProvince = rest.slice(province.length).trim()
    const coded = afterProvince.match(/^(.+?)\s+(\d{5})\s+(.+)$/)
    const uncoded = afterProvince.match(/^(.+?)\s+(.+(?:Şubesi|Malmüdürlüğü|Vergi Dairesi Müdürlüğü))$/)

    const district = (coded?.[1] || uncoded?.[1] || '').replace(/\s+\(\*\*\)/g, '').trim()
    const code = coded?.[2] || null
    const name = (coded?.[3] || uncoded?.[2] || '').trim()

    if (!district || !name) continue

    offices.push({
      id: code || `${cityCode}-${slugify(district)}-${slugify(name)}`,
      code,
      name,
      province,
      district,
    })
  }

  const payload = {
    source: {
      name: 'Gelir İdaresi Başkanlığı - Defterdarlık ve Vergi Daireleri Listesi',
      url: SOURCE_URL,
    },
    generatedAt: new Date().toISOString(),
    offices,
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`wrote ${offices.length} tax offices`)
}

function slugify(value) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
