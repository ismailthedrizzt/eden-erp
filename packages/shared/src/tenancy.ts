export const TENANT_ISOLATION_MODES = ['shared_schema', 'dedicated_schema', 'dedicated_database'] as const
export const TENANT_ACTIVATION_PHASES = ['foundation', 'pilot', 'active', 'paused'] as const

export type TenantIsolationMode = typeof TENANT_ISOLATION_MODES[number]
export type TenantActivationPhase = typeof TENANT_ACTIVATION_PHASES[number]

export interface TenantWorkspace {
  id: string
  name: string
  code?: string | null
  tenant_key?: string | null
  tenant_type?: string | null
  status: string
  isolation_mode: TenantIsolationMode
  schema_name: string
  connection_name?: string | null
  activation_phase: TenantActivationPhase
  parent_instance_id?: string | null
  metadata_json: Record<string, unknown>
}

export interface TenantDatabaseBinding {
  id: string
  tenant_id: string
  isolation_mode: TenantIsolationMode
  schema_name: string
  connection_name?: string | null
  connection_secret_name?: string | null
  read_role_name?: string | null
  write_role_name?: string | null
  status: 'planned' | 'active' | 'readonly' | 'disabled' | 'migrating'
  metadata_json: Record<string, unknown>
}
