import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const settingsModule: ModuleContract = {
  key: 'settings',
  name: 'Sistem Yonetimi',
  domain: 'platform',
  category: 'platform',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: false,
  dependencies: [],
  entities: [{ key: 'module_license', tableName: 'module_licenses', displayName: 'Modul lisansi' }],
  routes: [
    { path: '/app/sistem/module-licenses', type: 'page', permission: PERMISSIONS.tenancy.manage },
    { path: '/api/settings/module-licenses', type: 'api', permission: PERMISSIONS.tenancy.manage },
  ],
  menus: [{ label: 'Modul Lisanslari', path: '/app/sistem/module-licenses', icon: 'Settings', order: 900, permission: PERMISSIONS.tenancy.manage }],
  permissions: [
    { key: PERMISSIONS.tenancy.view, label: 'Calisma alani goruntuleme' },
    { key: PERMISSIONS.tenancy.manage, label: 'Calisma alani yonetim' },
  ],
  actions: [],
  projections: [],
  events: [],
}
