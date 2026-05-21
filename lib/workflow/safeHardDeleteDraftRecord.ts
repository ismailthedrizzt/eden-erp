import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isDraftRecord } from '@/lib/forms/entityState'
import { requirePermission } from '@/lib/security/serverPermissions'
import { applyTenantQueryScope, resolveTenantContext, type TenantContext } from '@/lib/tenancy/server'

type QueryBuilder = any

export type SafeHardDeleteReferenceMode = 'block' | 'cascadeDelete'

export interface SafeHardDeleteReferenceCheck {
  tableName: string
  label?: string
  mode?: SafeHardDeleteReferenceMode
  foreignKey?: string
  foreignValue?: string | ((context: SafeHardDeleteContext) => string | null | undefined)
  match?: Record<string, unknown>
  select?: string
  deleteKey?: string
  optional?: boolean
  blockMessage?: string
  resolveForeignValues?: (context: SafeHardDeleteContext) => Promise<Array<string | number>>
  query?: (query: QueryBuilder, context: SafeHardDeleteContext) => QueryBuilder
  deleteQuery?: (query: QueryBuilder, rows: Record<string, any>[], context: SafeHardDeleteContext) => QueryBuilder
  allowCascadeWhen?: (row: Record<string, any>, context: SafeHardDeleteContext) => boolean
}

export interface SafeHardDeleteContext {
  supabase: SupabaseClient
  tableName: string
  recordId: string
  companyId?: string | null
  userId: string | null
  tenantContext: TenantContext | null
  record: Record<string, any>
}

export interface SafeHardDeleteDraftRecordOptions {
  supabase: SupabaseClient
  request?: NextRequest
  tableName: string
  recordId: string
  primaryKey?: string
  select?: string
  companyId?: string | null
  companyIdField?: string
  userId?: string | null
  permissionKey?: string | string[]
  lifecycleStatusField?: string | string[]
  draftStatusValue?: string | string[]
  referenceChecks?: SafeHardDeleteReferenceCheck[]
}

export type SafeHardDeleteDraftRecordResult =
  | {
      ok: true
      record: Record<string, any>
      userId: string | null
      deletedReferences: Array<{ tableName: string; count: number; label: string }>
    }
  | {
      ok: false
      status: number
      code: string
      error: string
      details?: unknown
      record?: Record<string, any>
    }

type SafeHardDeleteFailure = Extract<SafeHardDeleteDraftRecordResult, { ok: false }>

export async function safeHardDeleteDraftRecord(
  options: SafeHardDeleteDraftRecordOptions
): Promise<SafeHardDeleteDraftRecordResult> {
  const primaryKey = options.primaryKey || 'id'
  const select = options.select || '*'
  const permission = await resolvePermission(options)
  if (!permission.ok) return permission
  const tenantContext = options.request ? resolveTenantContext(options.request) : null

  let recordQuery = options.supabase
    .from(options.tableName)
    .select(select)
    .eq(primaryKey, options.recordId)

  recordQuery = applyTenantQueryScope(recordQuery, options.tableName, tenantContext)
  const { data: record, error: fetchError } = await recordQuery.maybeSingle()

  if (fetchError) {
    return failure(500, fetchError.code || 'FETCH_FAILED', fetchError.message)
  }

  if (!record) {
    return failure(404, 'RECORD_NOT_FOUND', 'Silinecek kayıt bulunamadı.')
  }

  const currentRecord = record as Record<string, any>

  if (!isExpectedCompany(currentRecord, options)) {
    return failure(403, 'COMPANY_SCOPE_MISMATCH', 'Kayıt seçili şirket kapsamına ait değil.', undefined, currentRecord)
  }

  if (!isDraftForConfiguredStatus(currentRecord, options)) {
    return failure(409, 'NOT_DRAFT_RECORD', 'Sadece taslak kayıtlar kalıcı olarak silinebilir.', undefined, currentRecord)
  }

  const context: SafeHardDeleteContext = {
    supabase: options.supabase,
    tableName: options.tableName,
    recordId: options.recordId,
    companyId: options.companyId ?? currentRecord[options.companyIdField || 'company_id'] ?? null,
    userId: permission.userId,
    tenantContext,
    record: currentRecord,
  }

  const deletedReferences: Array<{ tableName: string; count: number; label: string }> = []

  for (const check of options.referenceChecks || []) {
    const result = await runReferenceCheck(check, context)
    if (!result.ok) return { ...result, record: currentRecord }
    if (result.deletedCount > 0) {
      deletedReferences.push({
        tableName: check.tableName,
        label: check.label || check.tableName,
        count: result.deletedCount,
      })
    }
  }

  let deleteQuery = options.supabase
    .from(options.tableName)
    .delete()
    .eq(primaryKey, options.recordId)

  deleteQuery = applyTenantQueryScope(deleteQuery, options.tableName, tenantContext)
  const { error: deleteError } = await deleteQuery

  if (deleteError) {
    return failure(
      deleteError.code === '23503' ? 409 : 500,
      deleteError.code || 'HARD_DELETE_FAILED',
      deleteError.code === '23503'
        ? 'Kayıt başka tablolar tarafından kullanıldığı için kalıcı olarak silinemedi.'
        : deleteError.message,
      deleteError,
      currentRecord
    )
  }

  return { ok: true, record: currentRecord, userId: permission.userId, deletedReferences }
}

