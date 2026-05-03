'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api/apiClient'
import type { InstanceModule, ModuleStatus } from '@/packages/shared/src'

interface ModuleContextValue {
  modules: Record<string, InstanceModule>
  loading: boolean
  error: string | null
  getStatus: (moduleCode: string) => ModuleStatus
  isEnabled: (moduleCode: string) => boolean
  isWritable: (moduleCode: string) => boolean
  refetch: () => Promise<void>
}

const ModuleContext = createContext<ModuleContextValue | null>(null)

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<Record<string, InstanceModule>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
      setModules({})
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
    refetch()
  }, [])

  const value = useMemo<ModuleContextValue>(() => ({
    modules,
    loading,
    error,
    getStatus: (moduleCode) => modules[moduleCode]?.status || 'enabled',
    isEnabled: (moduleCode) => modules[moduleCode]?.status !== 'disabled',
    isWritable: (moduleCode) => {
      const status = modules[moduleCode]?.status || 'enabled'
      return status === 'enabled' || status === 'beta'
    },
    refetch,
  }), [modules, loading, error])

  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>
}

export function useModules() {
  const context = useContext(ModuleContext)
  if (!context) throw new Error('useModules must be used within ModuleProvider')
  return context
}
