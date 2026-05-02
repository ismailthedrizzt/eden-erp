const fs = require('fs')
const https = require('https')
const path = require('path')
const { PDFParse } = require('pdf-parse')

const TBB_SOURCE_URL = 'https://www.tbb.org.tr/sites/default/files/kitaplar/bankalarimiz-2024_0.pdf'
const IBAN_GEN_SOURCE_URL = 'https://iban.gen.tr/bankalar'
const OUTPUT_PATH = path.join(__dirname, '..', 'lib', 'data', 'turkish-bank-codes.json')

const LOGO_OVERRIDES = {
  '00010': 'ZB',
  '00012': 'HB',
  '00015': 'VB',
  '00032': 'TEB',
  '00046': 'AK',
  '00062': 'GB',
  '00064': 'IS',
  '00067': 'YK',
  '00099': 'ING',
  '00111': 'QNB',
  '00203': 'AL',
  '00205': 'KT',
  '00206': 'TF',
  '00209': 'ZK',
  '00210': 'VK',
  '00211': 'EK',
}

const DOMAIN_OVERRIDES = {
  '00010': 'ziraatbank.com.tr',
  '00012': 'halkbank.com.tr',
  '00015': 'vakifbank.com.tr',
  '00032': 'teb.com.tr',
  '00046': 'akbank.com',
  '00062': 'garantibbva.com.tr',
  '00064': 'isbank.com.tr',
  '00067': 'yapikredi.com.tr',
  '00099': 'ing.com.tr',
  '00111': 'qnb.com.tr',
  '00203': 'albaraka.com.tr',
  '00205': 'kuveytturk.com.tr',
  '00206': 'turkiyefinans.com.tr',
  '00209': 'ziraatkatilim.com.tr',
  '00210': 'vakifkatilim.com.tr',
  '00211': 'emlakkatilim.com.tr',
}

const SOURCE_NAME_BY_KEY = {
  tbb2024: 'Türkiye Bankalar Birliği - Bankalarımız 2024',
  ibanGenTr: 'IBAN.gen.tr - Bankalar',
}

const CORRECTIONS = {
  '00121': { name: 'Standard Chartered Yatırım Bankası Türk A.Ş.', swift: 'SCBLTRIS' },
  '00142': { name: 'BankPozitif Kredi ve Kalkınma Bankası A.Ş.', swift: 'BPTRTRIS' },
}

const SUPPLEMENTAL_BANKS = {
  '00203': { name: 'Albaraka Türk Katılım Bankası A.Ş.', sourceKey: 'ibanGenTr' },
  '00205': { name: 'Kuveyt Türk Katılım Bankası A.Ş.', sourceKey: 'ibanGenTr' },
  '00206': { name: 'Türkiye Finans Katılım Bankası A.Ş.', sourceKey: 'ibanGenTr' },
  '00209': { name: 'Ziraat Katılım Bankası A.Ş.', sourceKey: 'ibanGenTr' },
  '00210': { name: 'Vakıf Katılım Bankası A.Ş.', sourceKey: 'ibanGenTr' },
  '00211': { name: 'Türkiye Emlak Katılım Bankası A.Ş.', sourceKey: 'ibanGenTr' },
}

function padEftCode(code) {
  return String(code).replace(/\D/g, '').padStart(5, '0')
}

function logoText(name, code) {
  if (LOGO_OVERRIDES[code]) return LOGO_OVERRIDES[code]

  return name
    .replace(/\b(A\.Ş\.|T\.A\.O\.|Bankası|Bank|Türk|Türkiye|Cumhuriyeti|Katılım|Yatırım|Kalkınma|ve)\b/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3) || '?'
}

function upsertBank(banks, code, bank) {
  const domain = bank.domain || banks[code]?.domain || DOMAIN_OVERRIDES[code]
  banks[code] = {
    name: bank.name,
    swift: bank.swift || banks[code]?.swift,
    domain,
    logoUrl: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : undefined,
    logoText: logoText(bank.name, code),
    source: SOURCE_NAME_BY_KEY[bank.sourceKey],
  }
}

function extractDomain(value) {
  if (!value) return undefined
  const raw = value.startsWith('http') ? value : `https://${value}`

  try {
    return new URL(raw).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
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
        response.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

async function parseTbbPdf() {
  const pdfBuffer = await download(TBB_SOURCE_URL)
  const parser = new PDFParse({ data: pdfBuffer })
  const result = await parser.getText()
  await parser.destroy()

  const banks = {}
  const lines = result.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  for (let index = 0; index < lines.length; index += 1) {
    const joined = [lines[index], lines[index + 1], lines[index + 2]].filter(Boolean).join(' ')
    const match = joined.match(/^(.+?)\s+([A-Z0-9-]{1,8})\s+(\d{4})\s+((?:https?:\/\/|www\.)\S+)/)
    if (!match) continue

    const [, name, swift, rawCode, website] = match
    const code = padEftCode(rawCode)
    upsertBank(banks, code, {
      name: name.replace(/\s+/g, ' ').trim(),
      swift: swift === '-' ? undefined : swift,
      domain: extractDomain(website),
      sourceKey: 'tbb2024',
    })
  }

  for (const [code, correction] of Object.entries(CORRECTIONS)) {
    upsertBank(banks, code, { ...banks[code], ...correction, sourceKey: 'tbb2024' })
  }

  return banks
}

async function parseIbanGenTr() {
  const html = (await download(IBAN_GEN_SOURCE_URL)).toString('utf8')
  const banks = {}
  const regex = /####\s+(?:<[^>]+>)?([^<\n]+)(?:<\/a>)?[\s\S]*?EFT Kodu:\s*(\d+)/g
  let match

  while ((match = regex.exec(html)) !== null) {
    const code = padEftCode(match[2])
    const name = match[1].replace(/\s+/g, ' ').trim()
    upsertBank(banks, code, { name, sourceKey: 'ibanGenTr' })
  }

  return banks
}

async function main() {
  const banks = await parseTbbPdf()

  try {
    const ibanGenBanks = await parseIbanGenTr()
    for (const code of Object.keys(SUPPLEMENTAL_BANKS)) {
      upsertBank(banks, code, { ...SUPPLEMENTAL_BANKS[code], ...ibanGenBanks[code] })
    }
  } catch (error) {
    for (const [code, bank] of Object.entries(SUPPLEMENTAL_BANKS)) {
      upsertBank(banks, code, bank)
    }
  }

  const payload = {
    sources: [
      {
        key: 'tbb2024',
        name: SOURCE_NAME_BY_KEY.tbb2024,
        url: TBB_SOURCE_URL,
        note: 'EFT kodları kamuya açık TBB Bankalarımız 2024 PDF tablosundan parse edilir.',
      },
      {
        key: 'ibanGenTr',
        name: SOURCE_NAME_BY_KEY.ibanGenTr,
        url: IBAN_GEN_SOURCE_URL,
        note: 'Katılım bankaları için açık web listesi tamamlayıcı kaynak olarak kullanılır.',
      },
    ],
    generatedAt: new Date().toISOString(),
    banks: Object.fromEntries(Object.entries(banks).sort(([a], [b]) => a.localeCompare(b))),
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${Object.keys(payload.banks).length} bank codes to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
