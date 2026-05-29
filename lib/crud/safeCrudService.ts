import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ListQuery } from '@/lib/api/listEndpoint'
import { listMetaFromRows, listRange } from '@/lib/api/listEndpoint'
import { requirePermission } from '@/lib/security/serverPermissions'
import type { EntityContract } from '@/lib/crud/entityContracts'
import { getUnknownEntityPayloadFields } from '@/lib/crud/entityContracts'
import {
  applyTenantQueryScope,
  resolveTenantContext,
  withTenantInsertScopeForTable,
} from '@/lib/tenancy/server'

type QueryBuilder = any
type CrudPermissionKey = string | string[]
type CrudRecord = Record<string, any>

export interface SafeCrudBaseOptions {
  supabase: SupabaseClient
  request?: NextRequest
  tableName: string
  primaryKey?: string
  select?: string
  userId?: string | null
  permissionKey?: CrudPermissionKey
  companyId?: string | null
  companyIdField?: string
  skipTenantScope?: boolean
}

export interface SafeReadRecordOptions extends SafeCrudBaseOptions {
  recordId: string
  notDeletedField?: string
  includeDeleted?: boolean
  query?: (query: QueryBuilder) => QueryBuilder
  afterRead?: (context: SafeCrudReadContext) => Promise<CrudRecord> | CrudRecord
}

export interface SafeListRecordOptions extends SafeCrudBaseOptions {
  listQuery: Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction' | 'includePassive'>
  sortMap?: Record<string, string>
  defaultSort?: string
  searchFields?: string[]
  passiveField?: string
  passiveValue?: unknown
  filters?: Record<string, unknown>
  query?: (query: QueryBuilder) => QueryBuilder
  afterList?: (context: SafeCrudListContext) => Promise<CrudRecord[]> | CrudRecord[]
}

export interface SafeCreateRecordOptions extends SafeCrudBaseOptions {
  values: CrudRecord
  contract?: EntityContract
  rejectUnknownFields?: boolean
  validate?: (values: CrudRecord) => SafeCrudValidationResult
  beforeCreate?: (context: SafeCrudCreateContext) => Promise<CrudRecord> | CrudRecord
  afterCreate?: (context: SafeCrudCreatedContext) => Promise<CrudRecord> | CrudRecord
}

export interface SafeUpdateRecordOptions extends SafeCrudBaseOptions {
  recordId: string
  patch: CrudRecord
  currentSelect?: string
  notDeletedField?: string
  includeDeleted?: boolean
  contract?: EntityContract
  rejectUnknownFields?: boolean
  validate?: (patch: CrudRecord, current: CrudRecord) => SafeCrudValidationResult
  guard?: (context: SafeCrudUpdateContext) => Promise<SafeCrudGuardResult> | SafeCrudGuardResult
  beforeUpdate?: (context: SafeCrudUpdateContext) => Promise<CrudRecord> | CrudRecord
  afterUpdate?: (context: SafeCrudUpdatedContext) => Promise<CrudRecord> | CrudRecord
  fieldHistory?: SafeCrudFieldHistoryOptions
  autoUpdatedAt?: boolean
  autoUpdatedBy?: boolean
  versionField?: string
  baseVersion?: number | null
  baseUpdatedAt?: string | null
  updatedAtField?: string
  diffOnly?: boolean
}

export interface SafeCrudFieldHistoryOptions {
  fieldName?: string
  ignoredFields?: string[]
  userLabel?: string
  summarize?: (value: unknown, field: string) => unknown
}

export interface SafeCrudReadContext {
  supabase: SupabaseClient
  userId: string | null
  record: CrudRecord
}

export interface SafeCrudListContext {
  supabase: SupabaseClient
  userId: string | null
  rows: CrudRecord[]
}

export interface SafeCrudCreateContext {
  supabase: SupabaseClient
  userId: string | null
  values: CrudRecord
}

export interface SafeCrudCreatedContext extends SafeCrudCreateContext {
  record: CrudRecord
}

export interface SafeCrudUpdateContext {
  supabase: SupabaseClient
  userId: string | null
  current: CrudRecord
  patch: CrudRecord
}

export interface SafeCrudUpdatedContext extends SafeCrudUpdateContext {
  record: CrudRecord
}

export type SafeCrudValidationResult =
  | { ok: true; values?: CrudRecord }
  | { ok: false; status?: number; code?: string; error: string; details?: unknown }

export type SafeCrudGuardResult =
  | { ok: true }
  | { ok: false; status?: number; code?: string; error: string; details?: unknown }

export type SafeCrudResult<T = unknown> =
  | { ok: true; data: T; userId: string | null; meta?: unknown }
  | { ok: false; status: number; code: string; error: string; details?: unknown }

