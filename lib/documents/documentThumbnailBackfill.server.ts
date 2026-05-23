import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import {
  createAndUploadDocumentThumbnail,
  DOCUMENT_BUCKET,
  isFallbackThumbnailUrl,
  isSupportedDocumentThumbnailType,
} from '@/lib/documents/documentThumbnails.server'

type Supabase = ReturnType<typeof createServiceClient>

type BackfillOptions = {
  limit?: number
}

type BackfillStats = {
  scanned: number
  updated: number
  generated: number
  skipped: number
  errors: Array<{ table: string; field: string; id?: string; message: string }>
}

type DocumentSource = {
  table: string
  fields: string[]
}

const DEFAULT_LIMIT = 25
const DOCUMENT_SOURCES: DocumentSource[] = [
  { table: 'companies', fields: ['hero_documents'] },
  { table: 'employees', fields: ['cv_document', 'diploma_document', 'entry_documents', 'exit_documents'] },
  { table: 'company_partners', fields: ['partner_documents'] },
  { table: 'company_representatives', fields: ['authority_documents'] },
  { table: 'stakeholders', fields: ['stakeholder_documents'] },
]

export async function backfillMissingDocumentThumbnails(options: BackfillOptions = {}): Promise<BackfillStats> {
  const supabase = createServiceClient()
  const remaining = { value: Math.max(1, Math.min(options.limit || DEFAULT_LIMIT, 100)) }
  const stats: BackfillStats = { scanned: 0, updated: 0, generated: 0, skipped: 0, errors: [] }

  for (const source of DOCUMENT_SOURCES) {
    if (remaining.value <= 0) break
    await processSource(supabase, source, remaining, stats)
  }

  return stats
}

async function processSource(
  supabase: Supabase,
  source: DocumentSource,
  remaining: { value: number },
  stats: BackfillStats
) {
  const select = ['id', 'tenant_id', ...source.fields].join(',')
  const { data, error } = await supabase
    .from(source.table)
    .select(select)
    .limit(200)

  if (error) {
    if (isMissingSourceError(error)) return
    stats.errors.push({ table: source.table, field: '*', message: error.message })
    return
  }

  const rows = (data || []) as Array<Record<string, any>>

  for (const row of rows) {
    if (remaining.value <= 0) break
    for (const field of source.fields) {
      if (remaining.value <= 0) break
      if (!Object.prototype.hasOwnProperty.call(row, field)) continue

      stats.scanned += 1
      const result = await processDocumentValue(supabase, {
        value: row[field],
        rowId: String(row.id || ''),
        tenantId: String(row.tenant_id || ''),
        source,
        field,
        remaining,
        stats,
      })

      if (!result.changed) continue

      const { error: updateError } = await supabase
        .from(source.table)
        .update({ [field]: result.value })
        .eq('id', row.id)

      if (updateError) {
        stats.errors.push({ table: source.table, field, id: String(row.id || ''), message: updateError.message })
        continue
      }

      stats.updated += 1
    }
  }
}

async function processDocumentValue(
  supabase: Supabase,
  context: {
    value: unknown
    rowId: string
    tenantId: string
    source: DocumentSource
    field: string
    remaining: { value: number }
    stats: BackfillStats
  }
) {
  if (Array.isArray(context.value)) {
    let changed = false
    const next = []
    for (const item of context.value) {
      const result = await processDocumentRecord(supabase, item, context)
      changed ||= result.changed
      next.push(result.value)
    }
    return { changed, value: next }
  }

  const record = asRecord(context.value)
  if (!record) return { changed: false, value: context.value }

  return processDocumentRecord(supabase, record, context)
}

async function processDocumentRecord(
  supabase: Supabase,
  value: unknown,
  context: {
    rowId: string
    tenantId: string
    source: DocumentSource
    field: string
    remaining: { value: number }
    stats: BackfillStats
  }
) {
  const document = asRecord(value)
  if (!document) return { changed: false, value }

  let changed = false
  const next = { ...document }

  if (isFallbackThumbnailUrl(next.thumbnailUrl || next.thumbnail_url)) {
    delete next.thumbnailUrl
    delete next.thumbnail_url
    changed = true
  }

  if (hasStoredThumbnail(next) || !isActiveDocument(next)) {
    return { changed, value: next }
  }

  if (context.remaining.value <= 0) {
    context.stats.skipped += 1
    return { changed, value: next }
  }

  const storagePath = stringValue(next.storagePath || next.storage_path || next.documentId || next.document_id)
  const mimeType = inferDocumentMimeType(next)
  const tenantId = context.tenantId || tenantIdFromStoragePath(storagePath)

  if (!storagePath || !tenantId || !isSupportedDocumentThumbnailType(mimeType)) {
    context.stats.skipped += 1
    return { changed, value: next }
  }

  try {
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).download(storagePath)
    if (error) throw error
    const buffer = Buffer.from(await data.arrayBuffer())
    const thumbnail = await createAndUploadDocumentThumbnail(supabase, {
      buffer,
      mimeType,
      sourceStoragePath: storagePath,
      tenantId,
      fileName: stringValue(next.name || next.file_name || next.fileName),
    })

    if (!thumbnail) {
      context.stats.skipped += 1
      return { changed, value: next }
    }

    next.thumbnailPath = thumbnail.storagePath
    next.thumbnail_path = thumbnail.storagePath
    delete next.thumbnailUrl
    delete next.thumbnail_url
    context.remaining.value -= 1
    context.stats.generated += 1
    return { changed: true, value: next }
  } catch (error) {
    context.stats.errors.push({
      table: context.source.table,
      field: context.field,
      id: context.rowId,
      message: error instanceof Error ? error.message : 'Thumbnail olusturulamadi',
    })
    return { changed, value: next }
  }
}

function hasStoredThumbnail(document: Record<string, any>) {
  if (document.thumbnailPath || document.thumbnail_path) return true
  const thumbnailUrl = document.thumbnailUrl || document.thumbnail_url
  return !!thumbnailUrl && !isFallbackThumbnailUrl(thumbnailUrl)
}

function isActiveDocument(document: Record<string, any>) {
  return !document.isDeleted && !document.is_deleted && document.status !== 'deleted' && document.status !== 'archived'
}

function inferDocumentMimeType(document: Record<string, any>) {
  const explicit = stringValue(document.type || document.mime_type || document.mimeType || document.file_type)
  if (explicit && explicit !== 'application/octet-stream') return explicit

  const source = stringValue(document.name || document.file_name || document.fileName || document.storagePath || document.storage_path).toLowerCase()
  if (source.endsWith('.pdf')) return 'application/pdf'
  if (source.endsWith('.jpg') || source.endsWith('.jpeg')) return 'image/jpeg'
  if (source.endsWith('.png')) return 'image/png'
  if (source.endsWith('.webp')) return 'image/webp'
  return explicit || 'application/octet-stream'
}

function tenantIdFromStoragePath(storagePath: string) {
  const match = storagePath.match(/^form-documents\/([^/]+)\//)
  return match?.[1] || ''
}

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null
}

function stringValue(value: unknown) {
  return value === undefined || value === null ? '' : String(value)
}

function isMissingSourceError(error: any) {
  const message = String(error?.message || '')
  return error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205' ||
    message.includes('Could not find') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
}
