const fs = require('fs')
const path = require('path')

const STRICT_ROUTES = new Set([
  '/app/development/temalarimiz',
  '/app/ik/calisanlar',
])

const STANDARD_DEBT_BASELINE = new Set([
  '/app/crm/firsatlar',
  '/app/crm/leadler',
  '/app/crm/paydaslar',
  '/app/crm/pipeline',
  '/app/crm/pipeline-ayarlari',
  '/app/crm/takipler',
  '/app/gorev-ve-proje-yonetimi',
  '/app/gorev-ve-proje-yonetimi/backlog',
  '/app/gorev-ve-proje-yonetimi/gorevler',
  '/app/gorev-ve-proje-yonetimi/is-akislari',
  '/app/gorev-ve-proje-yonetimi/kanban-board',
  '/app/gorev-ve-proje-yonetimi/projeler',
  '/app/gorev-ve-proje-yonetimi/raporlar',
  '/app/gorev-ve-proje-yonetimi/sprintler',
  '/app/gorev-ve-proje-yonetimi/takvim',
  '/app/gorev-ve-proje-yonetimi/zaman-takibi',
  '/app/muhasebe',
  '/app/muhasebe/banka-hesaplari-ve-kartlari',
  '/app/muhasebe/banka-kart-hareketleri',
  '/app/muhasebe/cari-hareketler',
  '/app/muhasebe/cari-kartlar',
  '/app/muhasebe/hesap-ve-kart-hareketleri',
  '/app/muhasebe/on-muhasebe-hareketleri',
  '/app/satis-sonrasi',
  '/app/satis-sonrasi/bakimi-gelenler',
  '/app/satis-sonrasi/bakim-planlari',
  '/app/satis-sonrasi/bakim-sozlesme-takip',
  '/app/satis-sonrasi/checklistler',
  '/app/satis-sonrasi/garanti-takip',
  '/app/satis-sonrasi/kurulu-urunler',
  '/app/satis-sonrasi/lisans-takip',
  '/app/satis-sonrasi/mobil-servis/[assignment_id]',
  '/app/satis-sonrasi/musterideki-urunler',
  '/app/satis-sonrasi/saha-gorevleri',
  '/app/satis-sonrasi/servis-destek-kayitlari',
  '/app/satis-sonrasi/servis-kayitlari',
  '/app/satis-sonrasi/servis-talepleri',
  '/app/urun-ve-hizmetler',
  '/app/urun-ve-hizmetler/bakim-paketleri',
  '/app/urun-ve-hizmetler/garanti-sablonlari',
  '/app/urun-ve-hizmetler/hizmet-kartlari',
  '/app/urun-ve-hizmetler/katalog',
  '/app/urun-ve-hizmetler/lisans-abonelik-urunleri',
  '/app/urun-ve-hizmetler/seri-numarali-urunler',
  '/app/urun-ve-hizmetler/urun-kartlari',
])

const REQUIRED_STANDARD_COMPONENTS = [
  'EdenPageShell',
  'EdenListPageShell',
  'EdenSmartList',
  'EdenFormShell',
  'EdenFormHeader',
  'EdenFormHero',
  'EdenHeroImageUploader',
  'EdenHeroDocumentUploader',
  'EdenFormTabs',
  'EdenFormActionBar',
  'EdenStatusActionButton',
  'EdenCompactFieldGrid',
  'EdenTokenTable',
  'EdenWizardShell',
]

const errors = []
const warnings = []
const componentSourcePath = path.join('components', 'ui', 'eden-standard.tsx')
const componentSource = fs.readFileSync(componentSourcePath, 'utf8')
const pages = walk('app').filter(file => file.endsWith(`${path.sep}page.tsx`) || file === path.join('app', 'page.tsx'))

for (const component of REQUIRED_STANDARD_COMPONENTS) {
  if (!componentSource.includes(`function ${component}`)) {
    errors.push(`${componentSourcePath} missing ${component}`)
  }
}

