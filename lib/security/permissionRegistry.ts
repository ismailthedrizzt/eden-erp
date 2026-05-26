import { PERMISSIONS } from '@/packages/shared/src'

export type PermissionCategory = 'view' | 'edit' | 'operation' | 'approval' | 'admin'

export interface PermissionContract {
  key: string
  label: string
  description?: string
  moduleKey: string
  domain?: string
  category?: PermissionCategory
  fallback?: string[]
  deprecated?: boolean
}

export const permissionRegistry = {
  companies: {
    view: PERMISSIONS.companies.view,
    edit: PERMISSIONS.companies.edit,
    openingStart: PERMISSIONS.companies.openingStart,
    liquidationStart: PERMISSIONS.companies.liquidationStart,
    deregistrationStart: PERMISSIONS.companies.deregistrationStart,
    officialChangeStart: 'companies.official_change.start',
    capitalIncreaseStart: 'companies.capital_increase.start',
    capitalDecreaseStart: 'companies.capital_decrease.start',
  },
  branches: {
    view: PERMISSIONS.branches.view,
    edit: PERMISSIONS.branches.edit,
    openingStart: PERMISSIONS.branches.openingStart,
    closingStart: PERMISSIONS.branches.closingStart,
    documentsUpdate: PERMISSIONS.branches.documentsUpdate,
  },
  partners: {
    view: 'partners.view',
    edit: 'partners.edit',
    ownershipStart: 'partners.ownership.start',
    ownershipUpdate: 'partners.ownership.update',
    ownershipApprove: 'partners.ownership.approve',
    ownershipReverse: 'partners.ownership.reverse',
  },
  representatives: {
    view: 'representatives.view',
    insert: 'representatives.insert',
    edit: 'representatives.edit',
    delete: 'representatives.delete',
    authorityStart: 'representatives.authority.start',
    authorityUpdate: 'representatives.authority.update',
    authoritySuspend: 'representatives.authority.suspend',
    authorityTerminate: 'representatives.authority.terminate',
    authorityApprove: 'representatives.authority.approve',
  },
  organization: {
    view: 'organization.view',
    edit: 'organization.edit',
    structureManage: 'organization.structure.manage',
    positionManage: 'organization.position.manage',
  },
  facilities: {
    view: 'facilities.view',
    edit: 'facilities.edit',
    linkBranch: 'facilities.link_branch',
    deactivate: 'facilities.deactivate',
  },
  settings: {
    view: 'settings.view',
    edit: 'settings.edit',
    modulesManage: 'settings.modules.manage',
    usersManage: 'settings.users.manage',
  },
} as const

const permissionAliases: Record<string, string> = {
  'companies.openingStart': permissionRegistry.companies.openingStart,
  'companies.liquidationStart': permissionRegistry.companies.liquidationStart,
  'companies.deregistrationStart': permissionRegistry.companies.deregistrationStart,
  'companies.officialChangeStart': permissionRegistry.companies.officialChangeStart,
  'companies.capitalIncreaseStart': permissionRegistry.companies.capitalIncreaseStart,
  'companies.capitalDecreaseStart': permissionRegistry.companies.capitalDecreaseStart,
  'branches.openingStart': permissionRegistry.branches.openingStart,
  'branches.closingStart': permissionRegistry.branches.closingStart,
  'branches.documentsUpdate': permissionRegistry.branches.documentsUpdate,
  'partners.ownershipStart': permissionRegistry.partners.ownershipStart,
  'partners.ownershipUpdate': permissionRegistry.partners.ownershipUpdate,
  'partners.ownershipApprove': permissionRegistry.partners.ownershipApprove,
  'partners.ownershipReverse': permissionRegistry.partners.ownershipReverse,
  'representatives.authorityStart': permissionRegistry.representatives.authorityStart,
  'representatives.authorityUpdate': permissionRegistry.representatives.authorityUpdate,
  'representatives.authoritySuspend': permissionRegistry.representatives.authoritySuspend,
  'representatives.authorityTerminate': permissionRegistry.representatives.authorityTerminate,
  'representatives.authorityApprove': permissionRegistry.representatives.authorityApprove,
  'organization.structureManage': permissionRegistry.organization.structureManage,
  'organization.positionManage': permissionRegistry.organization.positionManage,
  'facilities.linkBranch': permissionRegistry.facilities.linkBranch,
  'settings.modulesManage': permissionRegistry.settings.modulesManage,
  'settings.usersManage': permissionRegistry.settings.usersManage,
}

