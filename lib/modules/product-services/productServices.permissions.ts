export const PRODUCT_SERVICES_PERMISSIONS = {
  view: 'products.view',
  create: 'products.create',
  edit: 'products.edit',
  delete: 'products.delete',
  manage: 'products.edit',
  legacyView: 'product_services.view',
  legacyCreate: 'product_services.create',
  legacyEdit: 'product_services.edit',
  legacyDelete: 'product_services.delete',
  legacyManage: 'product_services.manage',
} as const

export type ProductServicesPermissionKey = keyof typeof PRODUCT_SERVICES_PERMISSIONS
