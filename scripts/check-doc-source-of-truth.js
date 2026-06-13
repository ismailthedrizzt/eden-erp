const fs = require('fs')
const { execSync } = require('child_process')

const allowedExact = new Set([
  'README.md',
  'apps/api/README.md',
  'backend/README.md',
  'backend/migrations/README.md',
  'backend/app/workers/README.md',
  'docs/CONTRACT_BASED_STANDARDIZATION.md',
  'docs/STANDART_BILESENLER.md',
  'docs/UI_UX_DESIGN_RULES.md',
  'docs/audit/PageFlowContractAuditReport.md',
  'src/themes/hikmet/README.md',
])

const allowedPrefixes = [
  'components/ui/',
  'docs/ai-context/',
  'docs/archive/',
  'docs/architecture/',
  'docs/design/',
  'docs/field-test/',
  'docs/operations/',
  'docs/ownership-transactions/',
  'docs/pages/',
  'docs/pilot/',
  'docs/product/',
  'docs/release/',
  'docs/templates/',
]

const forbiddenPrefixes = [
  'docs/audit/',
  'docs/cleanup/',
  'docs/stabilization/',
  'lib/',
]

function listMarkdownFiles() {
  const output = execSync("git ls-files --cached --others --exclude-standard '*.md'", { encoding: 'utf8' }).trim()
  return output ? output.split(/\n/).filter(Boolean).filter((file) => fs.existsSync(file)).sort() : []
}

function isAllowed(file) {
  if (allowedExact.has(file)) return true
  return allowedPrefixes.some((prefix) => file.startsWith(prefix))
}

const files = listMarkdownFiles()
const errors = []
for (const file of files) {
  if (allowedExact.has(file)) continue
  if (forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) {
    errors.push(`${file}: historical/legacy Markdown must live under docs/archive/** or be normalized into docs/ai-context/**`)
    continue
  }
  if (!isAllowed(file)) {
    errors.push(`${file}: Markdown has no approved source-of-truth location`)
  }
}

const counts = files.reduce((acc, file) => {
  const bucket = file.startsWith('docs/archive/') ? 'archive' : file.startsWith('docs/ai-context/') ? 'ai_context' : 'source_of_truth'
  acc[bucket] = (acc[bucket] || 0) + 1
  return acc
}, {})

console.log('Documentation source-of-truth guard')
console.log(`- markdown files scanned: ${files.length}`)
console.log(`- source-of-truth docs: ${counts.source_of_truth || 0}`)
console.log(`- ai-context docs: ${counts.ai_context || 0}`)
console.log(`- archived docs: ${counts.archive || 0}`)
console.log(`- errors: ${errors.length}`)

if (errors.length > 0) {
  console.error('\nDocumentation source-of-truth errors:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