export function safeHardDeleteDraftRecordResponse(result: SafeHardDeleteDraftRecordResult) {
  if (result.ok) {
    return NextResponse.json({
      success: true,
      hardDeleted: true,
      deletedReferences: result.deletedReferences,
    })
  }

  return NextResponse.json(
    { error: result.error, code: result.code, details: result.details },
    { status: result.status }
  )
}

function isDraftForConfiguredStatus(record: Record<string, any>, options: SafeHardDeleteDraftRecordOptions) {
  const statusFields = toArray(options.lifecycleStatusField)
  if (statusFields.length === 0) return isDraftRecord(record)

  const draftValues = toArray(options.draftStatusValue).length
    ? toArray(options.draftStatusValue)
    : ['draft', 'taslak']

  const normalizedDraftValues = new Set(draftValues.map(normalizeStatus))
  return statusFields.some(field => normalizedDraftValues.has(normalizeStatus(record[field])))
}

function isExpectedCompany(record: Record<string, any>, options: SafeHardDeleteDraftRecordOptions) {
  if (!options.companyId) return true
  const field = options.companyIdField || 'company_id'
  const recordCompanyId = record[field]
  return !recordCompanyId || recordCompanyId === options.companyId
}

async function resolvePermission(options: SafeHardDeleteDraftRecordOptions): Promise<
  | { ok: true; userId: string | null }
  | { ok: false; status: number; code: string; error: string; details?: unknown }
> {
  const permissionKeys = toArray(options.permissionKey)
  if (permissionKeys.length === 0) return { ok: true, userId: options.userId ?? null }

  if (!options.request) {
    return {
      ok: false,
      status: 500,
      code: 'PERMISSION_CONTEXT_MISSING',
      error: 'Kalıcı silme yetki kontrolü için request bağlamı gereklidir.',
    }
  }

  let lastDenied: NextResponse | null = null
  for (const permissionKey of permissionKeys) {
    const permission = await requirePermission(options.request, options.supabase, permissionKey)
    if (!(permission instanceof NextResponse)) return { ok: true, userId: permission.userId ?? options.userId ?? null }
    lastDenied = permission
  }

  const body = await lastDenied?.clone().json().catch(() => ({}))
  return {
    ok: false,
    status: lastDenied?.status || 403,
    code: body?.code || 'PERMISSION_DENIED',
    error: body?.error || 'Kalıcı silme için yetkiniz yok.',
    details: body?.details,
  }
}

async function runReferenceCheck(
  check: SafeHardDeleteReferenceCheck,
  context: SafeHardDeleteContext
): Promise<
  | { ok: true; deletedCount: number }
  | { ok: false; status: number; code: string; error: string; details?: unknown }
> {
  const mode = check.mode || 'block'
  const rowsResult = await fetchReferenceRows(check, context, mode)
  if (!rowsResult.ok) return rowsResult

  const rows = rowsResult.rows
  if (rows.length === 0) return { ok: true, deletedCount: 0 }

  if (mode === 'block') {
    return failure(
      409,
      'REFERENCE_EXISTS',
      check.blockMessage || `${check.label || check.tableName} ilişkisi bulunduğu için kayıt kalıcı olarak silinemez.`,
      { tableName: check.tableName, count: rows.length }
    )
  }

  const blockedRows = check.allowCascadeWhen
    ? rows.filter(row => !check.allowCascadeWhen?.(row, context))
    : []
  if (blockedRows.length > 0) {
    return failure(
      409,
      'REFERENCE_NOT_SAFE_TO_CASCADE',
      `${check.label || check.tableName} içinde kalıcı silmeye uygun olmayan ilişkiler var.`,
      { tableName: check.tableName, count: blockedRows.length }
    )
  }

  const deleteResult = await deleteReferenceRows(check, rows, context)
  if (!deleteResult.ok) return deleteResult
  return { ok: true, deletedCount: rows.length }
}

