import type { EdenFormContract } from '../../core/form.contract'

export const profileFormContract = {
  fields: [
    { name: 'displayName', kind: 'string', label: 'Ad soyad', required: true },
    { name: 'phone', kind: 'string', label: 'Telefon', optional: true },
    { name: 'email', kind: 'string', label: 'E-posta', optional: true },
  ],
  fieldOrder: ['displayName', 'phone', 'email'],
  defaultValues: {
    displayName: '',
    phone: '',
    email: '',
  },
  readonlyFields: [],
  hiddenFields: [],
  submitBehavior: 'update_master_data',
  cancelBehavior: 'return_to_detail',
  draftSaveBehavior: 'update_draft',
  forbiddenBehaviors: ['lifecycle_transaction'],
} as const satisfies EdenFormContract
