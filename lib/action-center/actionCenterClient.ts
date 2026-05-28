import type { ActionCenterListResult, ActionCenterSummary, UnifiedActionItem } from './actionCenter.types'

export function unwrapActionCenterListPayload(payload: any): ActionCenterListResult {
  const root = payload?.data ?? payload ?? {}
  const data = Array.isArray(root)
    ? root
    : Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root?.items)
        ? root.items
        : []
  const summary = normalizeActionCenterSummaryPayload(root?.summary ?? payload?.summary ?? root)
  const page = Number(root?.meta?.page || payload?.meta?.page || 1)
  const pageSize = Number(root?.meta?.pageSize || payload?.meta?.pageSize || data.length || 0)
  const total = Number(root?.meta?.total || root?.meta?.count || payload?.meta?.total || root?.count || data.length)

  return {
    data: data as UnifiedActionItem[],
    meta: {
      page,
      pageSize,
      total,
      totalPages: Number(root?.meta?.totalPages || Math.max(1, Math.ceil(total / Math.max(1, pageSize || 1)))),
    },
    summary,
    warnings: Array.isArray(root?.warnings) ? root.warnings : undefined,
  }
}

export function normalizeActionCenterSummaryPayload(payload: any): ActionCenterSummary {
  const root = payload?.data ?? payload ?? {}
  const counts = root?.counts ?? root
  return {
    total_open: Number(root.total_open ?? counts.total_open ?? counts.total ?? 0),
    urgent_count: Number(root.urgent_count ?? counts.urgent_count ?? 0),
    approval_count: Number(root.approval_count ?? counts.approval_count ?? counts.approvals ?? 0),
    task_count: Number(root.task_count ?? counts.task_count ?? counts.tasks ?? 0),
    failed_operation_count: Number(root.failed_operation_count ?? counts.failed_operation_count ?? 0),
    system_warning_count: Number(root.system_warning_count ?? counts.system_warning_count ?? 0),
    by_module: root.by_module ?? counts.by_module ?? {},
    by_severity: root.by_severity ?? counts.by_severity ?? {},
  }
}
