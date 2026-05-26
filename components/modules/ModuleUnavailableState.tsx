'use client'

import Link from 'next/link'
import { AlertCircle, Lock, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ModuleUnavailableAction {
  label: string
  targetPage?: string
  onClick?: () => void
}

export interface ModuleUnavailableStateProps {
  moduleKey?: string
  title: string
  message: string
  status?: 'disabled' | 'unlicensed' | 'setup_required' | 'dependency_missing' | 'permission_denied' | string
  actions?: ModuleUnavailableAction[]
  className?: string
}

export function ModuleUnavailableState({
  title,
  message,
  status = 'disabled',
  actions = [],
  className,
}: ModuleUnavailableStateProps) {
  const Icon = status === 'unlicensed' ? Lock : status === 'setup_required' ? Wrench : AlertCircle
  return (
    <section
      className={cn(
        'rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
        className
      )}
    >
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{message}</p>
          {actions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map(action => action.targetPage ? (
                <Link
                  key={`${action.label}-${action.targetPage}`}
                  href={action.targetPage}
                  className="inline-flex h-9 items-center rounded-md bg-amber-700 px-3 text-sm font-medium text-white hover:bg-amber-800"
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="inline-flex h-9 items-center rounded-md bg-amber-700 px-3 text-sm font-medium text-white hover:bg-amber-800"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ModuleUnavailableState
