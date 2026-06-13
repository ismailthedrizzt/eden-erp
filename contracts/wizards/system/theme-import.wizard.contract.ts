import { z } from 'zod'
import type { EdenWizardContract } from '../../core/wizard.contract'

const themeKeySchema = z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/)
const themePackageSchema = z.record(z.unknown())

export const themeImportPayloadSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  theme_key: themeKeySchema.optional(),
  display_name: z.string().min(1).optional(),
  theme_json: themePackageSchema,
  source_type: z.enum(['eden', 'figma', 'css', 'tailwind', 'manual']).default('eden'),
})

export const themeValidationPayloadSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  theme_key: themeKeySchema.optional(),
  theme_json: themePackageSchema,
  strict: z.boolean().default(true),
})

export const themeImportWizardContract = {
  wizardName: 'Tema Import',
  lifecycleOperationType: 'workspace_theme.import',
  owningEntity: 'workspace_theme',
  steps: [
    { id: 'parse', label: 'JSON Parse', requiredFields: ['theme_json'] },
    { id: 'validate', label: 'Validation', requiredFields: ['theme_json'] },
    { id: 'draft', label: 'Taslak', requiredFields: ['theme_json'] },
    { id: 'review', label: 'Onay', requiredFields: ['theme_json'] },
  ],
  submitOperation: 'themeManagementService.importTheme',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'inactive'],
  resultingTargetStatus: 'draft',
  rollbackRule: 'cancel_before_submit',
  validationSchema: themeImportPayloadSchema,
  requiredOperationRecord: false,
  successMessage: 'Tema import edildi.',
  errorMapping: 'theme.import.safe_error',
  allowedPermissions: ['development.theme.manage'],
} as const satisfies EdenWizardContract & {
  validationSchema: typeof themeImportPayloadSchema
  requiredOperationRecord: boolean
  successMessage: string
  errorMapping: string
  allowedPermissions: readonly string[]
}
