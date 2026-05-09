'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardWidgetShellProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function DashboardWidgetShell({ title, description, children, className }: DashboardWidgetShellProps) {
  return (
    <section className={cn(
      'flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900',
      className
    )}>
      <div className="mb-2 min-w-0">
        <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">{title}</h3>
        {description && <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}
