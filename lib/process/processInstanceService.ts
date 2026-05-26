import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyTenantQueryScope,
  withTenantInsertScopeForTable,
  type TenantContext,
} from '@/lib/tenancy/server'
import type {
  ProcessDefinition,
  ProcessInstance,
  ProcessInstanceStatus,
  ProcessStartInput,
} from './process.types'

export class ProcessInstanceService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantContext: TenantContext
  ) {}

  async create(definition: ProcessDefinition, input: ProcessStartInput, firstStepKey?: string | null) {
    const status: ProcessInstanceStatus = firstStepKey ? 'active' : 'completed'
    const row = withTenantInsertScopeForTable({
      tenant_id: input.tenantContext.tenantId,
      company_id: input.companyId || null,
      module_key: definition.moduleKey,
      process_key: definition.key,
      process_version: definition.version,
      entity_type: input.entityType || definition.entityType,
      entity_id: input.entityId || null,
      operation_key: input.operationKey || definition.operationKey || null,
      status,
      current_step_key: firstStepKey || null,
      payload_json: input.payload || {},
      result_json: {},
      warnings: [],
      started_by: input.startedBy || null,
      started_at: new Date().toISOString(),
      version: 1,
      is_deleted: false,
    }, 'process_instances', this.tenantContext)

    const { data, error } = await this.supabase
      .from('process_instances')
      .insert(row)
      .select('*')
      .single()
    if (error) throw error
    return data as ProcessInstance
  }

  async get(id: string) {
    let query = this.supabase
      .from('process_instances')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
    query = applyTenantQueryScope(query, 'process_instances', this.tenantContext)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return (data || null) as ProcessInstance | null
  }

  async list(options: {
    status?: string | null
    moduleKey?: string | null
    companyId?: string | null
    limit?: number
    offset?: number
  } = {}) {
    let query = this.supabase
      .from('process_instances')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1)
    query = applyTenantQueryScope(query, 'process_instances', this.tenantContext)
    if (options.status) query = query.eq('status', options.status)
    if (options.moduleKey) query = query.eq('module_key', options.moduleKey)
    if (options.companyId) query = query.eq('company_id', options.companyId)
    const { data, error, count } = await query
    if (error) throw error
    return { rows: (data || []) as ProcessInstance[], count: count || 0 }
  }

  async update(id: string, patch: Record<string, any>) {
    let query = this.supabase
      .from('process_instances')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
    query = applyTenantQueryScope(query, 'process_instances', this.tenantContext)
    const { data, error } = await query.single()
    if (error) throw error
    return data as ProcessInstance
  }

  async moveToStep(instance: ProcessInstance, stepKey: string | null, status: ProcessInstanceStatus) {
    return this.update(instance.id, {
      current_step_key: stepKey,
      status,
      version: Number(instance.version || 1) + 1,
    })
  }

  async complete(instance: ProcessInstance, result: Record<string, any>, completedBy?: string | null) {
    return this.update(instance.id, {
      status: 'completed',
      current_step_key: 'completed',
      result_json: result || {},
      completed_by: completedBy || null,
      completed_at: new Date().toISOString(),
      version: Number(instance.version || 1) + 1,
    })
  }

  async cancel(instance: ProcessInstance, reason: string, cancelledBy?: string | null) {
    return this.update(instance.id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      result_json: {
        ...(instance.result_json || {}),
        cancel_reason: reason,
        cancelled_by: cancelledBy || null,
      },
      version: Number(instance.version || 1) + 1,
    })
  }

  async fail(instance: ProcessInstance, error: Record<string, any>) {
    return this.update(instance.id, {
      status: 'failed',
      result_json: {
        ...(instance.result_json || {}),
        error,
      },
      version: Number(instance.version || 1) + 1,
    })
  }
}
