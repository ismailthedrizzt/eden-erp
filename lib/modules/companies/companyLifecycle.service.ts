import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'

export async function insertCompanyCreatedAsDraftEvent(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  payload: Record<string, any>,
  tenantContext: TenantContext
) {
  const { error } = await supabase
    .from('company_lifecycle_events')
    .insert(withTenantInsertScopeForTable({
      company_id: companyId,
      event_type: 'company_created_as_draft',
      event_date: new Date().toISOString().slice(0, 10),
      old_status: null,
      new_status: 'draft',
      payload_json: payload,
      document_reference_id: null,
    }, 'company_lifecycle_events', tenantContext))

  return error
}
