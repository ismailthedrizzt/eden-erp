const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const root = process.cwd()
const failures = []

const forbiddenEnvFiles = ['.env', '.env.local', '.env.production', '.env.staging', 'backend/.env']
for (const file of forbiddenEnvFiles) {
  if (isTracked(file)) {
    failures.push(`Local secret file must not be tracked: ${file}`)
  }
}

const publicSecretPatterns = [
  /NEXT_PUBLIC_.*SERVICE_ROLE/i,
  /NEXT_PUBLIC_.*INTERNAL_BACKEND_TOKEN/i,
  /NEXT_PUBLIC_.*TRUSTED_PROXY_SECRET/i,
  /NEXT_PUBLIC_.*JWT_SECRET/i,
  /NEXT_PUBLIC_.*CRON_SECRET/i,
  /NEXT_PUBLIC_.*PRIVATE_KEY/i,
]

for (const file of ['.env.local.example', 'backend/.env.example']) {
  const absolute = path.join(root, file)
  if (!fs.existsSync(absolute)) continue
  const content = fs.readFileSync(absolute, 'utf8')
  for (const pattern of publicSecretPatterns) {
    if (pattern.test(content)) failures.push(`${file} exposes a secret-looking NEXT_PUBLIC_* variable.`)
  }
}

const sourceFiles = collectFiles(root, ['app', 'components', 'lib'], ['.ts', '.tsx', '.js', '.jsx'])
for (const file of sourceFiles) {
  const relative = path.relative(root, file).replace(/\\/g, '/')
  const content = fs.readFileSync(file, 'utf8')
  if (content.includes('NEXT_PUBLIC_INTERNAL_BACKEND_TOKEN')) {
    failures.push(`${relative} references NEXT_PUBLIC_INTERNAL_BACKEND_TOKEN.`)
  }
  if (content.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')) {
    failures.push(`${relative} references NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY.`)
  }
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(content) && content.startsWith("'use client'")) {
    failures.push(`${relative} is a client component referencing SUPABASE_SERVICE_ROLE_KEY.`)
  }
}

if (failures.length) {
  console.error('Environment safety check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Environment safety check passed.')

function collectFiles(base, folders, extensions) {
  const files = []
  for (const folder of folders) {
    walk(path.join(base, folder), files, extensions)
  }
  return files
}

function walk(current, files, extensions) {
  if (!fs.existsSync(current)) return
  const stat = fs.statSync(current)
  if (stat.isDirectory()) {
    if (['node_modules', '.next'].includes(path.basename(current))) return
    for (const child of fs.readdirSync(current)) walk(path.join(current, child), files, extensions)
    return
  }
  if (extensions.includes(path.extname(current))) files.push(current)
}

function isTracked(file) {
  try {
    const output = execSync(`git ls-files -- "${file}"`, { cwd: root, encoding: 'utf8' })
    return output.trim().length > 0
  } catch {
    return false
  }
}
