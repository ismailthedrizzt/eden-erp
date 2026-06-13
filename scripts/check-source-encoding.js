const fs = require('fs')
const path = require('path')

const root = process.cwd()
const failures = []
const warnings = []
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.py',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml',
])
const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.next-releases',
  '.turbo',
  'node_modules',
  '.venv',
  '__pycache__',
  'outputs',
  'dist',
  'build',
  'coverage',
])
const mojibakePatterns = [
  '\u00C4\u00B0',
  '\u00C4\u00B1',
  '\u00C4\u0178',
  '\u00C5\u0178',
  '\u00C5\u017D',
  '\u00C3\u00A7',
  '\u00C3\u2021',
  '\u00C3\u00B6',
  '\u00C3\u2013',
  '\u00C3\u00BC',
  '\u00C3\u0153',
  '\u00C4\u009F',
  '\u00C5\u009F',
]

const sourceFiles = walk(root)

for (const file of sourceFiles) {
  const relativePath = relative(file)
  const ext = path.extname(file)
  if (!textExtensions.has(ext)) continue
  const buffer = fs.readFileSync(file)
  if (buffer.includes(0)) {
    failures.push(`${relativePath}: contains NUL byte`)
    continue
  }
  const text = buffer.toString('utf8')
  if (text.includes('\uFFFD')) {
    failures.push(`${relativePath}: contains Unicode replacement character`)
  }
  const controlMatch = text.match(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/)
  if (controlMatch) {
    failures.push(`${relativePath}: contains control character U+${controlMatch[0].charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`)
  }
  const mojibakeMatch = mojibakePatterns.find(pattern => text.includes(pattern))
  if (mojibakeMatch) {
    failures.push(`${relativePath}: contains likely mojibake sequence "${mojibakeMatch}"`)
  }
}

console.log('Source encoding guard')
console.log(`- files scanned: ${sourceFiles.filter(file => textExtensions.has(path.extname(file))).length}`)
console.log(`- warnings: ${warnings.length}`)
console.log(`- errors: ${failures.length}`)

for (const warning of warnings) console.warn(`WARNING ${warning}`)
if (failures.length) {
  for (const failure of failures) console.error(`ERROR ${failure}`)
  process.exit(1)
}

function walk(directory) {
  const results = []
  let entries
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true })
  } catch (error) {
    warnings.push(`${relative(directory)}: skipped unreadable directory (${error.code || error.message})`)
    return results
  }
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      results.push(...walk(fullPath))
      continue
    }
    results.push(fullPath)
  }
  return results
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/')
}
