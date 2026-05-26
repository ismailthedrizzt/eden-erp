import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const productServicesModule: ModuleContract = {
  key: 'product_services',
  name: 'Urun ve Hizmetler',
  domain: 'catalog',
  category: 'operations',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: true,
  setupRequired: false,
  dependencies: [],
  entities: [{ key: 'product_service_item', tableName: 'product_service_items', displayName: 'Urun/Hizmet', draftSupported: true }],
  routes: [{ path: '/app/urun-ve-hizmetler', type: 'page', permission: PERMISSIONS.productServices.view }],
  menus: [{ label: 'Urun ve Hizmetler', path: '/app/urun-ve-hizmetler', icon: 'Tags', order: 140, permission: PERMISSIONS.productServices.view }],
  permissions: [{ key: PERMISSIONS.productServices.view, label: 'Urun/hizmet goruntuleme' }],
  actions: [],
  projections: [],
  events: [],
}
