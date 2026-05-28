'use client'

import { AlertTriangle, CheckCircle2, CircleSlash, LockKeyhole, Wrench } from 'lucide-react'
import { SetupActionButton, type SetupActionItem } from './SetupActionButton'
import { SetupStepList, type SetupStepItem } from './SetupStepList'
import {
  moduleProductDescription,
  moduleProductLabel,
  normalizeProductStatus,
  productStatusLabels,
} from '@/lib/modules/moduleProductCatalog'
import { cn } from '@/lib/utils'

export type ModuleReadinessCardData = {
  moduleKey: string
  ready: boolean
  status: string
  blockingReasons: string[]
  warnings: string[]
  setupSteps: SetupStepItem[]
  setupActions: SetupActionItem[]
  licenseStatus?: string
  dependencies?: string[]
  description?: string
}

export function ModuleReadinessCard({ module }: { module: ModuleReadinessCardData }) {
  const status = normalizeProductStatus(module.status)
  const Icon = module.ready || status === 'available'
    ? CheckCircle2
    : status === 'disabled'
      ? CircleSlash
      : status === 'unlicensed'
        ? LockKeyhole
        : Wrench
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-eden-navy-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
            module.ready
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'
          )}>
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {moduleProductLabel(module.moduleKey)}
            </h3>
            <p className={cn(
              'mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
              module.ready || status === 'available'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
            )}>
              {productStatusLabels[status] || 'Kontrol gerekli'}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
        {module.description || moduleProductDescription(module.moduleKey)}
      </p>

      {module.blockingReasons.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <p>{module.blockingReasons[0]}</p>
          </div>
        </div>
      )}

      {module.warnings.length > 0 && (
        <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
          {module.warnings[0]}
        </p>
      )}

      {module.dependencies && module.dependencies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {module.dependencies.map(dependency => (
            <span key={dependency} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {moduleProductLabel(dependency)}
            </span>
          ))}
        </div>
      )}

      <SetupStepList steps={module.setupSteps || []} />

      {module.setupActions?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {module.setupActions.slice(0, 2).map(action => (
            <SetupActionButton key={action.key} action={action} />
          ))}
        </div>
      )}
    </article>
  )
}
