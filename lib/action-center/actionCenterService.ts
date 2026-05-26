import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { buildActionCenterSummary } from './actionCenterProjection'
import { canDismissActionItem, canSeeSystemActionItems, isItemWithinCompanyScope } from './actionCenterGuards'
import {
  approvalTitle,
  moduleLabel,
  operationLabel,
  operationTitle,
  outboxTitle,
  processTaskStatusLabel,
  recordTargetPage,
} from './actionCenterMessages'
import type {
  ActionCenterContext,
  ActionCenterListResult,
  ActionCenterPriority,
  ActionCenterQuery,
  ActionCenterSeverity,
  UnifiedActionItem,
} from './actionCenter.types'

type SourceResult<T> = { data: T[]; warning?: string | null }

const DEFAULT_PAGE_SIZE = 20
const STUCK_OPERATION_MINUTES = 10
const STALE_OUTBOX_MINUTES = 15

export async function listActionCenterItems(
  context: ActionCenterContext,
  query: ActionCenterQuery = {}
): Promise<ActionCenterListResult> {
  const normalizedQuery = normalizeActionCenterQuery(query)
  const [tasks, approvals, operations, outboxEvents] = await Promise.all([
    fetchProcessTasks(context, normalizedQuery),
    fetchApprovals(context),
    fetchOperations(context),
    fetchOutboxEvents(context),
  ])

  const warnings = [tasks.warning, approvals.warning, operations.warning, outboxEvents.warning].filter(Boolean) as string[]
  const rawItems = [
    ...tasks.data.map(task => normalizeProcessTaskToActionItem(task, context.tenantId)),
    ...approvals.data.map(approval => normalizeApprovalToActionItem(approval, context.tenantId)),
    ...operations.data.map(operation => normalizeOperationToActionItem(operation, context.tenantId)),
    ...outboxEvents.data.map(event => normalizeOutboxEventToActionItem(event, context.tenantId)),
  ].filter(item => item && isItemWithinCompanyScope(item, context.scopedCompanyIds))

  const filteredItems = filterActionItems(rawItems, normalizedQuery)
  const sortedItems = sortActionItems(filteredItems)
  const total = sortedItems.length
  const page = normalizedQuery.page || 1
  const pageSize = normalizedQuery.pageSize || DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const data = sortedItems.slice(from, from + pageSize)

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    summary: buildActionCenterSummary(filteredItems),
    ...(warnings.length ? { warnings } : {}),
  }
}

export async function getActionCenterCounts(context: ActionCenterContext) {
  const result = await listActionCenterItems(context, { page: 1, pageSize: 1 })
  return result.summary
}

export async function getActionCenterSummary(context: ActionCenterContext) {
  const result = await listActionCenterItems(context, { page: 1, pageSize: 1 })
  return result.summary
}

export async function listRecordActionItems(
  context: ActionCenterContext,
  entityType: string,
  entityId: string
) {
  return listActionCenterItems(context, {
    entity_type: entityType,
    entity_id: entityId,
    page: 1,
    pageSize: 30,
  })
}

export async function dismissActionItem(input: { context: ActionCenterContext; itemId: string }) {
  const result = await listActionCenterItems(input.context, { page: 1, pageSize: 100 })
  const item = result.data.find(candidate => candidate.id === input.itemId)
  if (!item) {
    return {
      ok: false,
      status: 404,
      error: 'Bekleyen is bulunamadi.',
      code: 'ACTION_ITEM_NOT_FOUND',
    }
  }
  if (!canDismissActionItem(item)) {
    return {
      ok: false,
      status: 409,
      error: 'Bu is, tamamlanmadan veya ilgili karar verilmeden kapatilamaz.',
      code: 'ACTION_ITEM_DISMISS_NOT_ALLOWED',
    }
  }
  return { ok: true, status: 200, data: { id: item.id, status: 'dismissed' } }
}

export async function resolveActionItem(input: { context: ActionCenterContext; itemId: string }) {
  return {
    ok: false,
    status: 409,
    error: 'Bu is icin otomatik tamamlama henuz desteklenmiyor.',
    code: 'ACTION_ITEM_RESOLVE_NOT_SUPPORTED',
    details: { itemId: input.itemId },
  }
}

