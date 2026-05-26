'use client'

import { CheckCircle2 } from 'lucide-react'

export type SetupStepItem = {
  key: string
  label: string
  description: string
  required: boolean
}

export function SetupStepList({ steps }: { steps: SetupStepItem[] }) {
  if (!steps.length) return null
  return (
    <ul className="mt-3 space-y-2">
      {steps.slice(0, 3).map(step => (
        <li key={step.key} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
          <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-emerald-500" />
          <span>
            <span className="font-medium text-gray-800 dark:text-gray-100">{step.label}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">{step.description}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
