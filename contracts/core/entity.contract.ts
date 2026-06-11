import type { EdenFieldContract } from './field.contract'

export type EdenDeletePolicy = 'draft_only_hard_delete' | 'soft_delete_only' | 'forbidden'
export type EdenEntityOperation = 'create' | 'read' | 'update' | 'hard_delete' | 'soft_delete' | 'lifecycle'

export interface EdenLifecycleBoundaryContract {
  masterDataOwnedBy: 'form'
  lifecycleOperationsOwnedBy: 'wizard'
  operationRecordRequired: boolean
  activatedHardDeleteForbidden: boolean
}

export interface EdenEntityContract {
  entityName: string
  tableName: string
  resourceName: string
  primaryKey: string
  draftStatusField: string
  lifecycleStatusField?: string
  allowedStatuses: readonly string[]
  uniqueKeys: readonly string[][]
  requiredFields: readonly string[]
  optionalFields: readonly string[]
  readonlyFields: readonly string[]
  auditFields: readonly string[]
  ownershipFields: readonly string[]
  listFields: readonly string[]
  formFields: readonly string[]
  detailFields: readonly string[]
  fields: readonly EdenFieldContract[]
  allowedOperations: readonly EdenEntityOperation[]
  forbiddenOperations: readonly EdenEntityOperation[]
  deletePolicy: EdenDeletePolicy
  lifecycleBoundary: EdenLifecycleBoundaryContract
}

export const standardLifecycleBoundary: EdenLifecycleBoundaryContract = {
  masterDataOwnedBy: 'form',
  lifecycleOperationsOwnedBy: 'wizard',
  operationRecordRequired: true,
  activatedHardDeleteForbidden: true,
}
