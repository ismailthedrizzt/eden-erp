import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const productServicesModule: ModuleContract = {
  key: 'product_services',
  name: 'Urun ve Hizmetler',
  domain: 'catalog',
  category: 'operations',
  version: '2026-05-28.13',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: true,
  setupRequired: true,
  dependencies: [
    { moduleKey: 'companies', required: true, reason: 'Katalog kayitlari sirket kapsamiyla yetkilendirilir.' },
    { moduleKey: 'accounting', required: false, reason: 'Fiyat, cari ve fatura entegrasyonu ileriki fazda zenginlesir.' },
  ],
  entities: [{ key: 'product_catalog', tableName: 'product_catalog', displayName: 'Urun/Hizmet Katalogu', draftSupported: false }],
  routes: [
    { path: '/app/urun-ve-hizmetler', type: 'page', permission: PERMISSIONS.productServices.view },
    { path: '/app/urun-ve-hizmetler/katalog', type: 'page', permission: PERMISSIONS.productServices.view },
  ],
  menus: [{ label: 'Urun ve Hizmetler', path: '/app/urun-ve-hizmetler', icon: 'Tags', order: 140, permission: PERMISSIONS.productServices.view }],
  permissions: [
    { key: PERMISSIONS.productServices.view, label: 'Urun/hizmet katalog goruntuleme' },
    { key: PERMISSIONS.productServices.create, label: 'Urun/hizmet katalog kaydi olusturma' },
    { key: PERMISSIONS.productServices.edit, label: 'Urun/hizmet katalog kaydi duzenleme' },
    { key: PERMISSIONS.productServices.delete, label: 'Urun/hizmet katalog kaydi silme' },
  ],
  actions: [
    { key: 'create_product', label: 'Urun/Hizmet olustur', actionType: 'operation', targetPage: '/app/urun-ve-hizmetler/katalog', permission: PERMISSIONS.productServices.create },
    { key: 'update_product', label: 'Urun/Hizmet guncelle', actionType: 'edit', targetPage: '/app/urun-ve-hizmetler/katalog', permission: PERMISSIONS.productServices.edit },
  ],
  featureFlags: [
    { key: 'productServices.enabled', label: 'Urun/Hizmet modulunu etkinlestir', defaultEnabled: true },
    { key: 'productServices.catalog', label: 'Katalog sayfasini etkinlestir', defaultEnabled: true },
  ],
  projections: [],
  events: [
    { eventType: 'product.created', version: '1', aggregateType: 'product_catalog' },
    { eventType: 'product.updated', version: '1', aggregateType: 'product_catalog' },
  ],
}
