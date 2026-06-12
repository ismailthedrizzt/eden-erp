export type PermissionAliasContract = {
  canonicalPermission: string
  legacyPermission: string
  owner: string
  expiresAt: string
  removalPlan: string
}

export const permissionAliases: readonly PermissionAliasContract[] = []
