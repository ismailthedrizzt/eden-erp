export const WORKFLOW_STATUSES = ['none', 'pending', 'approved', 'rejected', 'cancelled'] as const

export type WorkflowStatus = typeof WORKFLOW_STATUSES[number]

export interface WorkflowReadyRecord {
  workflow_status: WorkflowStatus
  pending_request_id?: string | null
  approved_version?: number | null
  draft_version?: number | null
}
