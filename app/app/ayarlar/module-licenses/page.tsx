'use client'

import { useState, useEffect } from 'react'
import { PageBanner } from '@/components/ui/PageBanner'
import { Settings, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import { useModuleLicense, ModuleLicense, SubmoduleLicense } from '@/hooks/useModuleLicense'

export default function ModuleLicensesPage() {
  const { modules, submodules, isModuleActive, isSubmoduleActive, loading } = useModuleLicense()
  const [editingModules, setEditingModules] = useState<Record<string, boolean>>({})
  const [editingSubmodules, setEditingSubmodules] = useState<Record<string, boolean>>({})

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

  if (loading) {
    return <div className="p-8">Yükleniyor...</div>
  }

  return (
    <>
      <PageBanner
        title="Modül Lisansları"
        icon={<Settings size={24} />}
      />

      <div className="mt-6 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield size={20} />
            Ana Modüller
          </h2>
          <div className="space-y-3">
            {Object.values(modules).map(module => (
              <div
                key={module.module_key}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{module.module_name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Key: {module.module_key} | Environment: {module.environment}
                  </div>
                </div>
                <button
                  onClick={() => toggleModule(module.module_key, module.is_active)}
                  className={`p-2 rounded-lg transition-colors ${
                    module.is_active
                      ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {module.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield size={20} />
            Alt Modüller
          </h2>
          <div className="space-y-4">
            {Object.values(submodules).map(submodule => (
              <div
                key={`${submodule.module_key}:${submodule.submodule_key}`}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{submodule.submodule_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {submodule.module_key} / {submodule.submodule_key}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSubmodule(submodule.module_key, submodule.submodule_key, submodule.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      submodule.is_active
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {submodule.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Environment: {submodule.environment}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
