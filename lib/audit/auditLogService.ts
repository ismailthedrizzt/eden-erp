import 'server-only'

import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import { getAuditEventDefinition } from './auditEventRegistry'
import { diffAuditValues } from './auditDiff'
import { maskAuditValues } from './auditValueMasking'
import type {
  AuditLogRecord,
  AuditQuery,
  AuditSupabase,
  AuditWriteResult,
  RecordAuditInput,
} from './audit.types'

export class AuditLogService {
  constructor(
    private readonly supabase: AuditSupabase,
    private readonly tenantContext?: TenantContext | null
  ) {}

  async recordAudit(input: RecordAuditInput): Promise<AuditWriteResult> {
    const tenantId = input.context.tenantId || this.tenantContext?.tenantId || null
    if (!tenantId) return { ok: false, code: 'AUDIT_TENANT_REQUIRED', error: 'Audit kaydi icin calisma alani zorunludur.' }

    const definition = getAuditEventDefinition(input.actionType)
    const diff = !input.changedFields?.length && input.oldValues && input.newValues
      ? diffAuditValues(input.oldValues, input.newValues)
      : null
    const oldValues = maskAuditValues(input.oldValues ?? diff?.oldValues ?? null)
    const newValues = maskAuditValues(input.newValues ?? diff?.newValues ?? null)
    const changedFields = input.changedFields?.length ? input.changedFields : diff?.changedFields || []
    const row = {
      tenant_id: tenantId,
      instance_id: tenantId,
      company_id: input.context.companyId || null,
      branch_id: input.context.branchId || null,
      module_key: input.context.moduleKey || null,
      module_code: input.context.moduleKey || null,
      entity_type: input.context.entityType || null,
      entity_id: input.context.entityId || null,
      resource: input.context.entityType || input.context.moduleKey || 'system',
      record_id: input.context.entityId ? String(input.context.entityId) : null,
      action_type: input.actionType,
      action: input.actionKey || input.actionType,
      action_key: input.actionKey || null,
      operation_id: input.context.operationId || null,
      process_instance_id: input.context.processInstanceId || null,
      task_id: input.context.taskId || null,
      approval_id: input.context.approvalId || null,
      outbox_event_id: input.context.outboxEventId || null,
      user_id: input.context.userId || null,
      user_label: input.context.userLabel || null,
      permission_key: input.context.permissionKey || null,
      policy_key: input.context.policyKey || null,
      request_id: input.context.requestId || null,
      session_id: input.context.sessionId || null,
      ip_address: input.context.ipAddress || null,
      user_agent: input.context.userAgent || null,
      old_values: oldValues,
      new_values: newValues,
      before_json: oldValues,
      after_json: newValues,
      changed_fields: changedFields,
      summary: input.summary || definition?.label || null,
      reason: input.reason || null,
      result_status: input.resultStatus || definition?.resultStatus || 'success',
      severity: input.severity || definition?.defaultSeverity || 'info',
      metadata_json: maskAuditValues(input.metadata || {}),
    }

    const { data, error } = await this.supabase.from('audit_logs').insert(row).select('id').maybeSingle()
    if (!error) return { ok: true, id: data?.id }
    if (isMissingNewAuditColumnError(error)) return this.recordLegacyAudit(row)
    if (isMissingInfrastructureError(error)) return { ok: false, code: 'AUDIT_INFRASTRUCTURE_MISSING', error: error.message }
    console.error('Audit log write failed:', error.message)
    return { ok: false, code: 'AUDIT_WRITE_FAILED', error: error.message }
  }

  recordView(input: Omit<RecordAuditInput, 'actionType'>) {
    return this.recordAudit({ ...input, actionType: 'view' })
  }

  recordCreate(input: Omit<RecordAuditInput, 'actionType'>) {
    return this.recordAudit({ ...input, actionType: 'create' })
  }

  recordUpdate(input: Omit<RecordAuditInput, 'actionType'>) {
    return this.recordAudit({ ...input, actionType: 'update' })
  }

  recordDelete(input: Omit<RecordAuditInput, 'actionType'>) {
    return this.recordAudit({ ...input, actionType: 'delete', severity: input.severity || 'warning' })
  }

  recordOperationStart(input: Omit<RecordAuditInput, 'actionType' | 'resultStatus'>) {
    return this.recordAudit({ ...input, actionType: 'operation_start', resultStatus: 'pending' })
  }

  recordOperationComplete(input: Omit<RecordAuditInput, 'actionType' | 'resultStatus'>) {
    return this.recordAudit({ ...input, actionType: 'operation_complete', resultStatus: 'success' })
  }

  recordOperationFail(input: Omit<RecordAuditInput, 'actionType' | 'resultStatus' | 'severity'>) {
    return this.recordAudit({ ...input, actionType: 'operation_fail', resultStatus: 'failed', severity: 'error' })
  }

  recordProcessEvent(input: RecordAuditInput) {
    return this.recordAudit(input)
  }

  recordPermissionDenied(input: Omit<RecordAuditInput, 'actionType' | 'resultStatus' | 'severity'>) {
    return this.recordAudit({ ...input, actionType: 'permission_denied', resultStatus: 'denied', severity: 'warning' })
  }

  recordPolicyDenied(input: Omit<RecordAuditInput, 'actionType' | 'resultStatus' | 'severity'>) {
    return this.recordAudit({ ...input, actionType: 'policy_denied', resultStatus: 'denied', severity: 'warning' })
  }

