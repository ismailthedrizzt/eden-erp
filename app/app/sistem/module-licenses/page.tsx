'use client'

import { useState } from 'react'
import { PageBanner } from '@/components/ui/PageBanner'
import { Settings, ChevronDown, ChevronRight } from 'lucide-react'
import { useModuleLicense, ModuleLicense, SubmoduleLicense } from '@/hooks/useModuleLicense'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch'
import { TriStateToggle } from '@/components/ui/TriStateToggle'

// Fixed module order matching sidebar navigation
const MODULE_ORDER = ['ik', 'muhasebe', 'stok', 'satis', 'uretim', 'servis', 'teskilat', 'kadro']

// Submodule order matching sidebar navigation
const SUBMODULE_ORDER: Record<string, string[]> = {
  ik: ['teskilat', 'personel'],
  muhasebe: ['dashboard', 'fatura', 'cari'],
  teskilat: ['birimler'],
  kadro: ['kadrolar']
}

type TriState = 'on' | 'off' | 'partial'

export default function ModuleLicensesPage() {
  const { modules, submodules, loading, error } = useModuleLicense()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  const toggleModuleExpand = (moduleKey: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleKey)) {
        newSet.delete(moduleKey)
      } else {
        newSet.add(moduleKey)
      }
      return newSet
    })
  }

  const toggleModule = async (moduleKey: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/settings/module-licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'module',
          key: moduleKey,
          is_active: !currentStatus
        })
      })
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error toggling module:', error)
    }
  }

  const toggleSubmodule = async (moduleKey: string, submoduleKey: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/settings/module-licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'submodule',
          moduleKey,
          submoduleKey,
          is_active: !currentStatus
        })
      })
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error toggling submodule:', error)
    }
  }

  // Calculate module state based on submodules
  const getModuleState = (moduleKey: string): TriState => {
    const moduleSubmodules = Object.values(submodules).filter(s => s.module_key === moduleKey)
    if (moduleSubmodules.length === 0) {
      return modules[moduleKey]?.is_active ? 'on' : 'off'
    }
    const allActive = moduleSubmodules.every(s => s.is_active)
    const allInactive = moduleSubmodules.every(s => !s.is_active)
    if (allActive) return 'on'
    if (allInactive) return 'off'
    return 'partial'
  }

  // Handle tri-state toggle for modules
  const handleModuleTriState = async (moduleKey: string, state: TriState) => {
    const newStatus = state === 'on'
    await toggleModule(moduleKey, newStatus)
  }

  // Group submodules by module
  const submodulesByModule: Record<string, SubmoduleLicense[]> = {}
  Object.values(submodules).forEach(sub => {
    if (!submodulesByModule[sub.module_key]) {
      submodulesByModule[sub.module_key] = []
    }
    submodulesByModule[sub.module_key].push(sub)
  })

  // Sort modules by fixed order
  const sortedModules = MODULE_ORDER
    .map(key => modules[key])
    .filter((m): m is ModuleLicense => m !== undefined)

  if (loading) {
    return <div className="p-8">Yükleniyor...</div>
  }

  if (error) {
    return <div className="p-8 text-red-500">Hata: {error}</div>
  }

  if (Object.keys(modules).length === 0) {
    return <div className="p-8 text-gray-500">Modül lisansı bulunamadı. Veritabanı tablolarının oluşturulduğundan emin olun.</div>
  }

  return (
    <>
      <PageBanner
        title="Modül Lisansları"
        icon={<Settings size={24} />}
      />

      <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {sortedModules.map(module => {
            const moduleSubmodules = submodulesByModule[module.module_key] || []
            const isExpanded = expandedModules.has(module.module_key)
            const moduleState = getModuleState(module.module_key)

            // Sort submodules by fixed order
            const sortedSubmodules = SUBMODULE_ORDER[module.module_key]
              ? SUBMODULE_ORDER[module.module_key]
                  .map(key => moduleSubmodules.find(s => s.submodule_key === key))
                  .filter((s): s is SubmoduleLicense => s !== undefined)
              : moduleSubmodules

            return (
              <div key={module.module_key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* Module Header */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleModuleExpand(module.module_key)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{module.module_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Key: {module.module_key} | Environment: {module.environment}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {moduleSubmodules.length > 0 ? (
                      <TriStateToggle
                        state={moduleState}
                        onChange={(state) => handleModuleTriState(module.module_key, state)}
                        size="md"
                      />
                    ) : (
                      <ToggleSwitch
                        checked={module.is_active}
                        onChange={(checked) => toggleModule(module.module_key, module.is_active)}
                        size="md"
                      />
                    )}
                  </div>
                </div>

                {/* Submodules */}
                {isExpanded && moduleSubmodules.length > 0 && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    {sortedSubmodules.map(submodule => (
                      <div
                        key={`${submodule.module_key}:${submodule.submodule_key}`}
                        className="flex items-center justify-between pl-8"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {submodule.submodule_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Key: {submodule.submodule_key} | Environment: {submodule.environment}
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={submodule.is_active}
                          onChange={(checked) => toggleSubmodule(submodule.module_key, submodule.submodule_key, submodule.is_active)}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
