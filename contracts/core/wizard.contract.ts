export interface EdenWizardStepContract {
  id: string
  label: string
  requiredFields: readonly string[]
  requiredDocuments?: readonly string[]
}

export interface EdenWizardContract {
  wizardName: string
  lifecycleOperationType: string
  owningEntity: string
  steps: readonly EdenWizardStepContract[]
  submitOperation: string
  resultingRecord: 'operation_request' | 'lifecycle_transaction'
  allowedSourceStatuses: readonly string[]
  resultingTargetStatus: string
  rollbackRule: 'cancel_before_submit' | 'compensating_operation_required'
}
