export const ownershipTransactionPermissions = {
  view: 'ownership_transactions.view',
  insert: 'ownership_transactions.insert',
  edit: 'ownership_transactions.edit',
  approve: 'ownership_transactions.approve',
  cancel: 'ownership_transactions.cancel',
  reverse: 'ownership_transactions.reverse',
  export: 'ownership_transactions.export',
  viewSensitive: 'ownership_transactions.view_sensitive',
} as const

export type OwnershipTransactionPermissionKey = keyof typeof ownershipTransactionPermissions

export function getOwnershipTransactionCapabilities() {
  return {
    canView: true,
    canInsert: true,
    canEdit: true,
    canApprove: true,
    canCancel: true,
    canReverse: true,
    canExport: true,
    canViewSensitive: true,
  }
}