export async function safeReadRecord(options: SafeReadRecordOptions): Promise<SafeCrudResult<CrudRecord>> {
  const permission = await resolvePermission(options)
  if (!permission.ok) return permission
  const tenantContext = options.request ? resolveTenantContext(options.request) : null

  const primaryKey = options.primaryKey || 'id'
  let query = options.supabase
    .from(options.tableName)
    .select(options.select || '*')
    .eq(primaryKey, options.recordId)

  if (!options.skipTenantScope) query = applyTenantQueryScope(query, options.tableName, tenantContext)
  query = applyCompanyScope(query, options)
  if (options.notDeletedField && !options.includeDeleted) query = query.eq(options.notDeletedField, false)
  if (options.query) query = options.query(query)

  const { data, error } = await query.maybeSingle()
  if (error) return databaseFailure(error, 'FETCH_FAILED')
  if (!data) return failure(404, 'RECORD_NOT_FOUND', 'Kayıt bulunamadı.')

  const record = data as CrudRecord
  const hydrated = options.afterRead
    ? await options.afterRead({ supabase: options.supabase, userId: permission.userId, record })
    : record

  return { ok: true, data: hydrated, userId: permission.userId }
}

export async function safeListRecords(options: SafeListRecordOptions): Promise<SafeCrudResult<CrudRecord[]>> {
  const permission = await resolvePermission(options)
  if (!permission.ok) return permission
  const tenantContext = options.request ? resolveTenantContext(options.request) : null

  const { from, to } = listRange(options.listQuery)
  const sortColumn = resolveSortColumn(options)
  let query = options.supabase
    .from(options.tableName)
    .select(options.select || '*')
    .order(sortColumn, { ascending: options.listQuery.direction !== 'desc' })
    .range(from, to)

  if (!options.skipTenantScope) query = applyTenantQueryScope(query, options.tableName, tenantContext)
  query = applyCompanyScope(query, options)
  query = applyListFilters(query, options)
  if (options.query) query = options.query(query)

  const { data, error } = await query
  if (error) return databaseFailure(error, 'FETCH_FAILED')

  const rows = (data || []) as CrudRecord[]
  const resultRows = options.afterList
    ? await options.afterList({ supabase: options.supabase, userId: permission.userId, rows })
    : rows

  return {
    ok: true,
    data: resultRows,
    userId: permission.userId,
    meta: listMetaFromRows(options.listQuery, resultRows.length),
  }
}

export async function safeCreateRecord(options: SafeCreateRecordOptions): Promise<SafeCrudResult<CrudRecord>> {
  const permission = await resolvePermission(options)
  if (!permission.ok) return permission
  const tenantContext = options.request ? resolveTenantContext(options.request) : null

  let values = stripUndefined(options.skipTenantScope
    ? options.values
    : withTenantInsertScopeForTable(options.values, options.tableName, tenantContext))
  const contractFailure = validateContractPayload(options.contract, values, options.rejectUnknownFields)
  if (contractFailure) return contractFailure

  const validation = options.validate?.(values)
  if (validation && !validation.ok) return validationFailure(validation)
  if (validation?.values) values = validation.values

  if (options.beforeCreate) {
    values = await options.beforeCreate({ supabase: options.supabase, userId: permission.userId, values })
  }

  const { data, error } = await options.supabase
    .from(options.tableName)
    .insert(values)
    .select(options.select || '*')
    .single()

  if (error) return databaseFailure(error, 'CREATE_FAILED')

  const record = data as CrudRecord
  const result = options.afterCreate
    ? await options.afterCreate({ supabase: options.supabase, userId: permission.userId, values, record })
    : record

  return { ok: true, data: result, userId: permission.userId }
}

