const fs = require('fs')
const { execSync } = require('child_process')

const CONTRACT_OVERRIDES_MARKDOWN_STANDARD = 'contract overrides markdown'

const auditExactAllowlist = new Set([
  'docs/audit/PageFlowContractAuditReport.md',
])

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

function classify(file) {
  if (file.startsWith('docs/archive/')) return 'archive'
  if (file.startsWith('docs/ai-context/')) return 'ai_context'
  if (auditExactAllowlist.has(file)) return 'source_of_truth'
  if (allowedExact.has(file)) return 'source_of_truth'
  if (allowedPrefixes.some((prefix) => file.startsWith(prefix)) && !file.startsWith('docs/archive/') && !file.startsWith('docs/ai-context/')) return 'source_of_truth'
  return 'unclassified'
}

function sectionBody(text, heading) {
  const pattern = new RegExp('^## ' + heading + '\\s*$', 'm')
  const match = pattern.exec(text)
  if (!match) return null
  const start = match.index + match[0].length
  const rest = text.slice(start)
  const next = rest.search(/^## /m)
  return (next === -1 ? rest : rest.slice(0, next)).trim()
}

function validateAiContext(file, text, errors) {
  const contracts = sectionBody(text, 'Related Contracts')
  const guards = sectionBody(text, 'Related Guards')
  if (!contracts) errors.push(file + ': AI context docs must include a Related Contracts section')
  else if (!/contracts(\/|\*\*|\b)/.test(contracts)) errors.push(file + ': Related Contracts must reference at least one contracts/** source')
  if (!guards) errors.push(file + ': AI context docs must include a Related Guards section')
  else if (!/(scripts\/|npm run )/.test(guards)) errors.push(file + ': Related Guards must reference at least one guard script or npm guard command')
}

const files = listMarkdownFiles()
const errors = []
for (const file of files) {
  if (file.startsWith('docs/audit/') && !auditExactAllowlist.has(file)) {
    errors.push(file + ': docs/audit outside docs/archive/** is restricted to the exact audit allowlist')
    continue
  }
  if (forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) {
    errors.push(file + ': historical/legacy Markdown must live under docs/archive/** or be normalized into docs/ai-context/**')
    continue
  }
  if (!isAllowed(file)) {
    errors.push(file + ': Markdown has no approved source-of-truth location')
    continue
  }
  const text = fs.readFileSync(file, 'utf8')
  const classification = classify(file)
  if (classification === 'ai_context') validateAiContext(file, text, errors)
  if (classification === 'source_of_truth' && !text.includes(CONTRACT_OVERRIDES_MARKDOWN_STANDARD)) {
    errors.push(file + ': source-of-truth Markdown must include ' + CONTRACT_OVERRIDES_MARKDOWN_STANDARD)
  }
}

const counts = files.reduce((acc, file) => {
  const bucket = file.startsWith('docs/archive/') ? 'archive' : file.startsWith('docs/ai-context/') ? 'ai_context' : 'source_of_truth'
  acc[bucket] = (acc[bucket] || 0) + 1
  return acc
}, {})

console.log('Documentation source-of-truth guard')
console.log('- markdown files scanned: ' + files.length)
console.log('- source-of-truth docs: ' + (counts.source_of_truth || 0))
console.log('- ai-context docs: ' + (counts.ai_context || 0))
console.log('- archived docs: ' + (counts.archive || 0))
console.log('- audit allowlist entries: ' + auditExactAllowlist.size)
console.log('- errors: ' + errors.length)

if (errors.length > 0) {
  console.error('\nDocumentation source-of-truth errors:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
