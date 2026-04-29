'use client'

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react'

export interface ModuleLicense {
  module_key: string
  module_name: string
  is_active: boolean
  environment: string
}

export interface SubmoduleLicense {
  module_key: string
  submodule_key: string
  submodule_name: string
  is_active: boolean
  environment: string
}

interface ModuleLicenseContextType {
  modules: Record<string, ModuleLicense>
  submodules: Record<string, SubmoduleLicense>
  isModuleActive: (moduleKey: string) => boolean
  isSubmoduleActive: (moduleKey: string, submoduleKey: string) => boolean
  loading: boolean
  error: string | null
}

const ModuleLicenseContext = createContext<ModuleLicenseContextType | null>(null)

interface ModuleLicenseProviderProps {
  children: ReactNode
  initialLicenses?: {
    modules: ModuleLicense[]
    submodules: SubmoduleLicense[]
  }
}

export function ModuleLicenseProvider({ children, initialLicenses }: ModuleLicenseProviderProps) {
  const [modules, setModules] = useState<Record<string, ModuleLicense>>({})
  const [submodules, setSubmodules] = useState<Record<string, SubmoduleLicense>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialLicenses) {
      const modulesMap: Record<string, ModuleLicense> = {}
      const submodulesMap: Record<string, SubmoduleLicense> = {}

      initialLicenses.modules.forEach(m => {
        modulesMap[m.module_key] = m
      })

      initialLicenses.submodules.forEach(s => {
        submodulesMap[`${s.module_key}:${s.submodule_key}`] = s
      })

      setModules(modulesMap)
      setSubmodules(submodulesMap)
      setLoading(false)
    } else {
      fetch('/api/settings/module-licenses')
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
          }
          return res.json()
        })
        .then(data => {
          const modulesMap: Record<string, ModuleLicense> = {}
          const submodulesMap: Record<string, SubmoduleLicense> = {}

          data.modules?.forEach((m: ModuleLicense) => {
            modulesMap[m.module_key] = m
          })

          data.submodules?.forEach((s: SubmoduleLicense) => {
            submodulesMap[`${s.module_key}:${s.submodule_key}`] = s
          })

          setModules(modulesMap)
          setSubmodules(submodulesMap)
        })
        .catch(err => {
          console.error('Error fetching module licenses:', err)
          setError(err.message || 'Failed to fetch module licenses')
        })
        .finally(() => setLoading(false))
    }
  }, [initialLicenses])

  const isModuleActive = (moduleKey: string): boolean => {
    const module = modules[moduleKey]
    if (!module) return true
    if (!module.is_active) return false
    if (module.environment === 'all') return true
    return module.environment === process.env.NODE_ENV
  }

  const isSubmoduleActive = (moduleKey: string, submoduleKey: string): boolean => {
    const key = `${moduleKey}:${submoduleKey}`
    const submodule = submodules[key]
    if (!submodule) return true
    if (!submodule.is_active) return false
    if (submodule.environment === 'all') return true
    return submodule.environment === process.env.NODE_ENV
  }

  const contextValue = {
    modules,
    submodules,
    isModuleActive,
    isSubmoduleActive,
    loading,
    error
  }

  return React.createElement(
    ModuleLicenseContext.Provider,
    { value: contextValue },
    children
  )
}

export function useModuleLicense() {
  const context = useContext(ModuleLicenseContext)
  if (!context) throw new Error('useModuleLicense must be used within ModuleLicenseProvider')
  return context
}