export function normalizeProcessTaskToActionItem(task: Record<string, any>, tenantId: string): UnifiedActionItem {
  const status = task.status === 'in_progress' ? 'in_progress' : 'open'
  const overdue = task.status === 'overdue' || isPastDue(task.due_at)
  const entityType = task.entity_type || null
  const entityId = task.entity_id || null
  return {
    id: `process_task:${task.id}`,
    tenant_id: task.tenant_id || tenantId,
    company_id: task.company_id || null,
    module_key: task.module_key || 'process',
    source_type: 'process_task',
    source_id: String(task.id),
    title: task.title || 'Tamamlanacak gorev var',
    description: task.description || `${moduleLabel(task.module_key)} icin surec gorevi bekliyor.`,
    status,
    severity: overdue ? 'warning' : 'info',
    priority: overdue ? 'high' : 'normal',
    process_instance_id: task.process_instance_id || null,
    task_id: task.id || null,
    entity_type: entityType,
    entity_id: entityId,
    due_at: task.due_at || null,
    created_at: task.created_at || nowIso(),
    updated_at: task.updated_at || null,
    target_page: task.process_instance_id ? `/app/surecler/${task.process_instance_id}` : recordTargetPage(entityType, entityId, task.company_id),
    suggested_actions: [
      {
        label: 'Gorevi Ac',
        action_type: 'open_process',
        target_page: task.process_instance_id ? `/app/surecler/${task.process_instance_id}` : undefined,
        process_instance_id: task.process_instance_id || undefined,
      },
      {
        label: 'Gorevi Tamamla',
        action_type: 'navigate',
        target_page: task.process_instance_id ? `/app/surecler/${task.process_instance_id}` : undefined,
      },
    ],
  }
}

export function normalizeApprovalToActionItem(approval: Record<string, any>, tenantId: string): UnifiedActionItem {
  const entityType = approval.payload_json?.entity_type || null
  const entityId = approval.payload_json?.entity_id || null
  return {
    id: `approval:${approval.id}`,
    tenant_id: approval.tenant_id || tenantId,
    company_id: approval.company_id || null,
    module_key: approval.module_key || 'process',
    source_type: 'approval',
    source_id: String(approval.id),
    title: approvalTitle(),
    description: `${moduleLabel(approval.module_key)} icin ${operationLabel(approval.approval_type)} karari bekliyor.`,
    status: approval.status === 'pending' ? 'waiting' : 'completed',
    severity: 'warning',
    priority: 'high',
    process_instance_id: approval.process_instance_id || null,
    task_id: approval.task_id || null,
    approval_id: approval.id || null,
    entity_type: entityType,
    entity_id: entityId,
    created_at: approval.requested_at || approval.created_at || nowIso(),
    updated_at: approval.updated_at || null,
    target_page: approval.process_instance_id ? `/app/surecler/${approval.process_instance_id}` : '/app/surecler',
    suggested_actions: [
      {
        label: 'Sureci Ac',
        action_type: 'open_process',
        target_page: approval.process_instance_id ? `/app/surecler/${approval.process_instance_id}` : '/app/surecler',
        process_instance_id: approval.process_instance_id || undefined,
      },
      {
        label: 'Onayla',
        action_type: 'navigate',
        target_page: approval.process_instance_id ? `/app/surecler/${approval.process_instance_id}` : '/app/surecler',
      },
      {
        label: 'Reddet',
        action_type: 'navigate',
        target_page: approval.process_instance_id ? `/app/surecler/${approval.process_instance_id}` : '/app/surecler',
      },
    ],
  }
}

export function normalizeOperationToActionItem(operation: Record<string, any>, tenantId: string): UnifiedActionItem {
  const operationStatus = String(operation.operation_status || '')
  const failed = operationStatus === 'failed'
  const requiresAction = operationStatus === 'requires_action'
  const processing = ['accepted', 'processing', 'pending'].includes(operationStatus)
  const entityType = operation.entity_type || null
  const entityId = operation.entity_id || null
  return {
    id: `operation:${operation.id}`,
    tenant_id: operation.tenant_id || tenantId,
    company_id: operation.company_id || null,
    module_key: operation.module_key || 'system',
    source_type: 'operation',
    source_id: String(operation.id),
    title: operationTitle(operationStatus),
    description: failed
      ? `${operationLabel(operation.operation_type)} tamamlanamadi. Detayi acip tekrar deneyebilirsiniz.`
      : requiresAction
        ? `${operationLabel(operation.operation_type)} icin bir kullanici adimi bekleniyor.`
        : `${operationLabel(operation.operation_type)} beklenenden uzun surdu.`,
    status: failed ? 'failed' : requiresAction ? 'waiting' : processing ? 'in_progress' : 'open',
    severity: failed ? 'error' : 'warning',
    priority: failed ? 'high' : 'normal',
    action_key: operation.operation_type || null,
    operation_id: operation.id || null,
    entity_type: entityType,
    entity_id: entityId,
    created_at: operation.created_at || nowIso(),
    updated_at: operation.failed_at || operation.completed_at || operation.started_at || null,
    target_page: recordTargetPage(entityType, entityId, operation.company_id),
    suggested_actions: [
      {
        label: 'Islem Detayini Ac',
        action_type: 'open_record',
        target_page: recordTargetPage(entityType, entityId, operation.company_id),
        record_id: entityId || operation.company_id || undefined,
        operation_id: operation.id || undefined,
      },
      {
        label: 'Tekrar Dene',
        action_type: 'retry',
        operation_id: operation.id || undefined,
        disabled: true,
        disabled_reason: 'Bu islem otomatik tekrar denemeyi henuz desteklemiyor.',
      },
    ],
  }
}

