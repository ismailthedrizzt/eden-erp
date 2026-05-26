'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api/apiClient'
import { ModuleReadinessCard, type ModuleReadinessCardData } from './ModuleReadinessCard'

type TenantReadinessResponse = {
  data: {
    ready: boolean
    blockingModules: string[]
    warningModules: string[]
    modules: ModuleReadinessCardData[]
  }
}

const PRIMARY_MODULES = ['companies', 'partners', 'representatives', 'branches', 'organization', 'facilities']

export function TenantReadinessPanel() {
  const [data, setData] = useState<TenantReadinessResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const visibleModules = useMemo(() => {
    if (!data?.modules) return []
    const primary = data.modules.filter(module => PRIMARY_MODULES.includes(module.moduleKey))
    const blocked = data.modules.filter(module => !module.ready && !PRIMARY_MODULES.includes(module.moduleKey))
    return [...primary, ...blocked].slice(0, 9)
  }, [data])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get<TenantReadinessResponse>('/api/setup/readiness', { useCache: false })
      setData(response.data)
    } catch {
      setError('Calisma alani hazirlik durumu su anda okunamadi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <section data-tour-id="setup-readiness" className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-eden-navy-3/70">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white text-eden-blue shadow-sm dark:bg-eden-navy-2 dark:text-blue-300">
            {loading ? <Loader2 size={20} className="animate-spin" /> : data?.ready ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Calisma alani hazirlik durumu</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              {data?.ready
                ? 'Temel moduller kullanima hazir gorunuyor. Uyari olan moduller yine de ek ozellikler icin kontrol edilebilir.'
                : 'Bazi moduller kullanilmadan once kurulum veya bagli modul kontrolu gerektiriyor.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-eden-navy-2 dark:text-gray-200 dark:hover:bg-eden-navy"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && visibleModules.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleModules.map(module => (
            <ModuleReadinessCard key={module.moduleKey} module={module} />
          ))}
        </div>
      )}
    </section>
  )
}
