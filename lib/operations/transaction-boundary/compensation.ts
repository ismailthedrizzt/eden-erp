import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantContext } from '@/lib/tenancy/server'

export type CompensationStrategy =
  | 'mark_partial_failed'
  | 'soft_delete_created_records'
  | 'mark_record_error'
  | 'rollback_metadata_only'
  | 'no_compensation'

export async function applyCompensation(
  compensation: ((partialResult: any, error: unknown) => Promise<void>) | undefined,
  partialResult: any,
  error: unknown
) {
  if (!compensation) return false
  await compensation(partialResult, error)
  return true
}

export async function markBranchOpeningPartialFailure({
  supabase,
  tenantContext,
  branchId,
  reason,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  branchId?: string | null
  reason: string
}) {
  if (!branchId) return
  await supabase
    .from('company_branches')
    .update({
      status: 'error',
      record_status: 'draft',
      metadata_json: {
        partial_failure: true,
        partial_failure_reason: reason,
        partial_failure_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', branchId)
    .eq('tenant_id', tenantContext.tenantId)
}

export async function markBranchClosingPartialFailure({
  supabase,
  tenantContext,
  branchId,
  reason,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  branchId?: string | null
  reason: string
}) {
  if (!branchId) return
  await supabase
    .from('company_branches')
    .update({
      metadata_json: {
        closing_failed: true,
        partial_failure: true,
        partial_failure_reason: reason,
        partial_failure_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', branchId)
    .eq('tenant_id', tenantContext.tenantId)
}
