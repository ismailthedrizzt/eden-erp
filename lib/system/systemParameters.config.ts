export type SystemParameterType = 'text' | 'number' | 'boolean' | 'enum'

export interface SystemParameterDefinition {
  key: string
  label: string
  description?: string
  moduleKey: string
  moduleLabel: string
  pageKey: string
  pageLabel: string
  type: SystemParameterType
  defaultValue: string
  options?: string[]
}

export const systemParameterDefinitions: SystemParameterDefinition[] = [
  {
    key: 'nace.default_hazard_class',
    label: 'NACE varsayılan tehlike sınıfı',
    description: 'Resmi NACE faaliyet listesinde tehlike sınıfı bulunmadığında yeni satırlara uygulanır.',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'sirketler',
    pageLabel: 'Şirketler',
    type: 'enum',
    defaultValue: 'Az Tehlikeli',
    options: ['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'],
  },
  {
    key: 'nace.max_active_company_codes',
    label: 'Firma başına aktif NACE limiti',
    description: 'Şirket kamu bilgileri sekmesinde aynı firmaya eklenebilecek aktif NACE kodu sayısı.',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'sirketler',
    pageLabel: 'Şirketler',
    type: 'number',
    defaultValue: '5',
  },
  {
    key: 'company.default_currency',
    label: 'Varsayılan para birimi',
    moduleKey: 'sirket',
    moduleLabel: 'Şirket Yönetimi',
    pageKey: 'sirketler',
    pageLabel: 'Şirketler',
    type: 'enum',
    defaultValue: 'TRY',
    options: ['TRY', 'USD', 'EUR', 'GBP'],
  },
  {
    key: 'accounting.default_currency',
    label: 'Muhasebe varsayılan para birimi',
    moduleKey: 'muhasebe',
    moduleLabel: 'Muhasebe',
    pageKey: 'cari-kartlar',
    pageLabel: 'Cari Kartlar',
    type: 'enum',
    defaultValue: 'TRY',
    options: ['TRY', 'USD', 'EUR', 'GBP'],
  },
]

export function getSystemParameterDefinition(key: string) {
  return systemParameterDefinitions.find(item => item.key === key)
}

export function systemParameterDefaultValue(key: string) {
  return getSystemParameterDefinition(key)?.defaultValue || ''
}

export function uniqueSystemParameterModules() {
  return uniqueBy(systemParameterDefinitions.map(item => ({
    key: item.moduleKey,
    label: item.moduleLabel,
  })), item => item.key)
}

export function uniqueSystemParameterPages(moduleKey?: string) {
  return uniqueBy(systemParameterDefinitions
    .filter(item => !moduleKey || item.moduleKey === moduleKey)
    .map(item => ({
      key: item.pageKey,
      label: item.pageLabel,
      moduleKey: item.moduleKey,
    })), item => `${item.moduleKey}:${item.key}`)
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