export async function safeUpdateRecord(options: SafeUpdateRecordOptions): Promise<SafeCrudResult<CrudRecord>> {
  const permission = await resolvePermission(options)
  if (!permission.ok) return permission
  const tenantContext = options.request ? resolveTenantContext(options.request) : null

  const primaryKey = options.primaryKey || 'id'
  let currentQuery = options.supabase
    .from(options.tableName)
    .select(options.currentSelect || options.select || '*')
    .eq(primaryKey, options.recordId)

  if (!options.skipTenantScope) currentQuery = applyTenantQueryScope(currentQuery, options.tableName, tenantContext)
  currentQuery = applyCompanyScope(currentQuery, options)
  if (options.notDeletedField && !options.includeDeleted) currentQuery = currentQuery.eq(options.notDeletedField, false)

  const { data: current, error: currentError } = await currentQuery.maybeSingle()
  if (currentError) return databaseFailure(currentError, 'FETCH_FAILED')
  if (!current) return failure(404, 'RECORD_NOT_FOUND', 'Kayıt bulunamadı.')

  const currentRecord = current as CrudRecord
  const conflict = detectVersionConflict(currentRecord, {
    baseVersion: options.baseVersion,
    baseUpdatedAt: options.baseUpdatedAt,
    versionField: options.versionField,
    updatedAtField: options.updatedAtField,
  })
  if (conflict) return conflict

  let patch = stripUndefined(options.diffOnly === false ? options.patch : diffRecord(options.patch, currentRecord))
  const contractFailure = validateContractPayload(options.contract, patch, options.rejectUnknownFields)
  if (contractFailure) return contractFailure

  const validation = options.validate?.(patch, currentRecord)
  if (validation && !validation.ok) return validationFailure(validation)
  if (validation?.values) patch = validation.values

  const guard = await options.guard?.({ supabase: options.supabase, userId: permission.userId, current: currentRecord, patch })
  if (guard && !guard.ok) return guardFailure(guard)

  if (options.beforeUpdate) {
    patch = await options.beforeUpdate({ supabase: options.supabase, userId: permission.userId, current: currentRecord, patch })
  }

  patch = stripUndefined(patch)
  if (options.fieldHistory) {
    patch[options.fieldHistory.fieldName || 'field_history'] = buildFieldHistory(currentRecord, patch, options.fieldHistory)
  }
  if (options.autoUpdatedAt !== false) patch.updated_at = new Date().toISOString()
  if (options.autoUpdatedBy) patch.updated_by = permission.userId
  if (options.versionField) patch[options.versionField] = Number(currentRecord[options.versionField] || 1) + 1

  let updateQuery = options.supabase
    .from(options.tableName)
    .update(patch)
    .eq(primaryKey, options.recordId)

  if (!options.skipTenantScope) updateQuery = applyTenantQueryScope(updateQuery, options.tableName, tenantContext)

  const { data, error } = await updateQuery
    .select(options.select || '*')
    .single()

  if (error) return databaseFailure(error, 'UPDATE_FAILED')

  const record = data as CrudRecord
  const result = options.afterUpdate
    ? await options.afterUpdate({ supabase: options.supabase, userId: permission.userId, current: currentRecord, patch, record })
    : record

  return { ok: true, data: result, userId: permission.userId }
}

export function safeCrudResponse<T>(result: SafeCrudResult<T>, successStatus = 200) {
  if (result.ok) {
    return NextResponse.json(
      { data: result.data, ...(result.meta ? { meta: result.meta } : {}) },
      { status: successStatus }
    )
  }

  return NextResponse.json(
    { error: result.error, code: result.code, details: result.details },
    { status: result.status }
  )
}

export function diffRecord(next: CrudRecord, current: CrudRecord) {
  const patch: CrudRecord = {}

  Object.entries(next).forEach(([key, value]) => {
    if (!deepEqual(value, current[key])) patch[key] = value
  })

  return patch
}

export function buildFieldHistory(
  current: CrudRecord,
  patch: CrudRecord,
  options: SafeCrudFieldHistoryOptions = {}
) {
  const fieldName = options.fieldName || 'field_history'
  const existingHistory = current[fieldName] && typeof current[fieldName] === 'object'
    ? current[fieldName]
    : {}
  const nextHistory: Record<string, any[]> = { ...existingHistory }
  const ignored = new Set([
    'id',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    fieldName,
    ...(options.ignoredFields || []),
  ])

  Object.entries(patch).forEach(([field, nextValue]) => {
    if (ignored.has(field)) return
    const previousValue = current[field]
    if (deepEqual(previousValue ?? null, nextValue ?? null)) return

    nextHistory[field] = [
      ...(nextHistory[field] || []),
      {
        value: options.summarize ? options.summarize(previousValue, field) : previousValue ?? '',
        date: new Date().toISOString(),
        user: options.userLabel || 'Sistem Kullanıcısı',
      },
    ]
  })

  return nextHistory
}

async function resolvePermission(options: SafeCrudBaseOptions): Promise<
  | { ok: true; userId: string | null }
  | { ok: false; status: number; code: string; error: string; details?: unknown }
> {
  const permissionKeys = toArray(options.permissionKey)
  if (permissionKeys.length === 0) return { ok: true, userId: options.userId ?? null }

  if (!options.request) {
    return failure(500, 'PERMISSION_CONTEXT_MISSING', 'CRUD yetki kontrolü için request bağlamı gereklidir.')
  }

  let lastDenied: NextResponse | null = null
  for (const permissionKey of permissionKeys) {
    const permission = await requirePermission(options.request, options.supabase, permissionKey)
    if (!(permission instanceof NextResponse)) return { ok: true, userId: permission.userId ?? options.userId ?? null }
    lastDenied = permission
  }

  const body = await lastDenied?.clone().json().catch(() => ({}))
  return failure(
    lastDenied?.status || 403,
    body?.code || 'PERMISSION_DENIED',
    body?.error || 'Bu işlem için yetkiniz yok.',
    body?.details
  )
}

