export const AFTER_SALES_PERMISSIONS = {
  view: 'afterSales.view',
  create: 'afterSales.requestCreate',
  edit: 'afterSales.edit',
  delete: 'afterSales.admin',
  manage: 'afterSales.admin',
  assetCreate: 'afterSales.assetCreate',
  requestCreate: 'afterSales.requestCreate',
  requestAssign: 'afterSales.requestAssign',
  serviceRecordCreate: 'afterSales.serviceRecordCreate',
  serviceComplete: 'afterSales.serviceComplete',
  legacyView: 'after_sales.view',
  legacyCreate: 'after_sales.create',
  legacyEdit: 'after_sales.edit',
  legacyDelete: 'after_sales.delete',
  legacyManage: 'after_sales.manage',
} as const

export type AfterSalesPermissionKey = keyof typeof AFTER_SALES_PERMISSIONS
