import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyTenantQueryScope,
  withTenantInsertScopeForTable,
  type TenantContext,
} from '@/lib/tenancy/server'
import type { ProcessApproval, ProcessInstance, ProcessStepDefinition } from './process.types'

export class ProcessApprovalService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantContext: TenantContext
  ) {}

  async createApproval(input: {
    process: ProcessInstance
    step: ProcessStepDefinition
    taskId?: string | null
    requestedBy?: string | null
    payload?: Record<string, any>
  }) {
    const row = withTenantInsertScopeForTable({
      tenant_id: input.process.tenant_id || this.tenantContext.tenantId,
      process_instance_id: input.process.id,
      task_id: input.taskId || null,
      company_id: input.process.company_id || null,
      module_key: input.process.module_key,
      approval_type: input.step.operationKey || input.process.operation_key || input.step.key,
      status: 'pending',
      requested_by: input.requestedBy || null,
      approver_role: input.step.assigneeRole || null,
      approver_permission: input.step.assigneePermission || null,
      payload_json: input.payload || {},
    }, 'process_approvals', this.tenantContext)

    const { data, error } = await this.supabase.from('process_approvals').insert(row).select('*').single()
    if (error) throw error
    return data as ProcessApproval
  }

  async get(id: string) {
    let query = this.supabase.from('process_approvals').select('*').eq('id', id)
    query = applyTenantQueryScope(query, 'process_approvals', this.tenantContext)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return (data || null) as ProcessApproval | null
  }

  async listPendingApprovals(options: { limit?: number; offset?: number } = {}) {
    let query = this.supabase
      .from('process_approvals')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1)
    query = applyTenantQueryScope(query, 'process_approvals', this.tenantContext)
    const { data, error, count } = await query
    if (error) throw error
    return { rows: (data || []) as ProcessApproval[], count: count || 0 }
  }

  async approve(id: string, approverId?: string | null, decisionNote?: string | null) {
    return this.update(id, {
      status: 'approved',
      approver_id: approverId || null,
      decision_note: decisionNote || null,
      decided_at: new Date().toISOString(),
    })
  }

  async reject(id: string, approverId?: string | null, decisionNote?: string | null) {
    return this.update(id, {
      status: 'rejected',
      approver_id: approverId || null,
      decision_note: decisionNote || null,
      decided_at: new Date().toISOString(),
    })
  }

  async cancelApproval(id: string, reason?: string | null) {
    return this.update(id, {
      status: 'cancelled',
      decision_note: reason || null,
      decided_at: new Date().toISOString(),
    })
  }

  async getApprovalStatus(id: string) {
    const approval = await this.get(id)
    return approval?.status || null
  }

  private async update(id: string, patch: Record<string, any>) {
    let query = this.supabase
      .from('process_approvals')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
    query = applyTenantQueryScope(query, 'process_approvals', this.tenantContext)
    const { data, error } = await query.single()
    if (error) throw error
    return data as ProcessApproval
  }
}
