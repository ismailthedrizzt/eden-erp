'use client'

import { useState, useEffect } from 'react'
import { PageBanner } from '@/components/ui/PageBanner'
import { Settings, ChevronDown, ChevronRight } from 'lucide-react'
import { useModuleLicense, ModuleLicense, SubmoduleLicense } from '@/hooks/useModuleLicense'

export default function ModuleLicensesPage() {
  const { modules, submodules, loading } = useModuleLicense()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

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

  // Group submodules by module
  const submodulesByModule: Record<string, SubmoduleLicense[]> = {}
  Object.values(submodules).forEach(sub => {
    if (!submodulesByModule[sub.module_key]) {
      submodulesByModule[sub.module_key] = []
    }
    submodulesByModule[sub.module_key].push(sub)
  })

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
          {Object.values(modules).map(module => {
            const moduleSubmodules = submodulesByModule[module.module_key] || []
            const isExpanded = expandedModules.has(module.module_key)

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
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`module-${module.module_key}`}
                        checked={module.is_active}
                        onChange={() => toggleModule(module.module_key, module.is_active)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Aktif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`module-${module.module_key}`}
                        checked={!module.is_active}
                        onChange={() => toggleModule(module.module_key, module.is_active)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Pasif</span>
                    </label>
                  </div>
                </div>

                {/* Submodules */}
                {isExpanded && moduleSubmodules.length > 0 && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    {moduleSubmodules.map(submodule => (
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
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`submodule-${submodule.module_key}-${submodule.submodule_key}`}
                              checked={submodule.is_active}
                              onChange={() => toggleSubmodule(submodule.module_key, submodule.submodule_key, submodule.is_active)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Aktif</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`submodule-${submodule.module_key}-${submodule.submodule_key}`}
                              checked={!submodule.is_active}
                              onChange={() => toggleSubmodule(submodule.module_key, submodule.submodule_key, submodule.is_active)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Pasif</span>
                          </label>
                        </div>
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
