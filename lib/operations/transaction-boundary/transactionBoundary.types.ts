import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantContext } from '@/lib/tenancy/server'

export interface TransactionBoundaryInput<TData = any> {
  supabase: SupabaseClient
  key: string
  rpcName?: string
  payload: Record<string, any>
  tenantContext?: TenantContext | null
  companyId?: string | null
  operationId?: string | null
  processInstanceId?: string | null
  fallback?: () => Promise<TransactionBoundaryResult<TData> | TData>
  compensation?: (partialResult: any, error: unknown) => Promise<void>
  options?: {
    preferRpc?: boolean
    allowFallback?: boolean
    requireRpc?: boolean
  }
}

export interface TransactionBoundaryResult<TData = any> {
  ok: boolean
  mode: 'rpc' | 'fallback' | 'noop'
  status: number
  code?: string
  error?: string
  data?: TData
  partial?: boolean
  compensation_applied?: boolean
  warnings?: string[]
  details?: any
}

export interface RpcContract {
  key: string
  rpcName: string
  operationKey: string
  moduleKey: string
  required: boolean
  status: 'planned' | 'available' | 'deprecated'
  payloadVersion: string
  fallbackAllowed: boolean
  description?: string
}
