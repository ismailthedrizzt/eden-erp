'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api/apiClient'
import { hasPublicApiBaseUrl } from '@/lib/api/publicApiBaseUrl'
import type { InstanceModule, ModuleStatus } from '@/packages/shared/src'
import type { ModuleRuntimeAvailability } from '@/lib/modules/moduleContract.types'

export interface ClientModuleRuntime {
  key: string
  name: string
  enabled: boolean
  licensed: boolean
  setupComplete: boolean
  status: ModuleRuntimeAvailability
  permissions: string[]
  actions: Array<Record<string, unknown>>
  routes: Array<Record<string, unknown>>
  warnings: string[]
}

interface ModuleContextValue {
  modules: Record<string, InstanceModule>
  runtimeModules: Record<string, ClientModuleRuntime>
  loading: boolean
  error: string | null
  getStatus: (moduleCode: string) => ModuleStatus
  getRuntimeStatus: (moduleCode: string) => ModuleRuntimeAvailability
  getRuntimeModule: (moduleCode: string) => ClientModuleRuntime | null
  isEnabled: (moduleCode: string) => boolean
  isWritable: (moduleCode: string) => boolean
  refetch: () => Promise<void>
}

const ModuleContext = createContext<ModuleContextValue | null>(null)

export function ModuleProvider({ children, initialModules }: { children: React.ReactNode; initialModules?: ClientModuleRuntime[] }) {
  const [modules, setModules] = useState<Record<string, InstanceModule>>({})
  const [runtimeModules, setRuntimeModules] = useState<Record<string, ClientModuleRuntime>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    if (!hasPublicApiBaseUrl()) {
      if (!initialModules?.length) setModules({})
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    try {
      const payload = await apiClient<{ data: InstanceModule[] }>('/modules')
      setModules(Object.fromEntries((payload.data || []).map((item) => [item.module_code, item])))
      setError(null)
    } catch (err) {
      setModules({})
      setError(err instanceof Error ? err.message : 'Modules could not be loaded')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialModules?.length) {
      setRuntimeModules(Object.fromEntries(initialModules.map(item => [item.key, item])))
      setModules(Object.fromEntries(initialModules.map(item => [item.key, runtimeToInstanceModule(item)])))
      setLoading(false)
      setError(null)
      return
    }
    refetch()
  }, [initialModules])

  const value = useMemo<ModuleContextValue>(() => ({
    modules,
    runtimeModules,
    loading,
    error,
    getStatus: (moduleCode) => modules[moduleCode]?.status || 'enabled',
    getRuntimeStatus: (moduleCode) => runtimeModules[moduleCode]?.status || (modules[moduleCode]?.status === 'disabled' ? 'disabled' : 'available'),
    getRuntimeModule: (moduleCode) => runtimeModules[moduleCode] || null,
    isEnabled: (moduleCode) => modules[moduleCode]?.status !== 'disabled',
    isWritable: (moduleCode) => {
      const status = modules[moduleCode]?.status || 'enabled'
      return status === 'enabled' || status === 'beta'
    },
    refetch,
  }), [modules, runtimeModules, loading, error])

  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>
}

export function useModules() {
  const context = useContext(ModuleContext)
  if (!context) throw new Error('useModules must be used within ModuleProvider')
  return context
}

function runtimeToInstanceModule(module: ClientModuleRuntime): InstanceModule {
  return {
    id: `runtime:${module.key}`,
    instance_id: '',
    module_code: module.key,
    status: runtimeToLegacyStatus(module.status),
    settings_json: {
      source: 'module_registry',
      licensed: module.licensed,
      setupComplete: module.setupComplete,
      warnings: module.warnings,
    },
  }
}

function runtimeToLegacyStatus(status: ModuleRuntimeAvailability): ModuleStatus {
  if (status === 'disabled' || status === 'unlicensed') return 'disabled'
  if (status === 'setup_required' || status === 'dependency_missing') return 'readonly'
  return 'enabled'
}
