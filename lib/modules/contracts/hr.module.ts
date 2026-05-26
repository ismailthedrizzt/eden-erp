import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const hrModule: ModuleContract = {
  key: 'hr',
  name: 'Insan Kaynaklari',
  description: 'Calisan, ise giris/cikis ve personel yasam dongusu.',
  domain: 'hr',
  category: 'operations',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: true,
  setupRequired: false,
  dependencies: [
    { moduleKey: 'companies', required: false, reason: 'Calisma iliskileri sirket kapsamiyla zenginlesir.' },
    { moduleKey: 'organization', required: false, reason: 'Kadro ve birim atamalari icin teskilat modulu onerilir.' },
  ],
  entities: [{ key: 'employee', tableName: 'employees', displayName: 'Calisan', lifecycle: true, draftSupported: true }],
  routes: [{ path: '/app/ik/personel', type: 'page', permission: PERMISSIONS.employees.view }],
  menus: [{ label: 'Calisanlarimiz', path: '/app/ik/personel', icon: 'Users', order: 120, permission: PERMISSIONS.employees.view }],
  permissions: [
    { key: PERMISSIONS.employees.view, label: 'Calisanlari goruntuleme' },
    { key: PERMISSIONS.employees.edit, label: 'Calisanlari duzenleme' },
  ],
  actions: [],
  projections: [],
  events: [],
}
