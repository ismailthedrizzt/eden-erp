import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveTenantContext, tenantResponseHeaders } from '@/lib/tenancy/server'
import { fetchTenantDatabaseBinding, resolveTenantDataBoundary } from '@/lib/tenancy/databaseRouting'
import { requirePermission } from '@/lib/security/serverPermissions'
import { getTenantReadiness } from '@/lib/setup/tenantReadinessService'

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

type Supabase = ReturnType<typeof createServiceClient>

export async function GET(request: NextRequest) {
  const resolvedContext = resolveTenantContext(request)
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'tenants.view')
  if (permission instanceof NextResponse) return permission

  const tenantId = permission.tenantId || resolvedContext.tenantId
  const context = tenantId === resolvedContext.tenantId
    ? resolvedContext
    : { ...resolvedContext, tenantId, workspaceId: tenantId }

  const [workspace, binding, readiness] = await Promise.all([
    fetchWorkspace(supabase, tenantId),
    fetchTenantDatabaseBinding(supabase, tenantId),
    getTenantReadiness(supabase as any, context).catch(() => null),
  ])
  const databaseBoundary = resolveTenantDataBoundary(tenantId, binding)

  return NextResponse.json(
    {
      data: {
        context,
        workspace,
        database_binding: binding,
        database_boundary: databaseBoundary,
        routing_ready: databaseBoundary.routable,
        foundation_ready: Boolean(workspace && binding),
        setup: readiness ? {
          ready: readiness.ready,
          blockingModules: readiness.blockingModules,
          warningModules: readiness.warningModules,
        } : null,
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
