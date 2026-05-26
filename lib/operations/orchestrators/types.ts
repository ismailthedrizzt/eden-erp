import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantContext } from '@/lib/tenancy/server'
import type { OperationRequestRecord } from '@/lib/operations/types'

export type OperationOrchestratorResult<TData = any> = {
  ok: boolean
  status: number
  code?: string
  error?: string
  data?: TData
  operation_id?: string
  operation_status?: string
  warnings?: string[]
  details?: any
}

export type OperationExecutionContext<TPayload = Record<string, any>> = {
  supabase: SupabaseClient
  request: NextRequest
  tenantContext: TenantContext
  userId: string | null
  companyId?: string | null
  recordId?: string | null
  clientRequestId?: string | null
  baseVersion?: number | null
  baseUpdatedAt?: string | null
  operation?: OperationRequestRecord | null
  payload: TPayload
}

export type OperationBoundaryFallback<TData> = () => Promise<TData>
