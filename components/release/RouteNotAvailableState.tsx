'use client'

import { Lock } from 'lucide-react'
import { ComingSoonState } from './ComingSoonState'

export function RouteNotAvailableState({
  route,
  reason,
}: {
  route?: string | null
  reason?: string | null
}) {
  if (reason === 'coming_soon') {
    return <ComingSoonState moduleName="Eden ERP" />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-[#09141e]">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-eden-navy-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <Lock size={24} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-gray-950 dark:text-white">Sayfa kullanima kapali</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Bu sayfa bu ortamda yayina alinmamis.
        </p>
        {route && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500 dark:bg-eden-navy dark:text-gray-400">
            {route}
          </p>
        )}
      </div>
    </div>
  )
}
