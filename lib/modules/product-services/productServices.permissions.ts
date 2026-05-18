export const PRODUCT_SERVICES_PERMISSIONS = {
  view: 'product_services.view',
  create: 'product_services.create',
  edit: 'product_services.edit',
  delete: 'product_services.delete',
  manage: 'product_services.manage',
} as const

export type ProductServicesPermissionKey = keyof typeof PRODUCT_SERVICES_PERMISSIONS
