export interface FeatureFlag {
  key: string
  moduleKey: string
  label: string
  defaultEnabled: boolean
  description?: string
}

export const featureFlags = [
  {
    key: 'branches.facilityAutoCreate',
    moduleKey: 'branches',
    label: 'Sube acilisinda tesis/lokasyon olusturma',
    defaultEnabled: true,
  },
  {
    key: 'branches.organizationAutoCreate',
    moduleKey: 'branches',
    label: 'Sube acilisinda organizasyon birimi olusturma',
    defaultEnabled: true,
  },
  {
    key: 'branches.documentUpdate',
    moduleKey: 'branches',
    label: 'Sube belge guncelleme islemleri',
    defaultEnabled: true,
  },
  {
    key: 'representatives.scopeAuthority',
    moduleKey: 'representatives',
    label: 'Kapsam bazli temsil yetkisi',
    defaultEnabled: true,
  },
  {
    key: 'actionGuide.enabled',
    moduleKey: 'settings',
    label: 'AI Islem Rehberi',
    defaultEnabled: true,
  },
  {
    key: 'guidedTour.enabled',
    moduleKey: 'settings',
    label: 'Rehberli tur',
    defaultEnabled: true,
  },
  {
    key: 'processEngine.enabled',
    moduleKey: 'process',
    label: 'Surec motoru',
    defaultEnabled: true,
  },
  {
    key: 'auditLog.enabled',
    moduleKey: 'audit',
    label: 'Denetim izi',
    defaultEnabled: true,
  },
  {
    key: 'actionCenter.enabled',
    moduleKey: 'actionCenter',
    label: 'Is merkezi',
    defaultEnabled: true,
  },
] satisfies FeatureFlag[]

const featureFlagByKey = new Map(featureFlags.map(flag => [flag.key, flag]))

export function listFeatureFlags() {
  return [...featureFlags]
}

export function getFeatureFlag(key: string) {
  return featureFlagByKey.get(key) || null
}

export function getDefaultFeatureFlagMap() {
  return Object.fromEntries(featureFlags.map(flag => [flag.key, flag.defaultEnabled])) as Record<string, boolean>
}

export function isFeatureFlagEnabled(key: string, runtimeFlags?: Record<string, boolean>) {
  if (runtimeFlags && Object.prototype.hasOwnProperty.call(runtimeFlags, key)) {
    return Boolean(runtimeFlags[key])
  }
  return getFeatureFlag(key)?.defaultEnabled ?? true
}
