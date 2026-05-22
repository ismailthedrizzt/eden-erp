import 'server-only'

type SupabaseLike = {
  from: (table: string) => any
}

export type TenantIsolationMode = 'shared_schema' | 'dedicated_schema' | 'dedicated_database'
export type TenantDatabaseBindingStatus = 'planned' | 'active' | 'readonly' | 'disabled' | 'migrating'
export type TenantDatabaseMigrationStatus =
  | 'not_required'
  | 'planned'
  | 'copying'
  | 'validating'
  | 'ready'
  | 'cutover'
  | 'complete'
  | 'failed'

export type TenantDatabaseBindingRow = {
  id?: string
  tenant_id: string
  isolation_mode: TenantIsolationMode
  schema_name: string | null
  connection_name: string | null
  connection_secret_name: string | null
  read_role_name: string | null
  write_role_name: string | null
  protected_data: boolean
  migration_status: TenantDatabaseMigrationStatus
  migration_started_at: string | null
  cutover_at: string | null
  status: TenantDatabaseBindingStatus
  metadata_json: Record<string, unknown> | null
}

const BINDING_SELECT = [
  'id',
  'tenant_id',
  'isolation_mode',
  'schema_name',
  'connection_name',
  'connection_secret_name',
  'read_role_name',
  'write_role_name',
  'protected_data',
  'migration_status',
  'migration_started_at',
  'cutover_at',
  'status',
  'metadata_json',
].join(',')

const LEGACY_BINDING_SELECT = [
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

export async function fetchTenantDatabaseBinding(
  supabase: SupabaseLike,
  tenantId: string
): Promise<TenantDatabaseBindingRow | null> {
  const result = await supabase
    .from('tenant_database_bindings')
    .select(BINDING_SELECT)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!result.error) return normalizeBinding(result.data)
  if (!isMissingBindingColumnError(result.error) && !isMissingFoundationError(result.error)) {
    throw new Error(result.error.message)
  }
  if (isMissingFoundationError(result.error)) return null

  const legacy = await supabase
    .from('tenant_database_bindings')
    .select(LEGACY_BINDING_SELECT)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (legacy.error && !isMissingFoundationError(legacy.error)) throw new Error(legacy.error.message)
  return normalizeBinding(legacy.data)
}

export function resolveTenantDataBoundary(tenantId: string, binding: TenantDatabaseBindingRow | null) {
  const normalized = normalizeBinding(binding)
  const isolationMode = normalized?.isolation_mode || 'shared_schema'
  const status = normalized?.status || 'active'

  return {
    tenant_id: tenantId,
    isolation_mode: isolationMode,
    schema_name: normalized?.schema_name || 'public',
    connection_name: normalized?.connection_name || 'default',
    connection_secret_name: normalized?.connection_secret_name || null,
    read_role_name: normalized?.read_role_name || null,
    write_role_name: normalized?.write_role_name || null,
    protected_data: Boolean(normalized?.protected_data),
    migration_status: normalized?.migration_status || 'not_required',
    migration_started_at: normalized?.migration_started_at || null,
    cutover_at: normalized?.cutover_at || null,
    status,
    routable: isRoutableDedicatedDatabaseBinding(normalized),
  }
}

export function isRoutableDedicatedDatabaseBinding(binding: TenantDatabaseBindingRow | null) {
  return Boolean(
    binding &&
    binding.isolation_mode === 'dedicated_database' &&
    ['active', 'readonly', 'migrating'].includes(binding.status) &&
    binding.connection_secret_name
  )
}

function normalizeBinding(row: Record<string, any> | null | undefined): TenantDatabaseBindingRow | null {
  if (!row) return null
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    isolation_mode: row.isolation_mode || 'shared_schema',
    schema_name: row.schema_name || 'public',
    connection_name: row.connection_name || 'default',
    connection_secret_name: row.connection_secret_name || null,
    read_role_name: row.read_role_name || null,
    write_role_name: row.write_role_name || null,
    protected_data: row.protected_data === true,
    migration_status: row.migration_status || 'not_required',
    migration_started_at: row.migration_started_at || null,
    cutover_at: row.cutover_at || null,
    status: row.status || 'active',
    metadata_json: row.metadata_json && typeof row.metadata_json === 'object' && !Array.isArray(row.metadata_json)
      ? row.metadata_json
      : {},
  }
}

function isMissingBindingColumnError(error: { code?: string; message?: string } | null) {
  const message = error?.message || ''
  return error?.code === 'PGRST204'
    || message.includes('protected_data')
    || message.includes('migration_status')
    || message.includes('migration_started_at')
    || message.includes('cutover_at')
}

function isMissingFoundationError(error: { code?: string; message?: string } | null) {
  const message = error?.message || ''
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || message.includes('tenant_database_bindings')
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('Could not find')
}
