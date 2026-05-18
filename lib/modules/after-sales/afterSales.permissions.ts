export const AFTER_SALES_PERMISSIONS = {
  view: 'after_sales.view',
  create: 'after_sales.create',
  edit: 'after_sales.edit',
  delete: 'after_sales.delete',
  manage: 'after_sales.manage',
} as const

export type AfterSalesPermissionKey = keyof typeof AFTER_SALES_PERMISSIONS
