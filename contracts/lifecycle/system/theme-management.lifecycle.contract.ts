import type { EdenLifecycleContract } from '../../core/lifecycle.contract'

export const themeManagementLifecycleContract = {
  entityName: 'workspace_theme',
  operationTypes: [
    'workspace_theme.create_draft',
    'workspace_theme.import',
    'workspace_theme.validate',
    'workspace_theme.activate',
    'workspace_theme.deactivate',
    'workspace_theme.export',
    'workspace_theme.asset_upload',
  ],
  masterDataMutationForbiddenInForms: false,
  operationRecordRequired: true,
  allowedSourceStatuses: ['draft', 'inactive', 'active'],
  resultingStatuses: ['draft', 'inactive', 'active'],
  transactionTable: 'workspace_theme_lifecycle_events',
} as const satisfies EdenLifecycleContract