function applyCompanyScope(query: QueryBuilder, options: Pick<SafeCrudBaseOptions, 'companyId' | 'companyIdField'>) {
  if (!options.companyId) return query
  return query.eq(options.companyIdField || 'company_id', options.companyId)
}

function applyListFilters(query: QueryBuilder, options: SafeListRecordOptions) {
  let nextQuery = query

  Object.entries(options.filters || {}).forEach(([field, value]) => {
    if (value === undefined) return
    nextQuery = value === null ? nextQuery.is(field, null) : nextQuery.eq(field, value)
  })

  if (options.passiveField && !options.listQuery.includePassive) {
    nextQuery = options.passiveValue === undefined
      ? nextQuery.eq(options.passiveField, false)
      : nextQuery.neq(options.passiveField, options.passiveValue)
  }

  if (options.listQuery.search && options.searchFields?.length) {
    const term = String(options.listQuery.search).replace(/[%(),]/g, '').trim()
    if (term) {
      nextQuery = nextQuery.or(options.searchFields.map(field => `${field}.ilike.%${term}%`).join(','))
    }
  }

  return nextQuery
}

function resolveSortColumn(options: SafeListRecordOptions) {
  const requested = options.listQuery.sort || ''
  if (requested && options.sortMap?.[requested]) return options.sortMap[requested]
  if (requested && !options.sortMap) return requested
  return options.defaultSort || options.primaryKey || 'id'
}

function validationFailure(validation: Extract<SafeCrudValidationResult, { ok: false }>) {
  return failure(
    validation.status || 400,
    validation.code || 'VALIDATION_FAILED',
    validation.error,
    validation.details
  )
}

function guardFailure(guard: Extract<SafeCrudGuardResult, { ok: false }>) {
  return failure(
    guard.status || 409,
    guard.code || 'CRUD_GUARD_BLOCKED',
    guard.error,
    guard.details
  )
}

function validateContractPayload(
  contract: EntityContract | undefined,
  payload: CrudRecord,
  rejectUnknownFields?: boolean
) {
  if (!contract || !rejectUnknownFields) return null
  const unknownFields = getUnknownEntityPayloadFields(contract, payload)
  if (unknownFields.length === 0) return null

  return failure(
    400,
    'UNKNOWN_FORM_FIELD',
    `${contract.key} form payload sozlesmesinde olmayan alanlar iceriyor.`,
    { fields: unknownFields }
  )
}

function databaseFailure(error: { code?: string; message?: string; details?: unknown }, fallbackCode: string) {
  const code = error.code || fallbackCode
  const status = code === 'PGRST116'
    ? 404
    : code === '23503' || code === '23505'
      ? 409
      : 500

  return failure(status, code, error.message || 'Veritabanı işlemi tamamlanamadı.', error)
}

function detectVersionConflict(
  current: CrudRecord,
  options: {
    baseVersion?: number | null
    baseUpdatedAt?: string | null
    versionField?: string
    updatedAtField?: string
  }
) {
  if (options.baseVersion !== undefined && options.baseVersion !== null) {
    const versionField = options.versionField || 'version'
    const currentVersion = Number(current[versionField])
    if (Number.isFinite(currentVersion) && currentVersion !== options.baseVersion) {
      return failure(409, 'VERSION_CONFLICT', 'Kayıt siz formu açtıktan sonra değişmiş.', {
        current_version: currentVersion,
        base_version: options.baseVersion,
      })
    }
  }

  if (options.baseUpdatedAt) {
    const updatedAtField = options.updatedAtField || 'updated_at'
    const currentUpdatedAt = normalizeDateForConflict(current[updatedAtField])
    const baseUpdatedAt = normalizeDateForConflict(options.baseUpdatedAt)
    if (currentUpdatedAt && baseUpdatedAt && currentUpdatedAt !== baseUpdatedAt) {
      return failure(409, 'VERSION_CONFLICT', 'Kayıt siz formu açtıktan sonra değişmiş.', {
        current_updated_at: current[updatedAtField],
        base_updated_at: options.baseUpdatedAt,
      })
    }
  }

  return null
}

function normalizeDateForConflict(value: unknown) {
  const date = value ? new Date(String(value)) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function failure(status: number, code: string, error: string, details?: unknown): Extract<SafeCrudResult, { ok: false }> {
  return { ok: false, status, code, error, details }
}

function stripUndefined<T extends CrudRecord>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T
}

function deepEqual(left: unknown, right: unknown) {
  return stableStringify(left ?? null) === stableStringify(right ?? null)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
}

function toArray<T>(value?: T | T[] | null): T[] {
  if (Array.isArray(value)) return value
  return value === undefined || value === null ? [] : [value]
}
