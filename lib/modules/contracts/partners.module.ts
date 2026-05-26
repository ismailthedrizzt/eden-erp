import type { ModuleContract } from '../moduleContract.types'

export const partnersModule: ModuleContract = {
  key: 'partners',
  name: 'Ortaklarimiz',
  description: 'Ortak kartlari ve ortaklik/pay sahipligi islemleri.',
  domain: 'company',
  category: 'sirket',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: false,
  dependencies: [{ moduleKey: 'companies', required: true, reason: 'Ortak kaydi bagli sirket olmadan yonetilemez.' }],
  entities: [
    { key: 'company_partner', tableName: 'company_partners', displayName: 'Ortak', lifecycle: true, draftSupported: true, hardDeleteDraftOnly: true },
    { key: 'ownership_transaction', tableName: 'ownership_transactions', displayName: 'Ortaklik islemi', lifecycle: true },
  ],
  routes: [
    { path: '/app/sirket/companies/partners', type: 'page', permission: 'partners.view', fallbackPermission: 'companies.view' },
    { path: '/api/companies/partners', type: 'api', permission: 'partners.view', fallbackPermission: 'companies.view' },
  ],
  menus: [
    { label: 'Ortaklarimiz', path: '/app/sirket/companies/partners', icon: 'Users', order: 30, parent: 'sirket', permission: 'partners.view' },
  ],
  permissions: [
    { key: 'partners.view', label: 'Ortaklari goruntuleme', fallback: ['companies.view'] },
    { key: 'partners.edit', label: 'Ortaklari duzenleme', fallback: ['companies.edit'] },
    { key: 'partners.ownership.start', label: 'Ortaklik islemi baslatma', fallback: ['partners.edit'] },
    { key: 'partners.ownership.update', label: 'Ortaklik islemi guncelleme', fallback: ['partners.edit'] },
    { key: 'partners.ownership.approve', label: 'Ortaklik islemi onaylama', fallback: ['partners.edit'] },
    { key: 'partners.ownership.reverse', label: 'Ortaklik islemi ters kayit', fallback: ['partners.edit'] },
  ],
  actions: [
    { key: 'create_partner_draft', label: 'Ortak taslagi olustur', actionType: 'create_draft', targetPage: '/app/sirket/companies/partners', permission: 'partners.edit' },
    { key: 'initial_partnership_entry', label: 'Ilk ortaklik girisi', actionType: 'open_wizard', targetPage: '/app/sirket/companies/partners', wizardKey: 'initial_partnership_entry', permission: 'partners.ownership.start', fallbackPermission: 'partners.edit', requiredRecordType: 'partner' },
    { key: 'share_transfer', label: 'Pay devri', actionType: 'open_wizard', targetPage: '/app/sirket/companies/partners', wizardKey: 'share_transfer', permission: 'partners.ownership.start', fallbackPermission: 'partners.edit', requiredRecordType: 'partner' },
    { key: 'ownership_exit', label: 'Ortakliktan cikis', actionType: 'open_wizard', targetPage: '/app/sirket/companies/partners', wizardKey: 'ownership_exit', permission: 'partners.ownership.start', fallbackPermission: 'partners.edit', requiredRecordType: 'partner' },
    { key: 'ownership_correction', label: 'Ortaklik duzeltme kaydi', actionType: 'open_wizard', targetPage: '/app/sirket/companies/partners', wizardKey: 'ownership_correction', permission: 'partners.ownership.start', fallbackPermission: 'partners.edit', requiredRecordType: 'partner' },
  ],
  projections: [
    { key: 'partner_list', projectionKey: 'partnerList', required: true },
    { key: 'current_ownership', projectionKey: 'currentOwnership', required: false },
  ],
  events: [
    { eventType: 'partner.created', version: '1', aggregateType: 'company_partner' },
    { eventType: 'ownership.transaction_completed', version: '1', aggregateType: 'ownership_transaction' },
  ],
}
