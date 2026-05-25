import 'server-only'

import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ListQuery } from '@/lib/api/listEndpoint'
import { safeListRecords, type SafeCrudResult } from '@/lib/crud/safeCrudService'
import { getListProjection, listProjectionInfo, listProjectionSelect } from '@/lib/read-models/readModelRegistry'

type QueryBuilder = any
type CrudRecord = Record<string, any>

export interface ListProjectionRecordsOptions {
  supabase: SupabaseClient
  request: NextRequest
  projectionKey: string
  permissionKey: string | string[]
  listQuery: Pick<ListQuery, 'page' | 'pageSize' | 'search' | 'sort' | 'direction' | 'includePassive'>
  filters?: Record<string, unknown>
  query?: (query: QueryBuilder) => QueryBuilder
  afterList?: (context: { supabase: SupabaseClient; userId: string | null; rows: CrudRecord[] }) => Promise<CrudRecord[]> | CrudRecord[]
}

export async function listProjectionRecords(options: ListProjectionRecordsOptions): Promise<SafeCrudResult<CrudRecord[]>> {
  const config = getListProjection(options.projectionKey)
  if (!config) {
    return {
      ok: false,
      status: 500,
      code: 'LIST_PROJECTION_NOT_REGISTERED',
      error: `${options.projectionKey} list projection kayitli degil.`,
    }
  }

  const result = await safeListRecords({
    supabase: options.supabase,
    request: options.request,
    tableName: config.sourceName,
    permissionKey: options.permissionKey,
    select: listProjectionSelect(config),
    listQuery: options.listQuery,
    sortMap: config.sortableFields,
    defaultSort: config.defaultSort,
    searchFields: config.searchableFields,
    passiveField: config.statusField,
    passiveValue: config.passiveValue,
    filters: options.filters,
    query: options.query,
    afterList: options.afterList,
  })

  if (!result.ok) return result
  return {
    ...result,
    meta: {
      ...(typeof result.meta === 'object' && result.meta ? result.meta : {}),
      projection: listProjectionInfo(config),
    },
  }
}

export function projectionResponseMeta(meta: unknown) {
  if (!meta || typeof meta !== 'object') return {}
  const record = meta as Record<string, unknown>
  const { projection, ...rest } = record
  return {
    meta: rest,
    projection,
  }
}

