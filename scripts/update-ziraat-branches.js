const fs = require('fs')
const https = require('https')
const path = require('path')
const { TextDecoder } = require('util')

const SOURCE_URL = 'https://tr.ibanvalidator.com/support/bank/1/trkiye-cumhuriyeti-ziraat-bankas-a.html'
const OUTPUT_PATH = path.join(__dirname, '..', 'lib', 'data', 'ziraat-branches.json')

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Accept: 'text/html' } }, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume()
          download(new URL(response.headers.location, url).toString()).then(resolve, reject)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: ${response.statusCode} ${url}`))
          response.resume()
          return
        }

        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          const contentType = String(response.headers['content-type'] || '')
          const charset = contentType.match(/charset=([^;\s]+)/i)?.[1] || 'utf-8'
          resolve(new TextDecoder(charset).decode(Buffer.concat(chunks)))
        })
      })
      .on('error', reject)
  })
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

async function main() {
  const html = await download(SOURCE_URL)
  const rowPattern = /<code[^>]*>\s*(\d{5})\s*<\/code>\s*<\/td>\s*<td[^>]*>[\s\S]*?<\/i>\s*([\s\S]*?)\s*<\/td>/g
  const branches = {}

  for (const match of html.matchAll(rowPattern)) {
    const code = String(Number(match[1]))
    const name = decodeHtml(match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    if (code !== 'NaN' && name) branches[code] = name
  }

  const payload = {
    sources: [
      {
        key: 'ibanValidatorZiraatBranches',
        name: 'IBAN Validator - Turkiye Cumhuriyeti Ziraat Bankasi A.S. sube listesi',
        url: SOURCE_URL,
      },
    ],
    generatedAt: new Date().toISOString(),
    branches: Object.fromEntries(Object.entries(branches).sort(([a], [b]) => Number(a) - Number(b))),
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${Object.keys(branches).length} Ziraat branch codes to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
