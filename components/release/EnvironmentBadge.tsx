'use client'

import { getCurrentReleaseEnvironment } from '@/lib/release/environment'
import { cn } from '@/lib/utils'

export function EnvironmentBadge({ className }: { className?: string }) {
  const env = getCurrentReleaseEnvironment()
  if (env === 'release') return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-normal text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100',
        className,
      )}
      title={`Eden ERP ${env} environment`}
    >
      {env}
    </span>
  )
}
