import { z } from 'zod'
import type { EdenWizardContract } from '../../core/wizard.contract'

const themeKey = z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/)

export const themeImportPayloadSchema = z.object({
  theme_key: themeKey.optional(),
  source_type: z.enum(['eden_json', 'figma_tokens', 'css_variables']),
  payload_json: z.record(z.unknown()),
  preview_only: z.boolean().default(true),
})

export const themeValidationPayloadSchema = z.object({
  theme_key: themeKey,
  payload_json: z.record(z.unknown()),
  require_contrast_pass: z.boolean().default(true),
})

export const themeImportWizardContract = {
  wizardName: 'Tema Import',
  lifecycleOperationType: 'workspace_theme.import',
  owningEntity: 'workspace_theme',
  steps: [
    { id: 'parse', label: 'JSON Oku', requiredFields: ['payload_json', 'source_type'] },
    { id: 'validate', label: 'Validation', requiredFields: ['payload_json'] },
    { id: 'preview', label: 'Onizleme', requiredFields: ['preview_only'] },
    { id: 'draft', label: 'Taslak Olustur', requiredFields: ['payload_json'] },
  ],
  submitOperation: 'parseThemeImportTextV2',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'inactive'],
  resultingTargetStatus: 'draft',
  rollbackRule: 'cancel_before_submit',
  validationSchema: themeImportPayloadSchema,
  validationStepSchema: themeValidationPayloadSchema,
  requiredOperationRecord: true,
  successMessage: 'Tema import edildi ve taslak olarak kaydedildi.',
  errorMapping: 'theme.import.safe_error',
  allowedPermissions: ['development.theme.manage'],
} as const satisfies EdenWizardContract & {
  validationSchema: typeof themeImportPayloadSchema
  validationStepSchema: typeof themeValidationPayloadSchema
  requiredOperationRecord: boolean
  successMessage: string
  errorMapping: string
  allowedPermissions: readonly string[]
}
