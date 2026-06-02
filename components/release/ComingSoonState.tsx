'use client'

import Link from 'next/link'
import { ArrowLeft, Clock3 } from 'lucide-react'
import { getCurrentReleaseEnvironment } from '@/lib/release/environment'

interface ComingSoonStateProps {
  moduleName?: string
  message?: string | null
}

export function ComingSoonState({ moduleName = 'Eden ERP', message }: ComingSoonStateProps) {
  const env = getCurrentReleaseEnvironment()
  const description = env === 'release'
    ? 'Bu ozellik yakinda kullanima acilacaktir.'
    : message || 'Bu sayfa henuz release ortaminda kullanima acilmadi.'

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4 py-12 dark:bg-[#09141e]">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-eden-navy-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-eden-blue/10 text-eden-blue dark:bg-sky-950/50 dark:text-sky-200">
          <Clock3 size={24} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-gray-950 dark:text-white">{moduleName}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{description}</p>
        <Link
          href="/app"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-eden-navy"
        >
          <ArrowLeft size={15} />
          Ana sayfaya don
        </Link>
      </div>
    </div>
  )
}
