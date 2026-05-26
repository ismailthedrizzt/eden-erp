import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const facilitiesModule: ModuleContract = {
  key: 'facilities',
  name: 'Tesisler/Lokasyonlar',
  description: 'Fiziksel tesis, lokasyon ve sube lokasyon baglantilari.',
  domain: 'company',
  category: 'sirket',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: false,
  dependencies: [
    { moduleKey: 'companies', required: true, reason: 'Tesis/lokasyon kaydi sirket kapsaminda tutulur.' },
    { moduleKey: 'branches', required: false, reason: 'Sube ile tesis baglantisi icin sube modulu onerilir.' },
  ],
  entities: [
    { key: 'facility_location', tableName: 'company_facilities', displayName: 'Tesis/Lokasyon', lifecycle: true, draftSupported: true },
  ],
  routes: [
    { path: '/app/sirket/tesisler', type: 'page', permission: PERMISSIONS.companies.view },
  ],
  menus: [
    { label: 'Tesislerimiz', path: '/app/sirket/tesisler', icon: 'Factory', order: 80, parent: 'sirket', permission: PERMISSIONS.companies.view },
  ],
  permissions: [
    { key: 'facilities.view', label: 'Tesis/lokasyon goruntuleme', fallback: [PERMISSIONS.companies.view] },
    { key: 'facilities.edit', label: 'Tesis/lokasyon duzenleme', fallback: [PERMISSIONS.companies.edit] },
  ],
  actions: [
    { key: 'create_facility', label: 'Tesis/lokasyon olustur', actionType: 'operation', targetPage: '/app/sirket/tesisler', permission: PERMISSIONS.companies.edit },
    { key: 'link_facility_to_branch', label: 'Tesisi subeye bagla', actionType: 'operation', targetPage: '/app/sirket/tesisler', permission: PERMISSIONS.companies.edit },
    { key: 'deactivate_facility', label: 'Tesis/lokasyon pasife al', actionType: 'operation', targetPage: '/app/sirket/tesisler', permission: PERMISSIONS.companies.edit },
  ],
  projections: [],
  events: [
    { eventType: 'facility.created', version: '1', aggregateType: 'company_facility' },
    { eventType: 'facility.updated', version: '1', aggregateType: 'company_facility' },
  ],
}
