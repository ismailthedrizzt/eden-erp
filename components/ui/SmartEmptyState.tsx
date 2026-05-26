'use client'

import { ArrowRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartEmptyStateProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function SmartEmptyState({ title, message, actionLabel, onAction, className }: SmartEmptyStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-xl flex-col items-center rounded-lg border border-dashed border-gray-300 bg-white px-5 py-7 text-center dark:border-gray-700 dark:bg-gray-950',
        className
      )}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
        <Info size={18} />
      </span>
      <div className="mt-3 text-sm font-semibold text-gray-950 dark:text-white">{title}</div>
      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
        >
          {actionLabel}
          <ArrowRight size={14} />
        </button>
      ) : null}
    </div>
  )
}