async function fetchReferenceRows(
  check: SafeHardDeleteReferenceCheck,
  context: SafeHardDeleteContext,
  mode: SafeHardDeleteReferenceMode
): Promise<
  | { ok: true; rows: Record<string, any>[] }
  | { ok: false; status: number; code: string; error: string; details?: unknown }
> {
  const select = check.select || (mode === 'cascadeDelete' ? (check.deleteKey || 'id') : 'id')
  const valuesResult = await safeResolveReferenceValues(check, context)
  if (!valuesResult.ok) return valuesResult
  const values = valuesResult.values
  if (values && values.length === 0) return { ok: true, rows: [] }

  let query = context.supabase.from(check.tableName).select(select)
  query = applyTenantQueryScope(query, check.tableName, context.tenantContext)
  query = applyReferenceFilters(query, check, values)
  if (check.query) query = check.query(query, context)
  if (mode === 'block') query = query.limit(1)

  const { data, error } = await query
  if (error) {
    if (check.optional && isMissingRelationError(error)) return { ok: true, rows: [] }
    return failure(500, error.code || 'REFERENCE_CHECK_FAILED', error.message, {
      tableName: check.tableName,
      label: check.label,
    })
  }

  return { ok: true, rows: data || [] }
}

async function deleteReferenceRows(
  check: SafeHardDeleteReferenceCheck,
  rows: Record<string, any>[],
  context: SafeHardDeleteContext
): Promise<{ ok: true } | { ok: false; status: number; code: string; error: string; details?: unknown }> {
  let query = context.supabase.from(check.tableName).delete()
  query = applyTenantQueryScope(query, check.tableName, context.tenantContext)

  if (check.deleteQuery) {
    query = check.deleteQuery(query, rows, context)
  } else {
    const deleteKey = check.deleteKey || 'id'
    const ids = rows.map(row => row[deleteKey]).filter(value => value !== null && value !== undefined)
    if (ids.length === rows.length && ids.length > 0) {
      query = query.in(deleteKey, ids)
    } else {
      const valuesResult = await safeResolveReferenceValues(check, context)
      if (!valuesResult.ok) return valuesResult
      query = applyReferenceFilters(query, check, valuesResult.values)
      if (check.query) query = check.query(query, context)
    }
  }

  const { error } = await query
  if (error) {
    if (check.optional && isMissingRelationError(error)) return { ok: true }
    return failure(500, error.code || 'REFERENCE_DELETE_FAILED', error.message, {
      tableName: check.tableName,
      label: check.label,
    })
  }

  return { ok: true }
}

async function resolveReferenceValues(check: SafeHardDeleteReferenceCheck, context: SafeHardDeleteContext) {
  if (check.resolveForeignValues) return check.resolveForeignValues(context)
  if (!check.foreignKey) return null
  if (typeof check.foreignValue === 'function') {
    const value = check.foreignValue(context)
    return value ? [value] : []
  }
  return [check.foreignValue || context.recordId]
}

async function safeResolveReferenceValues(
  check: SafeHardDeleteReferenceCheck,
  context: SafeHardDeleteContext
): Promise<{ ok: true; values: Array<string | number> | null } | SafeHardDeleteFailure> {
  try {
    return { ok: true, values: await resolveReferenceValues(check, context) }
  } catch (error: any) {
    if (check.optional && isMissingRelationError(error)) return { ok: true, values: [] }
    return failure(500, error?.code || 'REFERENCE_VALUE_RESOLVE_FAILED', error?.message || 'İlişki değerleri çözümlenemedi.', {
      tableName: check.tableName,
      label: check.label,
    })
  }
}

function applyReferenceFilters(
  query: QueryBuilder,
  check: SafeHardDeleteReferenceCheck,
  values: Array<string | number> | null
) {
  if (check.foreignKey && values) {
    query = values.length === 1
      ? query.eq(check.foreignKey, values[0])
      : query.in(check.foreignKey, values)
  }

  Object.entries(check.match || {}).forEach(([field, value]) => {
    query = value === null ? query.is(field, null) : query.eq(field, value)
  })

  return query
}

function failure(
  status: number,
  code: string,
  error: string,
  details?: unknown,
  record?: Record<string, any>
): SafeHardDeleteFailure {
  return { ok: false, status, code, error, details, record }
}

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
}

function toArray<T>(value?: T | T[] | null): T[] {
  if (Array.isArray(value)) return value
  return value === undefined || value === null ? [] : [value]
}

function isMissingRelationError(error: { code?: string; message?: string }) {
  const message = error.message || ''
  return error.code === '42P01' ||
    error.code === '42703' ||
    message.includes('Could not find the table') ||
    message.includes('Could not find a relationship') ||
    message.includes('column') && message.includes('does not exist')
}
