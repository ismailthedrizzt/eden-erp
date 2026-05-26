import type { TenantContext } from '@/lib/tenancy/server'

export interface DomainServiceContext {
  supabase: any
  tenantContext: TenantContext
  userId?: string | null
  companyId?: string | null
  operationId?: string | null
  processInstanceId?: string | null
  requestId?: string | null
}

export interface DomainServiceResult<T = unknown> {
  ok: boolean
  data?: T
  status?: number
  code?: string
  error?: string
  warnings?: string[]
  details?: any
}

