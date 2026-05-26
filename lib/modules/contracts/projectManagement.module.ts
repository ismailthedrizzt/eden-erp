import { PERMISSIONS } from '@/packages/shared/src'
import type { ModuleContract } from '../moduleContract.types'

export const projectManagementModule: ModuleContract = {
  key: 'project_management',
  name: 'Gorev ve Proje Yonetimi',
  domain: 'work',
  category: 'operations',
  version: '2026-05-26.1',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: true,
  setupRequired: false,
  dependencies: [],
  entities: [
    { key: 'project', tableName: 'project_management_projects', displayName: 'Proje', draftSupported: true },
    { key: 'task', tableName: 'project_management_tasks', displayName: 'Gorev', draftSupported: true },
  ],
  routes: [{ path: '/app/gorev-ve-proje-yonetimi', type: 'page', permission: PERMISSIONS.projectManagement.view }],
  menus: [{ label: 'Gorev ve Proje Yonetimi', path: '/app/gorev-ve-proje-yonetimi', icon: 'ListChecks', order: 130, permission: PERMISSIONS.projectManagement.view }],
  permissions: [{ key: PERMISSIONS.projectManagement.view, label: 'Proje/gorev goruntuleme' }],
  actions: [],
  projections: [],
  events: [],
}
