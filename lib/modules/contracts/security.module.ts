import { PERMISSIONS } from '@/packages/shared/src/permissions'
import type { ModuleContract } from '../moduleContract.types'

export const securityModule: ModuleContract = {
  key: 'security',
  name: 'Kullanicilar / Roller / Yetkiler',
  description: 'RBAC, permission matrix, company/branch scope ve policy test yonetim katmani.',
  domain: 'platform',
  category: 'platform',
  version: '2026-05-28.17',
  status: 'active',
  defaultEnabled: true,
  licenseRequired: false,
  setupRequired: true,
  dependencies: [
    { moduleKey: 'companies', required: true, reason: 'Company scope kararlarinin ana kaynagi sirketlerdir.' },
    { moduleKey: 'branches', required: false, reason: 'Branch scope secimi icin sube kayitlari kullanilir.' },
    { moduleKey: 'audit', required: false, reason: 'Permission/scope degisiklikleri ve denials auditlenir.' },
  ],
  entities: [
    { key: 'security_user_profile', tableName: 'security_users_profile', displayName: 'Kullanici profili' },
    { key: 'security_role', tableName: 'security_roles', displayName: 'Rol' },
    { key: 'security_role_permission', tableName: 'security_role_permissions', displayName: 'Rol yetkisi' },
    { key: 'security_user_role', tableName: 'security_user_roles', displayName: 'Kullanici rolu' },
    { key: 'security_user_company_scope', tableName: 'security_user_company_scopes', displayName: 'Sirket kapsami' },
    { key: 'security_user_branch_scope', tableName: 'security_user_branch_scopes', displayName: 'Sube kapsami' },
  ],
  routes: [
    { path: '/app/sistem/kullanicilar', type: 'page', permission: PERMISSIONS.security.view },
    { path: '/app/sistem/roller', type: 'page', permission: PERMISSIONS.security.view },
    { path: '/app/sistem/yetkiler', type: 'page', permission: PERMISSIONS.security.view },
    { path: '/api/security/users', type: 'api', permission: PERMISSIONS.security.view },
    { path: '/api/security/roles', type: 'api', permission: PERMISSIONS.security.view },
    { path: '/api/security/permissions/matrix', type: 'api', permission: PERMISSIONS.security.view },
    { path: '/api/security/policy-test', type: 'api', permission: PERMISSIONS.security.policyTest },
  ],
  menus: [
    { label: 'Kullanicilar', path: '/app/sistem/kullanicilar', icon: 'Users', order: 931, parent: 'settings', permission: PERMISSIONS.security.view },
    { label: 'Roller', path: '/app/sistem/roller', icon: 'ShieldCheck', order: 932, parent: 'settings', permission: PERMISSIONS.security.view },
    { label: 'Yetki Matrisi', path: '/app/sistem/yetkiler', icon: 'Table2', order: 933, parent: 'settings', permission: PERMISSIONS.security.view },
  ],
  permissions: [
    { key: PERMISSIONS.security.view, label: 'Kullanici, rol ve yetkileri goruntule', fallback: [PERMISSIONS.tenancy.manage] },
    { key: PERMISSIONS.security.usersManage, label: 'Kullanici rol atamalarini yonet', fallback: [PERMISSIONS.security.view] },
    { key: PERMISSIONS.security.rolesManage, label: 'Rol ve permission matrix yonet', fallback: [PERMISSIONS.security.view] },
    { key: PERMISSIONS.security.scopesManage, label: 'Company/branch scope yonet', fallback: [PERMISSIONS.security.usersManage] },
    { key: PERMISSIONS.security.policyTest, label: 'Policy test aracini kullan', fallback: [PERMISSIONS.security.view] },
  ],
  actions: [
    { key: 'create_role', label: 'Rol olustur', actionType: 'operation', targetPage: '/app/sistem/roller', permission: PERMISSIONS.security.rolesManage },
    { key: 'update_role_permissions', label: 'Rol yetkilerini guncelle', actionType: 'operation', targetPage: '/app/sistem/yetkiler', permission: PERMISSIONS.security.rolesManage },
    { key: 'assign_user_role', label: 'Kullaniciya rol ata', actionType: 'operation', targetPage: '/app/sistem/kullanicilar', permission: PERMISSIONS.security.usersManage },
    { key: 'change_user_scope', label: 'Kullanici erisim kapsamini guncelle', actionType: 'operation', targetPage: '/app/sistem/kullanicilar', permission: PERMISSIONS.security.scopesManage },
    { key: 'run_policy_test', label: 'Policy test calistir', actionType: 'operation', targetPage: '/app/sistem/yetkiler', permission: PERMISSIONS.security.policyTest },
  ],
  projections: [],
  events: [
    { eventType: 'security.role_created', version: '1', aggregateType: 'security_role' },
    { eventType: 'security.role_permission_changed', version: '1', aggregateType: 'security_role' },
    { eventType: 'security.user_role_assigned', version: '1', aggregateType: 'security_user' },
    { eventType: 'security.user_scope_changed', version: '1', aggregateType: 'security_user' },
  ],
  featureFlags: [
    { key: 'security.enabled', label: 'Security/RBAC yonetimini etkinlestir', defaultEnabled: true },
    { key: 'security.permissionMatrix', label: 'Permission matrix ekranini etkinlestir', defaultEnabled: true },
    { key: 'security.policyTest', label: 'Policy test aracini etkinlestir', defaultEnabled: true },
    { key: 'security.scopeManagement', label: 'Company/branch scope yonetimini etkinlestir', defaultEnabled: true },
  ],
}
