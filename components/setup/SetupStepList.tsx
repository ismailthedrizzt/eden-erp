'use client'

import { AlertTriangle, CheckCircle2, Circle, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SetupStepItem = {
  key: string
  label: string
  description: string
  required: boolean
  status?: 'completed' | 'missing' | 'warning' | 'skippable' | string
  action?: string
}

export function SetupStepList({ steps }: { steps: SetupStepItem[] }) {
  if (!steps.length) return null
  return (
    <ul className="mt-3 space-y-2">
      {steps.slice(0, 5).map(step => {
        const Icon = step.status === 'completed'
          ? CheckCircle2
          : step.status === 'warning'
            ? AlertTriangle
            : step.status === 'skippable'
              ? Circle
              : Wrench
        return (
          <li key={step.key} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Icon
              size={15}
              className={cn(
                'mt-0.5 flex-shrink-0',
                step.status === 'completed' && 'text-emerald-500',
                step.status === 'warning' && 'text-amber-500',
                step.status === 'skippable' && 'text-gray-400',
                (!step.status || step.status === 'missing') && 'text-amber-500'
              )}
            />
            <span>
              <span className="font-medium text-gray-800 dark:text-gray-100">{step.label}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {step.description}
                {!step.required ? ' Opsiyonel.' : ''}
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