export const permissionContracts = [
  contract(permissionRegistry.companies.view, 'Sirketleri goruntuleme', 'companies', 'view'),
  contract(permissionRegistry.companies.edit, 'Sirketleri duzenleme', 'companies', 'edit'),
  contract(permissionRegistry.companies.openingStart, 'Sirket acilisi baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.liquidationStart, 'Sirket tasfiyesi baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.deregistrationStart, 'Sirket terkini baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.officialChangeStart, 'Resmi degisiklik baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.capitalIncreaseStart, 'Sermaye artirimi baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.companies.capitalDecreaseStart, 'Sermaye azaltimi baslatma', 'companies', 'operation', [permissionRegistry.companies.edit]),

  contract(permissionRegistry.branches.view, 'Subeleri goruntuleme', 'branches', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.branches.edit, 'Subeleri duzenleme', 'branches', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.branches.openingStart, 'Sube acilisi baslatma', 'branches', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.branches.closingStart, 'Sube kapanisi baslatma', 'branches', 'operation', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.branches.documentsUpdate, 'Sube belgelerini guncelleme', 'branches', 'operation', [permissionRegistry.companies.edit]),

  contract(permissionRegistry.partners.view, 'Ortaklari goruntuleme', 'partners', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.partners.edit, 'Ortaklari duzenleme', 'partners', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.partners.ownershipStart, 'Ortaklik islemi baslatma', 'partners', 'operation', [permissionRegistry.partners.edit]),
  contract(permissionRegistry.partners.ownershipUpdate, 'Ortaklik islemi guncelleme', 'partners', 'operation', [permissionRegistry.partners.edit]),
  contract(permissionRegistry.partners.ownershipApprove, 'Ortaklik islemi onaylama', 'partners', 'approval', [permissionRegistry.partners.edit]),
  contract(permissionRegistry.partners.ownershipReverse, 'Ortaklik islemi ters kayit', 'partners', 'operation', [permissionRegistry.partners.edit]),

  contract(permissionRegistry.representatives.view, 'Temsilcileri goruntuleme', 'representatives', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.representatives.insert, 'Temsilci taslagi olusturma', 'representatives', 'edit', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.edit, 'Temsilcileri duzenleme', 'representatives', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.representatives.delete, 'Temsilci taslagi silme', 'representatives', 'edit', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authorityStart, 'Temsil yetkisi baslatma', 'representatives', 'operation', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authorityUpdate, 'Temsil yetkisi guncelleme', 'representatives', 'operation', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authoritySuspend, 'Temsil yetkisini askiya alma', 'representatives', 'operation', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authorityTerminate, 'Temsil yetkisi sonlandirma', 'representatives', 'operation', [permissionRegistry.representatives.edit]),
  contract(permissionRegistry.representatives.authorityApprove, 'Temsil yetkisi onaylama', 'representatives', 'approval', [permissionRegistry.representatives.edit]),

  contract(permissionRegistry.organization.view, 'Organizasyonu goruntuleme', 'organization', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.organization.edit, 'Organizasyonu duzenleme', 'organization', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.organization.structureManage, 'Organizasyon yapisini yonetme', 'organization', 'operation', [permissionRegistry.organization.edit]),
  contract(permissionRegistry.organization.positionManage, 'Kadro/pozisyon yonetme', 'organization', 'operation', [permissionRegistry.organization.edit]),

  contract(permissionRegistry.facilities.view, 'Tesisleri goruntuleme', 'facilities', 'view', [permissionRegistry.companies.view]),
  contract(permissionRegistry.facilities.edit, 'Tesisleri duzenleme', 'facilities', 'edit', [permissionRegistry.companies.edit]),
  contract(permissionRegistry.facilities.linkBranch, 'Tesisi subeye baglama', 'facilities', 'operation', [permissionRegistry.facilities.edit]),
  contract(permissionRegistry.facilities.deactivate, 'Tesisi pasife alma', 'facilities', 'operation', [permissionRegistry.facilities.edit]),

  contract(permissionRegistry.settings.view, 'Ayarlar goruntuleme', 'settings', 'view'),
  contract(permissionRegistry.settings.edit, 'Ayarlar duzenleme', 'settings', 'edit'),
  contract(permissionRegistry.settings.modulesManage, 'Modul lisanslarini yonetme', 'settings', 'admin', [permissionRegistry.settings.edit]),
  contract(permissionRegistry.settings.usersManage, 'Kullanicilari yonetme', 'settings', 'admin', [permissionRegistry.settings.edit]),
] satisfies PermissionContract[]

const permissionByKey = new Map(permissionContracts.map(item => [item.key, item]))

export const permissionFallbacks = Object.fromEntries(
  permissionContracts
    .filter(item => item.fallback?.length)
    .map(item => [item.key, item.fallback || []])
) as Record<string, string[]>

export function getPermissionContract(key: string) {
  return permissionByKey.get(normalizePermissionKey(key)) || null
}

export function listPermissionContracts() {
  return [...permissionContracts]
}

export function listPermissionsByModule(moduleKey: string) {
  return permissionContracts.filter(item => item.moduleKey === moduleKey)
}

export function getPermissionFallbacks(key: string) {
  return getPermissionContract(key)?.fallback || []
}

export function normalizePermissionKey(key: string) {
  return permissionAliases[key] || key
}

export function permissionExists(key: string) {
  return permissionByKey.has(normalizePermissionKey(key))
}

export function resolvePermissionWithFallback(permissionKey: string) {
  const visited = new Set<string>()
  const resolved: string[] = []

  function visit(key: string) {
    const normalized = normalizePermissionKey(key)
    if (visited.has(normalized)) return
    visited.add(normalized)
    resolved.push(normalized)
    getPermissionFallbacks(normalized).forEach(visit)
  }

  visit(permissionKey)
  return resolved
}

export function expandPermissionFallbacks(permissionKeys: string[]) {
  return Array.from(new Set(permissionKeys.flatMap(resolvePermissionWithFallback)))
}

export function hasAnyPermission(userPermissions: string[] | undefined, permissionKeys: string[]) {
  const permissions = new Set(userPermissions || [])
  if (permissions.has('__eden_demo_allow_all__')) return true
  return expandPermissionFallbacks(permissionKeys).some(key => permissions.has(normalizePermissionKey(key)))
}

function contract(
  key: string,
  label: string,
  moduleKey: string,
  category?: PermissionCategory,
  fallback?: string[],
  description?: string
): PermissionContract {
  return {
    key,
    label,
    moduleKey,
    category,
    fallback,
    description,
    domain: moduleKey === 'settings' ? 'platform' : 'company',
  }
}
