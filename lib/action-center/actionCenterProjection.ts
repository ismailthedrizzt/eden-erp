import type { ActionCenterSummary, UnifiedActionItem } from './actionCenter.types'

export function createEmptyActionCenterSummary(): ActionCenterSummary {
  return {
    total_open: 0,
    urgent_count: 0,
    approval_count: 0,
    task_count: 0,
    failed_operation_count: 0,
    system_warning_count: 0,
    by_module: {},
    by_severity: {},
  }
}

export function buildActionCenterSummary(items: UnifiedActionItem[]): ActionCenterSummary {
  const summary = createEmptyActionCenterSummary()
  for (const item of items) {
    if (!['completed', 'dismissed'].includes(item.status)) summary.total_open += 1
    if (item.priority === 'urgent' || item.severity === 'critical') summary.urgent_count += 1
    if (item.source_type === 'approval') summary.approval_count += 1
    if (item.source_type === 'process_task' || item.source_type === 'project_task') summary.task_count += 1
    if (item.source_type === 'operation' && item.status === 'failed') summary.failed_operation_count += 1
    if (['outbox', 'projection', 'integrity_warning', 'system'].includes(item.source_type) && item.status !== 'completed') {
      summary.system_warning_count += 1
    }
    summary.by_module[item.module_key] = (summary.by_module[item.module_key] || 0) + 1
    summary.by_severity[item.severity] = (summary.by_severity[item.severity] || 0) + 1
  }
  return summary
}
