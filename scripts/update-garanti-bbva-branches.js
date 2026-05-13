const fs = require('fs')
const https = require('https')
const path = require('path')
const { randomUUID } = require('crypto')
const { TextDecoder } = require('util')

const CONFIG_URL = 'https://webforms.garantibbva.com.tr/iban-inquiry-app-v2/config'
const BRANCH_LIST_URL = 'https://customers.garantibbva.com.tr/internet/digitalpublic/iban-inquiry-public/v1/branch-list'
const OUTPUT_PATH = path.join(__dirname, '..', 'lib', 'data', 'garanti-bbva-branches.json')

function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume()
          getJson(new URL(response.headers.location, url).toString(), headers).then(resolve, reject)
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
          try {
            const contentType = String(response.headers['content-type'] || '')
            const charset = contentType.match(/charset=([^;\s]+)/i)?.[1] || 'utf-8'
            const text = new TextDecoder(charset).decode(Buffer.concat(chunks))
            resolve(JSON.parse(text.replace(/^\uFEFF/, '')))
          } catch (error) {
            reject(error)
          }
        })
      })
      .on('error', reject)
  })
}

function arkHeaders() {
  const traceId = randomUUID()

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    channel: 'Internet',
    ip: '127.0.0.1',
    dialect: 'TR',
    guid: traceId,
    'tenant-company-id': 'GAR',
    'x-client-trace-id': traceId,
    'client-type': 'ArkClient',
    'client-id': '0dwrZbdF4kXhsL9PIShU',
    'tenant-geolocation': 'TUR',
  }
}

async function main() {
  const config = await getJson(CONFIG_URL)
  const configuredBranchListUrl = config?.app_properties?.common?.allBranchListPath || BRANCH_LIST_URL
  const branchList = await getJson(configuredBranchListUrl, arkHeaders())

  const branches = Object.fromEntries(
    branchList
      .map((branch) => [String(Number(branch.code)), String(branch.name || '').trim()])
      .filter(([code, name]) => code !== 'NaN' && name)
      .sort(([a], [b]) => Number(a) - Number(b))
  )

  const payload = {
    sources: [
      {
        key: 'garantiIbanInquiryConfig',
        name: 'Garanti BBVA IBAN Sorgulama uygulama konfigürasyonu',
        url: CONFIG_URL,
      },
      {
        key: 'garantiIbanBranchList',
        name: 'Garanti BBVA IBAN Sorgulama şube listesi',
        url: configuredBranchListUrl,
      },
    ],
    generatedAt: new Date().toISOString(),
    branches,
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${Object.keys(branches).length} Garanti BBVA branch codes to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
