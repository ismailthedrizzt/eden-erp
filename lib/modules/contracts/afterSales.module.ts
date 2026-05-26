import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const afterSalesModule: ModuleContract = {
  key: 'after_sales',
  name: 'Satis Sonrasi Hizmetler',
  domain: 'service',
  category: 'operations',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: true,
  setupRequired: false,
  dependencies: [
    { moduleKey: 'companies', required: false, reason: 'Servis kayitlari sirket/cari iliskileriyle zenginlesir.' },
    { moduleKey: 'product_services', required: false, reason: 'Musterideki urun ve garanti takibi icin katalog modulu onerilir.' },
  ],
  entities: [{ key: 'after_sales_record', tableName: 'after_sales_records', displayName: 'Servis kaydi', lifecycle: true, draftSupported: true }],
  routes: [{ path: '/app/satis-sonrasi', type: 'page', permission: PERMISSIONS.afterSales.view }],
  menus: [{ label: 'Satis Sonrasi Hizmetler', path: '/app/satis-sonrasi', icon: 'Headphones', order: 150, permission: PERMISSIONS.afterSales.view }],
  permissions: [{ key: PERMISSIONS.afterSales.view, label: 'Satis sonrasi goruntuleme' }],
  actions: [],
  projections: [],
  events: [],
}
