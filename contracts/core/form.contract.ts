import type { EdenFieldContract, EdenReactiveFieldContract } from './field.contract'

export interface EdenFormContract {
  fields: readonly EdenFieldContract[]
  tabs?: readonly EdenFormTabContract[]
  fieldOrder: readonly string[]
  defaultValues: Record<string, unknown>
  readonlyFields: readonly string[]
  hiddenFields: readonly string[]
  submitBehavior: 'save_draft' | 'update_master_data'
  cancelBehavior: 'return_to_list' | 'return_to_detail'
  draftSaveBehavior: 'create_draft' | 'update_draft'
  forbiddenBehaviors: readonly string[]
  reactiveFields?: readonly EdenReactiveFieldContract[]
}

export interface EdenFormTabContract {
  id: string
  label: string
  fieldNames?: readonly string[]
}
