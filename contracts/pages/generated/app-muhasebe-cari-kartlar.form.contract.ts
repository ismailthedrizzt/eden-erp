import type { EdenFormContract } from '../../core/form.contract'

export const appMuhasebeCariKartlarFormContract = {
  fields: [
    { name: 'id', kind: 'string', label: 'Record ID', optional: true, readonly: true },
  ],
  fieldOrder: ['id'],
  defaultValues: {},
  readonlyFields: ['id'],
  hiddenFields: [],
  submitBehavior: 'update_master_data',
  cancelBehavior: 'return_to_list',
  draftSaveBehavior: 'update_draft',
  forbiddenBehaviors: ['lifecycle_transaction'],
} as const satisfies EdenFormContract
