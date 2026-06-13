export interface EdenLifecycleContract {
  entityName: string
  operationTypes: readonly string[]
  masterDataMutationForbiddenInForms: boolean
  operationRecordRequired: boolean
  persistenceMode?: 'backend_operation_record' | 'development_local_only'
  allowedSourceStatuses: readonly string[]
  resultingStatuses: readonly string[]
  transactionTable: string
}
