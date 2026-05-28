'use client'

export type ApiEnvelope<T> = { data: T; message?: string | null; warnings?: string[] }
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type ScopeMode = 'all_companies' | 'assigned_companies' | 'assigned_branches' | 'organization_unit_scope' | 'own_tasks_only' | 'read_only' | 'custom'

export type SecurityUser = {
  id: string
  tenant_id?: string | null
  auth_user_id?: string | null
  display_name: string
  email?: string | null
  status: string
  last_login_at?: string | null
  role_keys: string[]
  company_scope_summary: string
  branch_scope_summary: string
  effective_permission_count: number
}

export type SecurityRole = {
  id: string
  role_key: string
  role_name: string
  description?: string | null
  system_role: boolean
  risk_level: RiskLevel
  status: string
  permissions: string[]
  default_scope: ScopeMode
  module_dependencies: string[]
  user_count: number
}

export type SecurityRoleCreateRequest = {
  role_key: string
  role_name: string
  description?: string | null
  risk_level?: RiskLevel
  permissions?: string[]
}

export type UserRoleAssignment = {
  id: string
  role_id: string
  role_key: string
  role_name: string
  company_id?: string | null
  branch_id?: string | null
  scope_mode?: ScopeMode | null
  created_at?: string | null
}

export type PermissionRecord = {
  key: string
  label: string
  description: string
  module_key: string
  module_label: string
  domain: string
  category: 'view' | 'edit' | 'operation' | 'approval' | 'admin'
  risk_level: RiskLevel
  fallback: string[]
  deprecated: boolean
  critical_warning?: string | null
}

export type PermissionGroup = {
  module_key: string
  module_label: string
  permissions: PermissionRecord[]
}

export type PermissionMatrix = {
  roles: SecurityRole[]
  groups: PermissionGroup[]
  cells: Array<{ role_id: string; role_key: string; permission_key: string; granted: boolean; risk_level: RiskLevel; warning?: string | null }>
  warnings: string[]
}

export type CompanyScopeRecord = {
  id?: string | null
  company_id: string
  company_name?: string | null
  can_view: boolean
  can_edit: boolean
  can_operate: boolean
}

export type BranchScopeRecord = {
  id?: string | null
  branch_id: string
  branch_name?: string | null
  company_id?: string | null
  can_view: boolean
  can_edit: boolean
  can_operate: boolean
}

export type UserScopeResponse = {
  user_id: string
  scope_modes: ScopeMode[]
  company_scopes: CompanyScopeRecord[]
  branch_scopes: BranchScopeRecord[]
  effective_summary: string[]
}

export type PolicyTestRequest = {
  tested_user_id: string
  action_key?: string | null
  module_key?: string | null
  permission_key?: string | null
  company_id?: string | null
  branch_id?: string | null
  record_type?: string | null
  record_id?: string | null
  record_status?: string | null
}

export type PolicyTestResult = {
  allowed: boolean
  decision: 'allowed' | 'denied'
  reasons: string[]
  warnings: string[]
  permission_result: Record<string, unknown>
  scope_result: Record<string, unknown>
  module_result: Record<string, unknown>
  policy_result: Record<string, unknown>
}

export type AccessSummary = {
  users: number
  active_users: number
  roles: number
  system_roles: number
  risky_permissions: number
  permission_denials_30d: number
  scope_denials_30d: number
  warnings: string[]
}

export const securityService = {
  async users() {
    return (await requestJson<ApiEnvelope<SecurityUser[]>>('/api/security/users')).data
  },
  async roles() {
    return (await requestJson<ApiEnvelope<SecurityRole[]>>('/api/security/roles')).data
  },
  async permissions() {
    return (await requestJson<ApiEnvelope<PermissionGroup[]>>('/api/security/permissions')).data
  },
  async matrix() {
    return (await requestJson<ApiEnvelope<PermissionMatrix>>('/api/security/permissions/matrix')).data
  },
  async accessSummary() {
    return (await requestJson<ApiEnvelope<AccessSummary>>('/api/security/access-summary')).data
  },
  async createRole(request: SecurityRoleCreateRequest) {
    return (await requestJson<ApiEnvelope<SecurityRole>>('/api/security/roles', {
      method: 'POST',
      body: JSON.stringify(request),
    })).data
  },
  async userRoles(userId: string) {
    return (await requestJson<ApiEnvelope<UserRoleAssignment[]>>(`/api/security/users/${userId}/roles`)).data
  },
  async userScopes(userId: string) {
    return (await requestJson<ApiEnvelope<UserScopeResponse>>(`/api/security/users/${userId}/scopes`)).data
  },
  async assignRole(userId: string, roleId: string, scopeMode?: ScopeMode) {
    return (await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/security/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId, scope_mode: scopeMode || 'assigned_companies' }),
    })).data
  },
  async removeRole(userId: string, roleId: string) {
    return (await requestJson<ApiEnvelope<Record<string, unknown>>>(`/api/security/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    })).data
  },
  async saveRolePermissions(roleId: string, permissionKeys: string[], changeReason?: string) {
    return (await requestJson<ApiEnvelope<SecurityRole>>(`/api/security/roles/${roleId}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permission_keys: permissionKeys, change_reason: changeReason }),
    })).data
  },
  async saveScopes(userId: string, companyScopes: CompanyScopeRecord[], branchScopes: BranchScopeRecord[], changeReason?: string) {
    return (await requestJson<ApiEnvelope<UserScopeResponse>>(`/api/security/users/${userId}/scopes`, {
      method: 'PATCH',
      body: JSON.stringify({ company_scopes: companyScopes, branch_scopes: branchScopes, change_reason: changeReason }),
    })).data
  },
  async policyTest(request: PolicyTestRequest) {
    return (await requestJson<ApiEnvelope<PolicyTestResult>>('/api/security/policy-test', {
      method: 'POST',
      body: JSON.stringify(request),
    })).data
  },
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Guvenlik islemi tamamlanamadi.')
  return payload as T
}
