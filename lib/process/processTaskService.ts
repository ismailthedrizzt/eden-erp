import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyTenantQueryScope,
  withTenantInsertScopeForTable,
  type TenantContext,
} from '@/lib/tenancy/server'
import { createProcessTaskNotification, dismissWorkNotifications } from '@/lib/services/notifications/processNotification.server'
import type { ProcessInstance, ProcessStepDefinition, ProcessTask } from './process.types'

export class ProcessTaskService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantContext: TenantContext
  ) {}

  async createTask(input: {
    process: ProcessInstance
    step: ProcessStepDefinition
    title?: string
    description?: string | null
    assignedTo?: string | null
    payload?: Record<string, any>
  }) {
    const dueAt = input.step.dueInHours
      ? new Date(Date.now() + input.step.dueInHours * 60 * 60 * 1000).toISOString()
      : null
    const row = withTenantInsertScopeForTable({
      tenant_id: input.process.tenant_id || this.tenantContext.tenantId,
      process_instance_id: input.process.id,
      company_id: input.process.company_id || null,
      module_key: input.process.module_key,
      entity_type: input.process.entity_type || null,
      entity_id: input.process.entity_id || null,
      step_key: input.step.key,
      title: input.title || input.step.name,
      description: input.description ?? input.step.description ?? null,
      status: 'open',
      assigned_to: input.assignedTo || null,
      assigned_role: input.step.assigneeRole || null,
      assigned_permission: input.step.assigneePermission || null,
      due_at: dueAt,
      payload_json: input.payload || {},
      result_json: {},
      is_deleted: false,
    }, 'process_tasks', this.tenantContext)

    const { data, error } = await this.supabase.from('process_tasks').insert(row).select('*').single()
    if (error) throw error
    await createProcessTaskNotification(this.supabase, this.tenantContext, data as Record<string, any>).catch(() => undefined)
    return data as ProcessTask
  }

  async get(id: string) {
    let query = this.supabase.from('process_tasks').select('*').eq('id', id).eq('is_deleted', false)
    query = applyTenantQueryScope(query, 'process_tasks', this.tenantContext)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return (data || null) as ProcessTask | null
  }

  async listMyTasks(userId?: string | null, options: { status?: string | null; limit?: number; offset?: number } = {}) {
    let query = this.supabase
      .from('process_tasks')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1)
    query = applyTenantQueryScope(query, 'process_tasks', this.tenantContext)
    if (options.status) query = query.eq('status', options.status)
    else query = query.in('status', ['open', 'in_progress', 'overdue'])
    if (userId) query = query.or(`assigned_to.is.null,assigned_to.eq.${userId}`)
    const { data, error, count } = await query
    if (error) throw error
    return { rows: (data || []) as ProcessTask[], count: count || 0 }
  }

  async listProcessTasks(processInstanceId: string) {
    let query = this.supabase
      .from('process_tasks')
      .select('*')
      .eq('process_instance_id', processInstanceId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
    query = applyTenantQueryScope(query, 'process_tasks', this.tenantContext)
    const { data, error } = await query
    if (error) throw error
    return (data || []) as ProcessTask[]
  }

  async assignTask(taskId: string, assignedTo?: string | null, assignedRole?: string | null, assignedPermission?: string | null) {
    return this.update(taskId, {
      assigned_to: assignedTo || null,
      assigned_role: assignedRole || null,
      assigned_permission: assignedPermission || null,
      status: 'in_progress',
    })
  }

  async completeTask(taskId: string, completedBy?: string | null, result?: Record<string, any>) {
    const task = await this.update(taskId, {
      status: 'completed',
      completed_by: completedBy || null,
      completed_at: new Date().toISOString(),
      result_json: result || {},
    })
    await dismissWorkNotifications(this.supabase, this.tenantContext, { taskId }).catch(() => undefined)
    return task
  }

  async cancelTask(taskId: string, reason?: string | null) {
    const task = await this.update(taskId, {
      status: 'cancelled',
      result_json: reason ? { cancel_reason: reason } : {},
    })
    await dismissWorkNotifications(this.supabase, this.tenantContext, { taskId }).catch(() => undefined)
    return task
  }

  async markTaskOverdue(taskId: string) {
    return this.update(taskId, { status: 'overdue' })
  }

  async addComment(task: ProcessTask, note: string, createdBy?: string | null) {
    const comments = Array.isArray(task.result_json?.comments) ? task.result_json.comments : []
    return this.update(task.id, {
      result_json: {
        ...(task.result_json || {}),
        comments: [
          ...comments,
          {
            note,
            created_by: createdBy || null,
            created_at: new Date().toISOString(),
          },
        ],
      },
    })
  }

  private async update(taskId: string, patch: Record<string, any>) {
    let query = this.supabase
      .from('process_tasks')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select('*')
    query = applyTenantQueryScope(query, 'process_tasks', this.tenantContext)
    const { data, error } = await query.single()
    if (error) throw error
    return data as ProcessTask
  }
}
