import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import { isMissingTableError } from './companyErrors'

export type CompanyRelatedSectionStatus = 'ok' | 'module_closed' | 'error'

export type CompanyRelatedSectionResult<T = any> = {
  key: string
  data: T
  status: CompanyRelatedSectionStatus
  error: any | null
  message?: string
}

type FetchCompanyRelatedSectionOptions<T> = {
  supabase: ReturnType<typeof createServiceClient>
  table: string
  key: string
  label: string
  companyId: string
  tenantContext: TenantContext
  select?: string
  mode?: 'list' | 'maybeSingle' | 'single'
  optional?: boolean
  fallback: T
  query?: (query: any) => any
}

export async function fetchCompanyRelatedSection<T = any>(
  options: FetchCompanyRelatedSectionOptions<T>
): Promise<CompanyRelatedSectionResult<T>> {
  const mode = options.mode || 'list'
  let query = options.supabase
    .from(options.table)
    .select(options.select || '*')

  query = options.query ? options.query(query) : query.eq('company_id', options.companyId)
  query = applyTenantQueryScope(query, options.table, options.tenantContext)

  const response = await runRelatedQuery(query, mode)
  const { data, error } = response

  if (error) {
    if (options.optional !== false && isMissingTableError(error)) {
      return {
        key: options.key,
        data: options.fallback,
        status: 'module_closed',
        error,
        message: `${options.label} modülü kapalı veya ilgili migration uygulanmamış.`,
      }
    }

    return {
      key: options.key,
      data: options.fallback,
      status: 'error',
      error,
      message: `${options.label} yüklenemedi.`,
    }
  }

  return {
    key: options.key,
    data: (data ?? options.fallback) as T,
    status: 'ok',
    error: null,
  }
}

export function relatedStatusMap(results: Array<CompanyRelatedSectionResult<any>>) {
  return Object.fromEntries(results.map(result => [result.key, result.status]))
}

export function relatedErrorMap(results: Array<CompanyRelatedSectionResult<any>>) {
  return Object.fromEntries(
    results
      .filter(result => result.status !== 'ok')
      .map(result => [result.key, result.message || 'Bağlı veri yüklenemedi.'])
  )
}

async function runRelatedQuery(query: any, mode: 'list' | 'maybeSingle' | 'single') {
  if (mode === 'maybeSingle') return query.maybeSingle()
  if (mode === 'single') return query.single()
  return query
}
