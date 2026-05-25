import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { OperationRequestInput, OperationRequestRecord, OperationStatus } from '@/lib/operations/types'

type OperationCreateResult =
  | { ok: true; operation: OperationRequestRecord; duplicate: boolean }
  | { ok: false; missingInfrastructure?: boolean; error: string; code?: string }

export class OperationRequestService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createOrGet(input: OperationRequestInput): Promise<OperationCreateResult> {
    const clientRequestId = input.clientRequestId || cryptoRandomFallback()
    const row = {
      tenant_id: input.tenantId,
      company_id: input.companyId || null,
      module_key: input.moduleKey,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      operation_type: input.operationType,
      operation_status: 'accepted' as OperationStatus,
      client_request_id: clientRequestId,
      base_version: input.baseVersion ?? null,
      base_updated_at: input.baseUpdatedAt ?? null,
      requested_by: input.requestedBy || null,
      payload_json: input.payload || {},
    }

    const { data, error } = await this.supabase
      .from('operation_requests')
      .insert(row)
      .select('*')
      .single()

    if (!error && data) {
      return { ok: true, operation: data as OperationRequestRecord, duplicate: false }
    }

    if (isDuplicateError(error)) {
      const existing = await this.findByClientRequestId(input.tenantId, clientRequestId)
      if (existing) return { ok: true, operation: existing, duplicate: true }
    }

    if (isMissingInfrastructureError(error)) {
      return { ok: false, missingInfrastructure: true, error: error?.message || 'Operation altyapısı henüz uygulanmamış.', code: error?.code }
    }

    return { ok: false, error: error?.message || 'Operation kaydı oluşturulamadı.', code: error?.code }
  }

  async markProcessing(operationId: string) {
    return this.update(operationId, {
      operation_status: 'processing',
      started_at: new Date().toISOString(),
    })
  }

  async markCompleted(operationId: string, result: Record<string, any>, warnings?: unknown) {
    return this.update(operationId, {
      operation_status: 'completed',
      result_json: result,
      warning_json: warnings ? { warnings } : null,
      completed_at: new Date().toISOString(),
    })
  }

  async markFailed(operationId: string, error: Record<string, any>) {
    return this.update(operationId, {
      operation_status: 'failed',
      error_json: error,
      failed_at: new Date().toISOString(),
    })
  }

  private async findByClientRequestId(tenantId: string, clientRequestId: string) {
    const { data } = await this.supabase
      .from('operation_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('client_request_id', clientRequestId)
      .maybeSingle()

    return (data || null) as OperationRequestRecord | null
  }

  private async update(operationId: string, patch: Record<string, any>) {
    const { data, error } = await this.supabase
      .from('operation_requests')
      .update(patch)
      .eq('id', operationId)
      .select('*')
      .single()

    if (error || !data) return null
    return data as OperationRequestRecord
  }
}

function isDuplicateError(error: { code?: string } | null) {
  return error?.code === '23505'
}

export function isMissingInfrastructureError(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message || ''
  return error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('Could not find')
}

function cryptoRandomFallback() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

