const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')

const root = path.resolve(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')
const batchSize = Number(process.env.AVATAR_MIGRATION_BATCH_SIZE || 100)
const largeDataUrlThreshold = 20_000

loadEnvFile(path.join(root, '.env.local'))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const jsonImageTargets = [
  { table: 'companies', column: 'hero_images', maxDimension: 512, thumbnailDimension: 128 },
  { table: 'company_partners', column: 'photo_logo', maxDimension: 384, thumbnailDimension: 96 },
  { table: 'company_representatives', column: 'photo_logo', maxDimension: 384, thumbnailDimension: 96 },
  { table: 'stakeholders', column: 'photo_logo', maxDimension: 384, thumbnailDimension: 96 },
  { table: 'persons', column: 'photo_logo', maxDimension: 384, thumbnailDimension: 96, optional: true },
  { table: 'organizations', column: 'photo_logo', maxDimension: 384, thumbnailDimension: 96, optional: true },
]

const textImageTargets = [
  { table: 'employees', column: 'photo_url', maxDimension: 384 },
]

main().catch(error => {
  console.error(error)
  process.exit(1)
})

async function main() {
  const totals = { scanned: 0, changed: 0, skipped: 0 }

  for (const target of jsonImageTargets) {
    const result = await migrateJsonImageColumn(target)
    addTotals(totals, result)
  }

  for (const target of textImageTargets) {
    const result = await migrateTextImageColumn(target)
    addTotals(totals, result)
  }

  console.log(`${dryRun ? 'Dry run' : 'Migration'} complete: scanned=${totals.scanned}, changed=${totals.changed}, skipped=${totals.skipped}`)
}

async function migrateJsonImageColumn(target) {
  let from = 0
  const result = { scanned: 0, changed: 0, skipped: 0 }

  while (true) {
    const { data, error } = await supabase
      .from(target.table)
      .select(`id,${target.column}`)
      .range(from, from + batchSize - 1)

    if (error) {
      if (target.optional && isMissingColumnOrTable(error)) {
        console.log(`${target.table}.${target.column}: skipped optional target (${error.message})`)
        return result
      }
      throw new Error(`${target.table}.${target.column}: ${error.message}`)
    }

    if (!data?.length) break

    for (const row of data) {
      result.scanned += 1
      const value = row[target.column]
      if (!Array.isArray(value) || value.length === 0) {
        result.skipped += 1
        continue
      }

      const migrated = await migrateImageArray(value, target)
      if (!migrated.changed) {
        result.skipped += 1
        continue
      }

      result.changed += 1
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from(target.table)
          .update({ [target.column]: migrated.value })
          .eq('id', row.id)
        if (updateError) throw new Error(`${target.table}.${target.column}:${row.id}: ${updateError.message}`)
      }
    }

    from += batchSize
  }

  console.log(`${target.table}.${target.column}: scanned=${result.scanned}, changed=${result.changed}, skipped=${result.skipped}`)
  return result
}

async function migrateTextImageColumn(target) {
  let from = 0
  const result = { scanned: 0, changed: 0, skipped: 0 }

  while (true) {
    const { data, error } = await supabase
      .from(target.table)
      .select(`id,${target.column}`)
      .range(from, from + batchSize - 1)

    if (error) throw new Error(`${target.table}.${target.column}: ${error.message}`)
    if (!data?.length) break

    for (const row of data) {
      result.scanned += 1
      const value = row[target.column]
      if (!isMigratableDataImage(value)) {
        result.skipped += 1
        continue
      }

      const compressed = await compressDataUrl(value, target.maxDimension)
      if (!compressed || compressed === value) {
        result.skipped += 1
        continue
      }

      result.changed += 1
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from(target.table)
          .update({ [target.column]: compressed })
          .eq('id', row.id)
        if (updateError) throw new Error(`${target.table}.${target.column}:${row.id}: ${updateError.message}`)
      }
    }

    from += batchSize
  }

  console.log(`${target.table}.${target.column}: scanned=${result.scanned}, changed=${result.changed}, skipped=${result.skipped}`)
  return result
}

async function migrateImageArray(images, target) {
  let changed = false
  const value = []

  for (const image of images) {
    if (!image || typeof image !== 'object') {
      value.push(image)
      continue
    }

    const source = firstDataImage(image.previewUrl, image.preview_url, image.url, image.signedUrl, image.signed_url)
    if (!source) {
      value.push(image)
      continue
    }
    if (isAlreadyMigratedImage(image, source)) {
      value.push(image)
      continue
    }

    const compressed = await compressDataUrl(source, target.maxDimension)
    const thumbnail = await compressDataUrl(source, target.thumbnailDimension, 0.72)

    if (!compressed && !thumbnail) {
      value.push(image)
      continue
    }

    const next = { ...image }
    if (compressed) {
      next.url = compressed
      next.previewUrl = compressed
      next.size = Math.round((compressed.length * 3) / 4)
      changed = changed || compressed !== image.url || compressed !== image.previewUrl
    }
    if (thumbnail) {
      next.thumbnailUrl = thumbnail
      changed = changed || thumbnail !== image.thumbnailUrl
    }

    value.push(next)
  }

  return { changed, value }
}

async function compressDataUrl(value, maxDimension, quality = 0.78) {
  if (!isMigratableDataImage(value)) return null
  const parsed = parseDataUrl(value)
  if (!parsed || parsed.mime === 'image/svg+xml') return null

  const output = await sharp(parsed.buffer)
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: Math.round(quality * 100) })
    .toBuffer()

  const next = `data:image/webp;base64,${output.toString('base64')}`
  if (next.length >= value.length && value.length <= largeDataUrlThreshold) return value
  return next
}

function isMigratableDataImage(value) {
  return typeof value === 'string' &&
    value.startsWith('data:image/') &&
    !value.startsWith('data:image/svg+xml') &&
    value.includes(';base64,') &&
    value.length > largeDataUrlThreshold
}

function firstDataImage(...values) {
  return values.find(isMigratableDataImage) || ''
}

function isAlreadyMigratedImage(image, source) {
  return source.startsWith('data:image/webp;base64,') && isDataImage(image.thumbnailUrl)
}

function isDataImage(value) {
  return typeof value === 'string' && value.startsWith('data:image/')
}

function parseDataUrl(value) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(value)
  if (!match) return null
  return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], 'base64') }
}

function isMissingColumnOrTable(error) {
  const message = error?.message || ''
  return ['PGRST200', 'PGRST204', 'PGRST205', '42P01', '42703'].includes(error?.code) ||
    message.includes('schema cache') ||
    message.includes('Could not find') ||
    message.includes('does not exist')
}

function addTotals(totals, result) {
  totals.scanned += result.scanned
  totals.changed += result.changed
  totals.skipped += result.skipped
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed)
    if (!match) continue
    const key = match[1]
    const value = match[2].replace(/^['"]|['"]$/g, '')
    if (process.env[key] === undefined) process.env[key] = value
  }
}
