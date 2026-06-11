export interface EdenLifecycleContract {
  entityName: string
  operationTypes: readonly string[]
  masterDataMutationForbiddenInForms: boolean
  operationRecordRequired: boolean
  allowedSourceStatuses: readonly string[]
  resultingStatuses: readonly string[]
  transactionTable: string
}
