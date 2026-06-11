import { z } from 'zod'
import type { EdenWizardContract } from '../../core/wizard.contract'

export const themeActivationPayloadSchema = z.object({
  theme_key: z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/),
  validation_passed: z.boolean(),
  deactivate_existing_active_theme: z.boolean().default(true),
})

export const themeActivationWizardContract = {
  wizardName: 'Tema Aktiflestirme',
  lifecycleOperationType: 'workspace_theme.activate',
  owningEntity: 'workspace_theme',
  steps: [
    { id: 'validate', label: 'Validation', requiredFields: ['theme_key', 'validation_passed'] },
    { id: 'deactivate-current', label: 'Mevcut Aktifi Pasife Al', requiredFields: ['deactivate_existing_active_theme'] },
    { id: 'activate', label: 'Aktiflestir', requiredFields: ['theme_key'] },
  ],
  submitOperation: 'withThemeLifecycle(active)',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'inactive'],
  resultingTargetStatus: 'active',
  rollbackRule: 'compensating_operation_required',
  validationSchema: themeActivationPayloadSchema,
  requiredOperationRecord: true,
  successMessage: 'Tema kullanima acildi.',
  errorMapping: 'theme.activation.safe_error',
  allowedPermissions: ['development.theme.activate'],
} as const satisfies EdenWizardContract & {
  validationSchema: typeof themeActivationPayloadSchema
  requiredOperationRecord: boolean
  successMessage: string
  errorMapping: string
  allowedPermissions: readonly string[]
}
