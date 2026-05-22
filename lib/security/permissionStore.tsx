'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api/apiClient'
import { hasPublicApiBaseUrl } from '@/lib/api/publicApiBaseUrl'
import type { PermissionKey } from '@/packages/shared/src'

interface PermissionContextValue {
  permissions: Set<string>
  loading: boolean
  error: string | null
  can: (permission?: string | null) => boolean
  canAll: (permissions: Array<string | null | undefined>) => boolean
  refetch: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

function shouldUseDemoPermissions() {
  return !hasPublicApiBaseUrl()
}

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    if (shouldUseDemoPermissions()) {
      setPermissions(new Set(['__eden_demo_allow_all__']))
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    try {
      const payload = await apiClient<{ permissions: PermissionKey[] }>('/permissions/me')
      setPermissions(new Set(payload.permissions || []))
      setError(null)
    } catch (err) {
      setPermissions(new Set())
      setError(err instanceof Error ? err.message : 'Permissions could not be loaded')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  const value = useMemo<PermissionContextValue>(() => ({
    permissions,
    loading,
    error,
    can: (permission) => !permission || permissions.has('__eden_demo_allow_all__') || permissions.has(permission),
    canAll: (items) => permissions.has('__eden_demo_allow_all__') || items.every((permission) => !permission || permissions.has(permission)),
    refetch,
  }), [permissions, loading, error])

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (!context) throw new Error('usePermissions must be used within PermissionProvider')
  return context
}
