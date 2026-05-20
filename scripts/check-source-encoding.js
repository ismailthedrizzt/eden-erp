const fs = require('fs')
const path = require('path')
const { TextDecoder } = require('util')

const root = path.resolve(__dirname, '..')
const strictUtf8Decoder = new TextDecoder('utf-8', { fatal: true })

const sourceRoots = ['app', 'components', 'docs', 'hooks', 'lib', 'scripts', 'supabase', 'types']
const rootFiles = [
  'BackendApiMigration.md',
  'FrontendDataAccessRules.md',
  'SupabaseUsagePolicy.md',
  'next.config.mjs',
  'package-lock.json',
  'package.json',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'tsconfig.json',
  'tsconfig.typecheck.json',
]
const textExtensions = new Set([
  '.css',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mjs',
  '.sql',
  '.ts',
  '.tsx',
])
const mojibakePattern = /[\uFFFD\u0080-\u009F\u00C2-\u00C5]|â(?:€|†|€¢|€¦|„|“|”|˜|‹|›|™|œ|ž|Ÿ)/

const replacementMojibakePattern = /\u00EF\u00BF\u00BD/

function filePath(relativePath) {
  return path.join(root, relativePath)
}

function exists(relativePath) {
  return fs.existsSync(filePath(relativePath))
}

function walkFiles(relativeDir, files = []) {
  const absoluteDir = filePath(relativeDir)
  if (!fs.existsSync(absoluteDir)) return files

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) continue
      walkFiles(relativePath, files)
      continue
    }

    if (textExtensions.has(path.extname(entry.name))) {
      files.push(relativePath.replace(/\\/g, '/'))
    }
  }

  return files
}

function assertValidUtf8(relativePath, failures) {
  try {
    strictUtf8Decoder.decode(fs.readFileSync(filePath(relativePath)))
  } catch {
    failures.push(`${relativePath}: source files must be saved as valid UTF-8`)
  }
}

function assertNoMojibake(relativePath, failures) {
  const content = fs.readFileSync(filePath(relativePath), 'utf8')
  const lines = content.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (mojibakePattern.test(line) || replacementMojibakePattern.test(line)) {
      failures.push(`${relativePath}:${index + 1}: possible mojibake/Turkish character corruption`)
    }
  })
}

const files = new Set()
for (const sourceRoot of sourceRoots) {
  for (const file of walkFiles(sourceRoot)) files.add(file)
}
for (const file of rootFiles) {
  if (exists(file)) files.add(file)
}

const failures = []
for (const file of [...files].sort()) {
  assertValidUtf8(file, failures)
  assertNoMojibake(file, failures)
}

if (failures.length) {
  console.error('Source encoding check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Source encoding check passed (${files.size} files).`)
