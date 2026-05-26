import type { ModuleContract } from '../moduleContract.types'

export const representativesModule: ModuleContract = {
  key: 'representatives',
  name: 'Temsilcilerimiz',
  description: 'Temsilci kartlari, yetki, limit ve kapsam islemleri.',
  domain: 'company',
  category: 'sirket',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: false,
  dependencies: [
    { moduleKey: 'companies', required: true, reason: 'Temsilci yetkisi bir sirkete baglanir.' },
    { moduleKey: 'branches', required: false, reason: 'Sube kapsamli temsil yetkileri icin sube modulu onerilir.' },
    { moduleKey: 'organization', required: false, reason: 'Organizasyon birimi kapsamli yetkiler icin teskilat modulu onerilir.' },
    { moduleKey: 'facilities', required: false, reason: 'Lokasyon/tesis kapsamli yetkiler icin tesis modulu onerilir.' },
  ],
  entities: [
    { key: 'company_representative', tableName: 'company_representatives', displayName: 'Temsilci', lifecycle: true, draftSupported: true, hardDeleteDraftOnly: true },
    { key: 'representative_authority_transaction', tableName: 'company_representative_authority_transactions', displayName: 'Temsil yetki islemi', lifecycle: true },
  ],
  routes: [
    { path: '/app/sirket/companies/representatives', type: 'page', permission: 'representatives.view', fallbackPermission: 'companies.view' },
    { path: '/api/companies/representatives', type: 'api', permission: 'representatives.view', fallbackPermission: 'companies.view' },
  ],
  menus: [
    { label: 'Temsilcilerimiz', path: '/app/sirket/companies/representatives', icon: 'ShieldCheck', order: 40, parent: 'sirket', permission: 'representatives.view' },
  ],
  permissions: [
    { key: 'representatives.view', label: 'Temsilcileri goruntuleme', fallback: ['companies.view'] },
    { key: 'representatives.insert', label: 'Temsilci taslagi olusturma', fallback: ['representatives.edit'] },
    { key: 'representatives.edit', label: 'Temsilcileri duzenleme', fallback: ['companies.edit'] },
    { key: 'representatives.delete', label: 'Temsilci taslagi silme', fallback: ['representatives.edit'] },
    { key: 'representatives.authority.start', label: 'Temsil yetkisi baslatma', fallback: ['representatives.edit'] },
    { key: 'representatives.authority.update', label: 'Temsil yetkisi guncelleme', fallback: ['representatives.edit'] },
    { key: 'representatives.authority.suspend', label: 'Temsil yetkisini askiya alma', fallback: ['representatives.edit'] },
    { key: 'representatives.authority.terminate', label: 'Temsil yetkisi sonlandirma', fallback: ['representatives.edit'] },
    { key: 'representatives.authority.approve', label: 'Temsil yetkisi onaylama', fallback: ['representatives.edit'] },
  ],
  actions: [
    { key: 'create_representative_draft', label: 'Temsilci taslagi olustur', actionType: 'create_draft', targetPage: '/app/sirket/companies/representatives', permission: 'representatives.insert', fallbackPermission: 'representatives.edit' },
    { key: 'representative_start', label: 'Temsilcilik baslatma', actionType: 'open_wizard', targetPage: '/app/sirket/companies/representatives', wizardKey: 'representative_start', permission: 'representatives.authority.start', fallbackPermission: 'representatives.edit', requiredRecordType: 'representative' },
    { key: 'representative_authority_renewal', label: 'Temsil yetkisi yenileme', actionType: 'open_wizard', targetPage: '/app/sirket/companies/representatives', wizardKey: 'representative_authority_renewal', permission: 'representatives.authority.update', fallbackPermission: 'representatives.edit', requiredRecordType: 'representative' },
    { key: 'representative_authority_scope_change', label: 'Yetki kapsami degisikligi', actionType: 'open_wizard', targetPage: '/app/sirket/companies/representatives', wizardKey: 'representative_authority_scope_change', permission: 'representatives.authority.update', fallbackPermission: 'representatives.edit', requiredRecordType: 'representative' },
    { key: 'representative_limit_change', label: 'Temsil yetki limiti degisikligi', actionType: 'open_wizard', targetPage: '/app/sirket/companies/representatives', wizardKey: 'representative_limit_change', permission: 'representatives.authority.update', fallbackPermission: 'representatives.edit', requiredRecordType: 'representative' },
    { key: 'representative_suspend', label: 'Temsil yetkisini askiya alma', actionType: 'open_wizard', targetPage: '/app/sirket/companies/representatives', wizardKey: 'representative_suspend', permission: 'representatives.authority.suspend', fallbackPermission: 'representatives.edit', requiredRecordType: 'representative' },
    { key: 'representative_terminate', label: 'Temsil yetkisini sonlandirma', actionType: 'open_wizard', targetPage: '/app/sirket/companies/representatives', wizardKey: 'representative_terminate', permission: 'representatives.authority.terminate', fallbackPermission: 'representatives.edit', requiredRecordType: 'representative' },
  ],
  projections: [
    { key: 'representative_list', projectionKey: 'representativeList', required: true },
    { key: 'current_representative_authorities', projectionKey: 'currentRepresentativeAuthorities', required: false },
  ],
  events: [
    { eventType: 'representative.created', version: '1', aggregateType: 'company_representative' },
    { eventType: 'representative.authority_changed', version: '1', aggregateType: 'representative_authority_transaction' },
  ],
}
