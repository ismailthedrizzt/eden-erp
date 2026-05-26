import type { ModuleContract } from '../moduleContract.types'

export const accountingModule: ModuleContract = {
  key: 'accounting',
  name: 'Muhasebe',
  description: 'Cari kart, banka hesaplari ve on muhasebe hareketleri.',
  domain: 'finance',
  category: 'operations',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: true,
  setupRequired: false,
  dependencies: [{ moduleKey: 'companies', required: false, reason: 'Sirket kapsamli finans kayitlari icin sirket modulu onerilir.' }],
  entities: [
    { key: 'account_card', tableName: 'account_cards', displayName: 'Cari kart', draftSupported: true },
    { key: 'bank_account', tableName: 'bank_accounts', displayName: 'Banka hesabi', draftSupported: true },
  ],
  routes: [
    { path: '/app/muhasebe', type: 'page', permission: 'accounting.view' },
    { path: '/app/muhasebe/cari-kartlar', type: 'page', permission: 'accounting.view' },
  ],
  menus: [{ label: 'Muhasebe', path: '/app/muhasebe', icon: 'CreditCard', order: 100, permission: 'accounting.view' }],
  permissions: [
    { key: 'accounting.view', label: 'Muhasebe goruntuleme' },
    { key: 'accounting.edit', label: 'Muhasebe duzenleme' },
  ],
  actions: [],
  projections: [],
  events: [],
}
