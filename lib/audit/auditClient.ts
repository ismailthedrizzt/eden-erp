import type { AuditLogRecord } from './audit.types'

export interface AuditListFilters {
  entity_type?: string
  entity_id?: string
  company_id?: string
  branch_id?: string
  module_key?: string
  action_type?: string
  action_key?: string
  user_id?: string
  result_status?: string
  severity?: string
  operation_id?: string
  process_instance_id?: string
  request_id?: string
  correlation_id?: string
  search?: string
  date_from?: string
  date_to?: string
  page?: number
  pageSize?: number
}

export interface AuditListMeta {
  page: number
  pageSize: number
  count: number
  total: number
  totalPages: number
}

export interface AuditListResult {
  data: AuditLogRecord[]
  meta: AuditListMeta
}

export async function fetchAuditLogs(filters: AuditListFilters = {}): Promise<AuditListResult> {
  const params = buildAuditParams(filters)
  const response = await fetch(`/api/audit?${params.toString()}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Denetim izi okunamadi.')
  }
  return normalizeAuditListPayload(payload, filters)
}

export async function fetchAuditByRecord(
  entityType: string,
  entityId: string,
  options: Pick<AuditListFilters, 'page' | 'pageSize'> = {}
): Promise<AuditListResult> {
  const params = buildAuditParams({
    entity_type: entityType,
    entity_id: entityId,
    page: options.page,
    pageSize: options.pageSize,
  })
  const response = await fetch(`/api/audit/by-record?${params.toString()}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Kayit denetim izi okunamadi.')
  }
  return normalizeAuditListPayload(payload, options)
}

export function normalizeAuditListPayload(payload: any, fallback: AuditListFilters = {}): AuditListResult {
  const data = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : []
  const metaSource = payload?.meta || {}
  const page = Number(metaSource.page || fallback.page || 1)
  const pageSize = Number(metaSource.pageSize || fallback.pageSize || 50)
  const count = Number(metaSource.count ?? metaSource.total ?? data.length)
  return {
    data: data.map(normalizeAuditRow),
    meta: {
      page,
      pageSize,
      count,
      total: Number(metaSource.total ?? count),
      totalPages: Number(metaSource.totalPages || Math.max(1, Math.ceil(count / pageSize))),
    },
  }
}

export function normalizeAuditRow(row: any): AuditLogRecord {
  const metadata = row?.metadata_json || {}
  return {
    ...row,
    tenant_id: row?.tenant_id || row?.instance_id || '',
    module_key: row?.module_key || row?.module_code || metadata.module_key || null,
    entity_type: row?.entity_type || row?.resource || metadata.entity_type || null,
    entity_id: row?.entity_id || row?.record_id || metadata.entity_id || null,
    action_type: row?.action_type || metadata.action_type || row?.action || 'system_event',
    action_key: row?.action_key || metadata.action_key || null,
    old_values: row?.old_values ?? row?.before_json ?? null,
    new_values: row?.new_values ?? row?.after_json ?? null,
    changed_fields: Array.isArray(row?.changed_fields) ? row.changed_fields : metadata.changed_fields || [],
    summary: row?.summary || metadata.summary || null,
    reason: row?.reason || metadata.reason || null,
    result_status: row?.result_status || metadata.result_status || 'success',
    severity: row?.severity || metadata.severity || 'info',
    metadata_json: metadata,
    created_at: row?.created_at || '',
  }
}

function buildAuditParams(filters: AuditListFilters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  return params
}