  recordDocumentEvent(actionType: 'document_upload' | 'document_delete' | 'document_version_update', input: Omit<RecordAuditInput, 'actionType'>) {
    return this.recordAudit({ ...input, actionType })
  }

  async listAuditLogs(query: AuditQuery) {
    const page = Math.max(1, Number(query.page || 1))
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 50)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    let dbQuery = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    dbQuery = applyTenantQueryScope(dbQuery, 'audit_logs', this.tenantContext || { tenantId: query.tenantId } as TenantContext)
    if (query.entityType) dbQuery = dbQuery.eq('entity_type', query.entityType)
    if (query.entityId) dbQuery = dbQuery.eq('entity_id', query.entityId)
    if (query.companyId) dbQuery = dbQuery.eq('company_id', query.companyId)
    if (query.branchId) dbQuery = dbQuery.eq('branch_id', query.branchId)
    if (query.moduleKey) dbQuery = dbQuery.eq('module_key', query.moduleKey)
    if (query.actionType) dbQuery = dbQuery.eq('action_type', query.actionType)
    if (query.userId) dbQuery = dbQuery.eq('user_id', query.userId)
    if (query.operationId) dbQuery = dbQuery.eq('operation_id', query.operationId)
    if (query.processInstanceId) dbQuery = dbQuery.eq('process_instance_id', query.processInstanceId)
    if (query.dateFrom) dbQuery = dbQuery.gte('created_at', query.dateFrom)
    if (query.dateTo) dbQuery = dbQuery.lte('created_at', query.dateTo)

    const { data, error, count } = await dbQuery
    if (error) throw error
    const total = count || 0
    return {
      data: (data || []).map(normalizeAuditRow) as AuditLogRecord[],
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  }

  async getAuditLog(id: string, tenantId: string) {
    let query = this.supabase.from('audit_logs').select('*').eq('id', id)
    query = applyTenantQueryScope(query, 'audit_logs', this.tenantContext || { tenantId } as TenantContext)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data ? normalizeAuditRow(data) as AuditLogRecord : null
  }

  listAuditByRecord(entityType: string, entityId: string, tenantId: string, page?: number, pageSize?: number) {
    return this.listAuditLogs({ tenantId, entityType, entityId, page, pageSize })
  }

  listAuditByOperation(operationId: string, tenantId: string, page?: number, pageSize?: number) {
    return this.listAuditLogs({ tenantId, operationId, page, pageSize })
  }

  listAuditByProcess(processInstanceId: string, tenantId: string, page?: number, pageSize?: number) {
    return this.listAuditLogs({ tenantId, processInstanceId, page, pageSize })
  }

  private async recordLegacyAudit(row: Record<string, any>): Promise<AuditWriteResult> {
    const legacyRow = {
      instance_id: row.tenant_id,
      user_id: row.user_id,
      module_code: row.module_key,
      resource: row.entity_type || row.resource || 'system',
      record_id: row.entity_id ? String(row.entity_id) : row.record_id,
      action: row.action_key || row.action_type,
      before_json: row.old_values,
      after_json: row.new_values,
      metadata_json: {
        ...(row.metadata_json || {}),
        action_type: row.action_type,
        company_id: row.company_id,
        branch_id: row.branch_id,
        operation_id: row.operation_id,
        process_instance_id: row.process_instance_id,
        result_status: row.result_status,
        severity: row.severity,
        summary: row.summary,
        reason: row.reason,
      },
    }
    const { data, error } = await this.supabase.from('audit_logs').insert(legacyRow).select('id').maybeSingle()
    if (error) {
      if (!isMissingInfrastructureError(error)) console.error('Legacy audit log write failed:', error.message)
      return { ok: false, code: 'AUDIT_LEGACY_WRITE_FAILED', error: error.message }
    }
    return { ok: true, id: data?.id }
  }
}

export function normalizeAuditRow(row: Record<string, any>) {
  const metadata = row.metadata_json || {}
  return {
    ...row,
    tenant_id: row.tenant_id || row.instance_id,
    module_key: row.module_key || row.module_code || metadata.module_key || null,
    entity_type: row.entity_type || row.resource || metadata.entity_type || null,
    entity_id: row.entity_id || row.record_id || metadata.entity_id || null,
    action_type: row.action_type || metadata.action_type || row.action,
    action_key: row.action_key || (row.action !== row.action_type ? row.action : null),
    old_values: row.old_values ?? row.before_json ?? null,
    new_values: row.new_values ?? row.after_json ?? null,
    changed_fields: row.changed_fields || metadata.changed_fields || [],
    summary: row.summary || metadata.summary || null,
    reason: row.reason || metadata.reason || null,
    result_status: row.result_status || metadata.result_status || 'success',
    severity: row.severity || metadata.severity || 'info',
  }
}

export function createAuditLogService(supabase: AuditSupabase, tenantContext?: TenantContext | null) {
  return new AuditLogService(supabase, tenantContext)
}

function isMissingNewAuditColumnError(error: { code?: string; message?: string }) {
  const message = error.message || ''
  return error.code === '42703'
    || error.code === 'PGRST204'
    || message.includes('Could not find')
    || message.includes('schema cache')
    || message.includes('column')
}
