const fs = require('fs')
const https = require('https')
const path = require('path')

const SOURCE_BASE = 'https://raw.githubusercontent.com/onurusluca/turkey-geo-api/main/data/jsonl'
const OUTPUT_PATH = path.join(__dirname, '..', 'lib', 'data', 'turkey-locations.json')

function getText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'eden-erp-reference-updater' } }, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume()
          getText(new URL(response.headers.location, url).toString()).then(resolve, reject)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Fetch failed: ${response.statusCode} ${url}`))
          response.resume()
          return
        }

        let data = ''
        response.setEncoding('utf8')
        response.on('data', chunk => { data += chunk })
        response.on('end', () => resolve(data))
      })
      .on('error', reject)
  })
}

function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line))
}

function toTitleCase(value) {
  return value.toLocaleLowerCase('tr-TR').replace(/(^|\s|-)(\p{L})/gu, (_, prefix, char) => `${prefix}${char.toLocaleUpperCase('tr-TR')}`)
}

async function main() {
  const provinces = parseJsonl(await getText(`${SOURCE_BASE}/provinces.jsonl`))
    .map(province => ({
      id: province.id,
      name: toTitleCase(province.name),
      officialName: province.full_official_name,
      districts: [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'))

  for (const province of provinces) {
    const districts = parseJsonl(await getText(`${SOURCE_BASE}/province-${province.id}/districts.jsonl`))
      .map(district => ({
        id: district.id,
        name: toTitleCase(district.name),
        officialName: district.full_official_name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))

    province.districts = districts
  }

  const payload = {
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

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${provinces.length} provinces and ${provinces.reduce((total, province) => total + province.districts.length, 0)} districts to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
