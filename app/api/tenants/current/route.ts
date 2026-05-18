import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext, tenantResponseHeaders } from '@/lib/tenancy/server'

export const runtime = 'nodejs'

const WORKSPACE_SELECT = [
  'id',
  'name',
  'code',
  'status',
  'metadata_json',
  'tenant_key',
  'tenant_type',
  'isolation_mode',
  'schema_name',
  'connection_name',
  'activation_phase',
  'parent_instance_id',
].join(',')

const LEGACY_WORKSPACE_SELECT = 'id,name,code,status,metadata_json'

const BINDING_SELECT = [
  'id',
  'tenant_id',
  'isolation_mode',
  'schema_name',
  'connection_name',
  'connection_secret_name',
  'read_role_name',
  'write_role_name',
  'status',
  'metadata_json',
].join(',')

type Supabase = ReturnType<typeof createServiceClient>

export async function GET(request: NextRequest) {
  const context = resolveTenantContext(request)
  const supabase = createServiceClient()

  const [workspace, binding] = await Promise.all([
    fetchWorkspace(supabase, context.tenantId),
    fetchBinding(supabase, context.tenantId),
  ])

  return NextResponse.json(
    {
      data: {
        context,
        workspace,
        database_binding: binding,
        foundation_ready: Boolean(workspace && binding),
      },
    },
    { headers: tenantResponseHeaders(context) }
  )
}

async function fetchWorkspace(supabase: Supabase, tenantId: string) {
  const full = await supabase
    .from('erp_instances')
    .select(WORKSPACE_SELECT)
    .eq('id', tenantId)
    .maybeSingle()

  if (!full.error) return normalizeWorkspace(full.data)
  if (!isMissingFoundationError(full.error)) throw new Error(full.error.message)

  const legacy = await supabase
    .from('erp_instances')
    .select(LEGACY_WORKSPACE_SELECT)
    .eq('id', tenantId)
    .maybeSingle()

  if (legacy.error && !isMissingFoundationError(legacy.error)) throw new Error(legacy.error.message)
  return normalizeWorkspace(legacy.data)
}

async function fetchBinding(supabase: Supabase, tenantId: string) {
  const result = await supabase
    .from('tenant_database_bindings')
    .select(BINDING_SELECT)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (result.error && !isMissingFoundationError(result.error)) throw new Error(result.error.message)
  return result.data || null
}

function normalizeWorkspace(row: Record<string, any> | null) {
  if (!row) return null
  return {
    isolation_mode: 'shared_schema',
    schema_name: 'public',
    activation_phase: 'foundation',
    ...row,
  }
}

function isMissingFoundationError(error: { code?: string; message?: string } | null) {
  const message = error?.message || ''
  return error?.code === '42P01'
    || error?.code === 'PGRST204'
    || error?.code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('Could not find')
}