export function normalizeOutboxEventToActionItem(event: Record<string, any>, tenantId: string): UnifiedActionItem {
  const status = String(event.status || '')
  const aggregateType = event.aggregate_type || null
  const aggregateId = event.aggregate_id || null
  return {
    id: `outbox:${event.id}`,
    tenant_id: event.tenant_id || tenantId,
    company_id: event.company_id || null,
    module_key: event.module_key || 'system',
    source_type: 'outbox',
    source_id: String(event.id),
    title: outboxTitle(status),
    description: 'Kayitlariniz korunur; sistem guncellemesi arka planda tekrar denenebilir.',
    status: status === 'failed' || status === 'skipped' ? 'failed' : 'waiting',
    severity: status === 'failed' ? 'error' : 'warning',
    priority: status === 'failed' ? 'high' : 'normal',
    operation_id: event.operation_id || null,
    process_instance_id: event.process_instance_id || null,
    outbox_event_id: event.id || null,
    entity_type: aggregateType,
    entity_id: aggregateId,
    created_at: event.created_at || event.occurred_at || nowIso(),
    updated_at: event.updated_at || event.locked_at || null,
    target_page: '/app/sistem/kurulum',
    suggested_actions: [
      {
        label: 'Sistem Durumunu Ac',
        action_type: 'navigate',
        target_page: '/app/sistem/kurulum',
      },
    ],
  }
}

export function normalizeProjectionWarningToActionItem(warning: Record<string, any>, tenantId: string): UnifiedActionItem {
  return {
    id: `projection:${warning.id || warning.projectionKey || 'warning'}`,
    tenant_id: warning.tenant_id || tenantId,
    company_id: warning.company_id || null,
    module_key: warning.module_key || 'system',
    source_type: 'projection',
    source_id: String(warning.id || warning.projectionKey || 'warning'),
    title: 'Liste bilgileri guncelleniyor',
    description: warning.message || 'Liste ve ozet bilgiler kisa sure icinde guncellenecek.',
    status: 'waiting',
    severity: 'warning',
    priority: 'normal',
    created_at: warning.created_at || nowIso(),
    target_page: warning.target_page || '/app',
  }
}

async function fetchProcessTasks(
  context: ActionCenterContext,
  query: ActionCenterQuery
): Promise<SourceResult<Record<string, any>>> {
  let builder = context.supabase
    .from('process_tasks')
    .select('id,tenant_id,process_instance_id,company_id,module_key,entity_type,entity_id,step_key,title,description,status,assigned_to,assigned_role,assigned_permission,due_at,completed_at,updated_at,created_at,is_deleted')
    .eq('tenant_id', context.tenantId)
    .eq('is_deleted', false)
    .limit(100)

  if (query.status) {
    builder = builder.in('status', processTaskSourceStatuses(query.status))
  } else {
    builder = builder.in('status', ['open', 'in_progress', 'overdue'])
  }
  if (query.assigned_to_me && context.userId) builder = builder.eq('assigned_to', context.userId)
  if (!query.assigned_to_me && context.userId) builder = builder.or(`assigned_to.is.null,assigned_to.eq.${context.userId}`)

  const result = await builder
  if (result.error) return safeSourceFallback(result.error, 'Gorev kaynagi hazir degil.')
  return { data: result.data || [] }
}

async function fetchApprovals(context: ActionCenterContext): Promise<SourceResult<Record<string, any>>> {
  let builder = context.supabase
    .from('process_approvals')
    .select('id,tenant_id,process_instance_id,task_id,company_id,module_key,approval_type,status,requested_by,approver_id,approver_role,approver_permission,requested_at,decided_at,payload_json,created_at,updated_at')
    .eq('tenant_id', context.tenantId)
    .eq('status', 'pending')
    .limit(100)

  if (context.userId) {
    builder = builder.or(`approver_id.is.null,approver_id.eq.${context.userId}`)
  }

  const result = await builder
  if (result.error) return safeSourceFallback(result.error, 'Onay kaynagi hazir degil.')
  return { data: result.data || [] }
}

