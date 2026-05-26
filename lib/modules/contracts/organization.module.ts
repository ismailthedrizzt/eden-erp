import type { ModuleContract } from '../moduleContract.types'

export const organizationModule: ModuleContract = {
  key: 'organization',
  name: 'Teskilat/Kadro',
  description: 'Organizasyon birimleri, kadro ve pozisyon yapisi.',
  domain: 'company',
  category: 'sirket',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: false,
  dependencies: [{ moduleKey: 'companies', required: true, reason: 'Organizasyon birimleri sirket altinda konumlanir.' }],
  entities: [
    { key: 'organization_unit', tableName: 'organization_units', displayName: 'Organizasyon birimi', lifecycle: true, draftSupported: true },
    { key: 'position', tableName: 'positions', displayName: 'Kadro/Pozisyon', lifecycle: true, draftSupported: true },
  ],
  routes: [
    { path: '/app/sirket/teskilat', type: 'page', permission: 'organization.view', fallbackPermission: 'companies.view' },
  ],
  menus: [
    { label: 'Teskilat ve Kadro', path: '/app/sirket/teskilat', icon: 'Network', order: 60, parent: 'sirket', permission: 'organization.view' },
  ],
  permissions: [
    { key: 'organization.view', label: 'Teskilati goruntuleme', fallback: ['companies.view'] },
    { key: 'organization.edit', label: 'Teskilati duzenleme', fallback: ['companies.edit'] },
  ],
  actions: [
    { key: 'create_organization_unit', label: 'Organizasyon birimi olustur', actionType: 'operation', targetPage: '/app/sirket/teskilat', permission: 'organization.edit' },
    { key: 'manage_positions', label: 'Kadro/pozisyon yonet', actionType: 'navigate', targetPage: '/app/sirket/teskilat', permission: 'organization.view' },
    { key: 'assign_staff_to_unit', label: 'Personeli birime bagla', actionType: 'operation', targetPage: '/app/sirket/teskilat', permission: 'organization.edit' },
  ],
  projections: [],
  events: [
    { eventType: 'organization.unit_created', version: '1', aggregateType: 'organization_unit' },
    { eventType: 'organization.position_updated', version: '1', aggregateType: 'position' },
  ],
}
