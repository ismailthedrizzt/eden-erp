import type { EdenEntityContract } from '../core/entity.contract'
import { standardLifecycleBoundary } from '../core/entity.contract'

export const workspaceThemeStatuses = ['draft', 'review', 'approved', 'inactive', 'active', 'archived', 'rejected'] as const
export const workspaceThemeRuntimeStatuses = ['draft', 'inactive', 'active'] as const
export const workspaceThemeScopes = ['system'] as const
export const workspaceThemeSources = ['system', 'imported', 'user_created', 'generated'] as const
export const workspaceThemeModes = ['light', 'dark', 'system'] as const

export const workspaceThemeStatusLabels: Record<(typeof workspaceThemeStatuses)[number], string> = {
  draft: 'Taslak',
  review: 'Pasif',
  approved: 'Pasif',
  inactive: 'Pasif',
  active: 'Aktif',
  archived: 'Pasif',
  rejected: 'Pasif',
}

export const workspaceThemeStatusClass: Record<(typeof workspaceThemeStatuses)[number], string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  review: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  approved: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  inactive: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  active: 'border-teal-200 bg-teal-50 text-teal-800',
  archived: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  rejected: 'border-zinc-200 bg-zinc-50 text-zinc-700',
}

export const workspaceThemeEntityContract = {
  entityName: 'workspace_theme',
  tableName: 'workspace_themes',
  resourceName: 'themes',
  primaryKey: 'id',
  draftStatusField: 'status',
  lifecycleStatusField: 'status',
  allowedStatuses: workspaceThemeStatuses,
  requiredFields: ['theme_key', 'display_name', 'version', 'status', 'scope', 'theme_json'],
  optionalFields: ['description', 'author', 'figma_tokens_json', 'validation_result_json', 'images', 'documents', 'notes'],
  readonlyFields: ['id', 'status', 'is_active', 'created_at', 'updated_at'],
  auditFields: ['created_at', 'created_by', 'updated_at', 'updated_by'],
  ownershipFields: ['tenant_id', 'workspace_id'],
  uniqueKeys: [['workspace_id', 'theme_key'], ['workspace_id', 'scope', 'is_active']],
  listFields: ['display_name', 'theme_key', 'status', 'version', 'is_active', 'updated_at'],
  formFields: ['display_name', 'theme_key', 'version', 'author', 'scope', 'description', 'theme_json', 'images', 'documents'],
  detailFields: ['display_name', 'theme_key', 'version', 'author', 'scope', 'status', 'is_active', 'updated_at', 'description'],
  fields: [
    { name: 'id', kind: 'uuid', label: 'Tema ID', readonly: true },
    { name: 'tenant_id', kind: 'uuid', label: 'Tenant', hidden: true, optional: true },
    { name: 'workspace_id', kind: 'uuid', label: 'Calisma Alani', hidden: true, optional: true },
    { name: 'theme_key', kind: 'string', label: 'Tema kodu / slug', required: true },
    { name: 'display_name', kind: 'string', label: 'Tema adi', required: true },
    { name: 'version', kind: 'string', label: 'Versiyon', required: true },
    { name: 'status', kind: 'enum', label: 'Durum', enumValues: workspaceThemeStatuses, readonly: true },
    { name: 'scope', kind: 'enum', label: 'Scope', enumValues: workspaceThemeScopes, readonly: true },
    { name: 'theme_json', kind: 'jsonb', label: 'Tema JSON', required: true },
    { name: 'updated_at', kind: 'datetime', label: 'Son Guncelleme', readonly: true },
  ],
  allowedOperations: ['create', 'read', 'update', 'soft_delete', 'lifecycle'],
  forbiddenOperations: ['hard_delete'],
  deletePolicy: 'draft_only_hard_delete',
  lifecycleBoundary: standardLifecycleBoundary,
  boundaryRules: [
    'Theme draft creation = draft operation.',
    'Theme import = validated import wizard.',
    'Theme validation = contract-backed validation step.',
    'Theme activation = lifecycle operation.',
    'Theme export = API/action contract.',
    'Theme asset uploads = asset slot contract.',
    'Theme JSON must be schema validated before activation.',
    'Active theme cannot be silently overwritten without lifecycle record.',
  ],
} as const satisfies EdenEntityContract & {
  boundaryRules: readonly string[]
}