async function fetchOperations(context: ActionCenterContext): Promise<SourceResult<Record<string, any>>> {
  const result = await context.supabase
    .from('operation_requests')
    .select('id,tenant_id,company_id,module_key,entity_type,entity_id,operation_type,operation_status,requested_by,error_json,warning_json,created_at,started_at,completed_at,failed_at')
    .eq('tenant_id', context.tenantId)
    .in('operation_status', ['failed', 'requires_action', 'accepted', 'processing', 'pending'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (result.error) return safeSourceFallback(result.error, 'Islem kaynagi hazir degil.')

  const rows = (result.data || []).filter((operation: any) => {
    if (operation.operation_status === 'failed' || operation.operation_status === 'requires_action') return true
    return minutesSince(operation.started_at || operation.created_at) >= STUCK_OPERATION_MINUTES
  })
  return { data: rows }
}

async function fetchOutboxEvents(context: ActionCenterContext): Promise<SourceResult<Record<string, any>>> {
  if (!canSeeSystemActionItems(context)) return { data: [] }

  const result = await context.supabase
    .from('outbox_events')
    .select('id,tenant_id,company_id,module_key,event_type,event_version,aggregate_type,aggregate_id,operation_id,process_instance_id,status,retry_count,max_retries,last_error,locked_at,occurred_at,created_at,updated_at')
    .eq('tenant_id', context.tenantId)
    .in('status', ['failed', 'skipped', 'pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (result.error) return safeSourceFallback(result.error, 'Sistem guncelleme kaynagi hazir degil.')

  const rows = (result.data || []).filter((event: any) => {
    if (event.status === 'failed' || event.status === 'skipped') return true
    return minutesSince(event.locked_at || event.created_at || event.occurred_at) >= STALE_OUTBOX_MINUTES
  })
  return { data: rows }
}

function filterActionItems(items: UnifiedActionItem[], query: ActionCenterQuery) {
  const defaultVisibleStatuses = new Set(['open', 'in_progress', 'waiting', 'failed'])
  return items.filter(item => {
    if (query.module_key && item.module_key !== query.module_key) return false
    if (query.source_type && item.source_type !== query.source_type) return false
    if (query.status && item.status !== query.status) return false
    if (!query.status && !defaultVisibleStatuses.has(item.status)) return false
    if (query.severity && item.severity !== query.severity) return false
    if (query.priority && item.priority !== query.priority) return false
    if (query.company_id && item.company_id !== query.company_id) return false
    if (query.branch_id && item.branch_id !== query.branch_id && !(item.entity_type?.includes('branch') && item.entity_id === query.branch_id)) return false
    if (query.entity_type && !sameEntityType(item.entity_type, query.entity_type)) {
      const matchesCompanyRecord = query.entity_type === 'company' && item.company_id === query.entity_id
      const matchesBranchRecord = query.entity_type === 'branch' && (item.branch_id === query.entity_id || item.entity_id === query.entity_id)
      if (!matchesCompanyRecord && !matchesBranchRecord) return false
    }
    if (query.entity_id && item.entity_id !== query.entity_id && item.company_id !== query.entity_id && item.branch_id !== query.entity_id) return false
    return true
  })
}

function sortActionItems(items: UnifiedActionItem[]) {
  const severityRank: Record<ActionCenterSeverity, number> = { critical: 4, error: 3, warning: 2, info: 1 }
  const priorityRank: Record<ActionCenterPriority, number> = { urgent: 4, high: 3, normal: 2, low: 1 }
  return [...items].sort((a, b) => {
    const rankDiff = (severityRank[b.severity] + priorityRank[b.priority]) - (severityRank[a.severity] + priorityRank[a.priority])
    if (rankDiff !== 0) return rankDiff
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })
}

function normalizeActionCenterQuery(query: ActionCenterQuery): ActionCenterQuery {
  return {
    ...query,
    page: positiveInteger(query.page, 1),
    pageSize: Math.min(positiveInteger(query.pageSize, DEFAULT_PAGE_SIZE), 100),
  }
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function processTaskSourceStatuses(status: string) {
  if (status === 'open') return ['open', 'overdue']
  if (status === 'dismissed') return ['cancelled']
  return [status]
}

function sameEntityType(left?: string | null, right?: string | null) {
  if (!left || !right) return false
  const normalize = (value: string) => value.replace(/^company_/, '').replace(/_branch$/, 'branch')
  return left === right || normalize(left) === normalize(right)
}

function isPastDue(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getTime() < Date.now()
}

function minutesSince(value?: string | null) {
  if (!value) return 0
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 0
  return Math.floor((Date.now() - date.getTime()) / 60_000)
}

function nowIso() {
  return new Date().toISOString()
}

function safeSourceFallback(error: any, warning: string): SourceResult<Record<string, any>> {
  if (isMissingSourceError(error)) return { data: [], warning }
  return { data: [], warning: error?.message || warning }
}

function isMissingSourceError(error: any) {
  const message = String(error?.message || '')
  return error?.code === '42P01'
    || error?.code === '42703'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('Could not find')
}

export type ActionCenterSupabase = SupabaseClient