for (const file of pages) {
  const source = fs.readFileSync(file, 'utf8')
  const route = pageRoute(file)
  const strict = STRICT_ROUTES.has(route)

  const hasListSignal = /PageBanner|SmartDataTable|<table\b|EdenSmartList/.test(source)
  const hasFormSignal = /<form\b|Kaydet|Save|FormHeader|EdenFormShell|activeTab|TextField|TextArea/.test(source)
  const hasWizardSignal = /<Wizard|WizardSteps|stepper|currentStep|activeStep|EdenWizardShell/.test(source)

  const hasListShell = /EdenListPageShell/.test(source) && /EdenSmartList/.test(source)
  const hasFormHeader = /EdenFormHeader/.test(source)
  const hasFormHero = /EdenFormHero/.test(source) || /data-eden-standard=["']form-hero["']/.test(source)
  const hasFormActionBar = /EdenFormActionBar|data-eden-standard=["']form-action-bar["']/.test(source)
  const hasFormShell = /EdenFormShell/.test(source) && hasFormHeader && hasFormHero
  const hasTabs = !/activeTab|setActiveTab|const \[tab/.test(source) || /EdenFormTabs/.test(source)
  const hasWizardShell = !hasWizardSignal || /EdenWizardShell/.test(source)
  const saveMatches = source.match(/Kaydet|Kaydediliyor|Save/g) || []
  const hasSavePlacement = saveMatches.length === 0 || hasFormHeader || hasFormActionBar
  const hasStatusStandard = !/Aktifle|Pasife Al|Onayla|Arsiv|Yeni Versiyon|Incelemeye/.test(source) || /EdenStatusActionButton/.test(source)
  const uploaderViolation = /<ImageSlotUploader|<DocumentSlotUploader/.test(source)
  const heroLongHelpWarning = strict && hasFormHero && /EdenFormHero[\s\S]{0,2200}(Aktivasyon|V2 tema|dokumantasyon)/i.test(source)
  const uploadButtonViolation = strict
    && /<button[^>]*(Upload|Yukle|Indir|Download)|<[^>]*>\s*(Upload|Yukle|Indir|Download)/.test(source)
    && !/EdenHeroImageUploader|EdenHeroDocumentUploader/.test(source)

  if (strict) {
    if (hasListSignal && !hasListShell) errors.push(`${route} must use EdenListPageShell + EdenSmartList (${file})`)
    if (hasFormSignal && !hasFormShell) errors.push(`${route} must use EdenFormShell + EdenFormHeader + EdenFormHero (${file})`)
    if (!hasTabs) errors.push(`${route} tabbed form content must use EdenFormTabs (${file})`)
    if (!hasWizardShell) errors.push(`${route} wizard content must use EdenWizardShell (${file})`)
    if (!hasSavePlacement) errors.push(`${route} has non-standard save placement (${file})`)
    if (!hasStatusStandard) errors.push(`${route} has non-standard status/lifecycle action placement (${file})`)
    if (uploaderViolation) errors.push(`${route} must use EdenHeroImageUploader/EdenHeroDocumentUploader, not raw slot uploaders (${file})`)
    if (uploadButtonViolation) errors.push(`${route} has upload/download action outside hero uploader (${file})`)
    if (heroLongHelpWarning) warnings.push(`${route} form hero contains long technical/help copy; move it to tabs, tooltip, or docs (${file})`)
  } else if ((hasListSignal || hasFormSignal || hasWizardSignal) && route.startsWith('/app') && !STANDARD_DEBT_BASELINE.has(route)) {
    const deviations = []
    if (hasListSignal && !hasListShell) deviations.push('list shell')
    if (hasFormSignal && !hasFormShell) deviations.push('form shell')
    if (hasWizardSignal && !hasWizardShell) deviations.push('wizard shell')
    if (deviations.length && process.env.EDEN_FRONTEND_STANDARD_REPORT_DEBT === '1') {
      warnings.push(`${route} has pending standardization debt: ${deviations.join(', ')}`)
    }
  }
}

console.log('Frontend standard contract check')
console.log(`Pages scanned: ${pages.length}`)
console.log(`Strict routes: ${STRICT_ROUTES.size}`)
console.log(`Baseline debt routes: ${STANDARD_DEBT_BASELINE.size}`)
console.log(`Warnings: ${warnings.length}`)
console.log(`Errors: ${errors.length}`)

for (const warning of warnings.slice(0, 20)) console.warn(`WARNING ${warning}`)
if (warnings.length > 20) console.warn(`WARNING ... ${warnings.length - 20} additional standardization debt warnings omitted`)

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`)
  process.exit(1)
}

function walk(root) {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return [fullPath]
  })
}

function pageRoute(file) {
  const normalized = file.split(path.sep).join('/')
  const withoutApp = normalized.replace(/^app/, '')
  const route = withoutApp.replace(/\/page\.tsx$/, '') || '/'
  return route || '/'
}
