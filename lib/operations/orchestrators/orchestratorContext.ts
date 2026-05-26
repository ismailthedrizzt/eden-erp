import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId } from '@/lib/operations/idempotency'
import { resolveTenantContext, type TenantContext } from '@/lib/tenancy/server'
import type { OperationExecutionContext } from './types'

export function buildOperationExecutionContext<TPayload>({
  supabase,
  request,
  tenantContext,
  userId,
  companyId,
  recordId,
  payload,
  rawBody,
}: {
  supabase: SupabaseClient
  request: NextRequest
  tenantContext?: TenantContext | null
  userId?: string | null
  companyId?: string | null
  recordId?: string | null
  payload: TPayload
  rawBody?: Record<string, any> | null
}): OperationExecutionContext<TPayload> {
  const source = rawBody || (payload && typeof payload === 'object' ? payload as Record<string, any> : {})
  return {
    supabase,
    request,
    tenantContext: tenantContext || resolveTenantContext(request),
    userId: userId || null,
    companyId: companyId || null,
    recordId: recordId || null,
    clientRequestId: resolveClientRequestId(request, source),
    baseVersion: resolveBaseVersion(source),
    baseUpdatedAt: resolveBaseUpdatedAt(source),
    payload,
  }
}
