'use client'

import { getCurrentReleaseEnvironment } from '@/lib/release/environment'
import { getReleaseBadgeLabel } from '@/lib/release/releaseVisibility'
import type { ReleaseStatus } from '@/lib/release/routeReleaseRegistry'
import { cn } from '@/lib/utils'

export function ReleaseStatusBadge({
  status,
  className,
}: {
  status: ReleaseStatus
  className?: string
}) {
  const env = getCurrentReleaseEnvironment()
  const label = getReleaseBadgeLabel(status, env)
  if (!label) return null

  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100',
        className,
      )}
      title={`Release status: ${label}`}
    >
      {label}
    </span>
  )
}
