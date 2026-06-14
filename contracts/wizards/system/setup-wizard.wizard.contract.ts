import type { EdenWizardContract } from '../../core/wizard.contract'

export const setupWizardContract = {
  wizardName: 'Tenant setup wizard',
  lifecycleOperationType: 'tenant_setup.complete',
  owningEntity: 'settings',
  steps: [
    { id: 'welcome', label: 'Karsilama', requiredFields: [] },
    { id: 'scale', label: 'Olcek', requiredFields: ['scale'] },
    { id: 'company', label: 'Sirket', requiredFields: ['trade_name', 'tax_number', 'company_type', 'city'] },
    { id: 'role', label: 'Rol', requiredFields: ['role'] },
    { id: 'person', label: 'Kisi', requiredFields: ['first_name', 'last_name', 'national_id'] },
    { id: 'review', label: 'Ozet', requiredFields: [] },
    { id: 'payment', label: 'Odeme', requiredFields: ['payment_choice'] },
  ],
  submitOperation: 'settings.setupWizard.completeSetupPackage',
  resultingRecord: 'operation_request',
  allowedSourceStatuses: ['draft', 'active'],
  resultingTargetStatus: 'active',
  rollbackRule: 'cancel_before_submit',
  visualSteps: ['welcome', 'company', 'person', 'review', 'payment'],
  operationTypes: ['tenant_setup.complete'],
} as const satisfies EdenWizardContract & {
  visualSteps: readonly ('welcome' | 'company' | 'person' | 'review' | 'payment')[]
  operationTypes: readonly string[]
}
