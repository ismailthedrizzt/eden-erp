import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import { getEntityMediaConfig } from '@/lib/media/entityMediaRegistry'

export async function loadEntityMediaMetadata(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  entityType: string,
  entityId: string
) {
  const config = getEntityMediaConfig(entityType)
  if (!config) {
    return { ok: false as const, status: 400, error: 'Medya metadata bu entity tipi için tanımlı değil.', code: 'MEDIA_ENTITY_NOT_REGISTERED' }
  }

  const idField = config.idField || 'id'
  const fields = Array.from(new Set([idField, ...(config.imageFields || []), ...(config.documentFields || [])]))
  let query = supabase
    .from(config.tableName)
    .select(fields.join(','))
    .eq(idField, entityId)

  query = applyTenantQueryScope(query, config.tableName, tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return { ok: false as const, status: 500, error: error.message, code: error.code || 'MEDIA_METADATA_FAILED' }
  if (!data) return { ok: false as const, status: 404, error: 'Kayıt bulunamadı.', code: 'MEDIA_ENTITY_NOT_FOUND' }

  const row = data as Record<string, any>
  return {
    ok: true as const,
    data: {
      entity_type: entityType,
      entity_id: entityId,
      images: collectMediaItems(row, config.imageFields || [], 'image'),
      documents: collectMediaItems(row, config.documentFields || [], 'document'),
    },
  }
}

function collectMediaItems(row: Record<string, any>, fields: string[], kind: 'image' | 'document') {
  return fields.flatMap(field => normalizeMediaValue(row[field], field, kind))
}

function normalizeMediaValue(value: unknown, field: string, kind: 'image' | 'document'): Record<string, any>[] {
  if (!value) return []
  if (typeof value === 'string') {
    return value ? [{ field, kind, name: field, storagePath: value, documentId: value }] : []
  }
  if (Array.isArray(value)) return value.flatMap(item => sanitizeMediaItem(item, field, kind))
  if (typeof value === 'object') return sanitizeMediaItem(value as Record<string, any>, field, kind)
  return []
}

function sanitizeMediaItem(item: Record<string, any>, field: string, kind: 'image' | 'document') {
  if (!item || item.isDeleted || item.is_deleted || item.status === 'deleted') return []
  const {
    url: _url,
    previewUrl: _previewUrl,
    preview_url: _previewUrlSnake,
    signedUrl: _signedUrl,
    signed_url: _signedUrlSnake,
    file: _file,
    ...metadata
  } = item

  return [{
    ...metadata,
    field,
    kind,
    slotId: metadata.slotId || metadata.slot_id || field,
    name: metadata.name || metadata.fileName || metadata.file_name || field,
    storagePath: metadata.storagePath || metadata.storage_path || metadata.documentId || metadata.document_id || null,
    documentId: metadata.documentId || metadata.document_id || metadata.storagePath || metadata.storage_path || null,
    thumbnailPath: metadata.thumbnailPath || metadata.thumbnail_path || null,
    thumbnailUrl: metadata.thumbnailUrl || metadata.thumbnail_url || null,
  }]
}

