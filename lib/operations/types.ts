export type OperationStatus =
  | 'accepted'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'requires_action'

export interface OperationRequestRecord {
  id: string
  tenant_id?: string | null
  company_id?: string | null
  module_key: string
  entity_type: string
  entity_id?: string | null
  operation_type: string
  operation_status: OperationStatus
  client_request_id: string
  base_version?: number | null
  base_updated_at?: string | null
  requested_by?: string | null
  payload_json: Record<string, any>
  result_json?: Record<string, any> | null
  error_json?: Record<string, any> | null
  warning_json?: Record<string, any> | null
  created_at?: string
  started_at?: string | null
  completed_at?: string | null
  failed_at?: string | null
}

export interface OperationRequestInput {
  tenantId: string
  companyId?: string | null
  moduleKey: string
  entityType: string
  entityId?: string | null
  operationType: string
  clientRequestId?: string | null
  baseVersion?: number | null
  baseUpdatedAt?: string | null
  requestedBy?: string | null
  payload: Record<string, any>
}

export type OperationRunResult<T = unknown> =
  | {
      ok: true
      data: T
      operation?: OperationRequestRecord | null
      statusCode?: number
      warnings?: unknown
    }
  | {
      ok: false
      error: string
      code: string
      statusCode?: number
      details?: unknown
      operation?: OperationRequestRecord | null
    }

