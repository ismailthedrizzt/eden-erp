'use client'

import { ArrowRight, CheckCircle2, Info } from 'lucide-react'
import type { ActionGuideResult } from '@/lib/ai/actionGuide'
import { ActionGuideCommandButton } from './ActionGuideCommandButton'

interface ActionGuideResultCardProps {
  result: ActionGuideResult
  onActionExecuted?: () => void
}

export function ActionGuideResultCard({ result, onActionExecuted }: ActionGuideResultCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          {result.can_start_now ? <CheckCircle2 size={18} /> : <Info size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-950 dark:text-white">{result.title}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              %{Math.round(result.confidence * 100)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">{result.explanation}</p>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {result.steps.map((step, index) => (
          <li key={`${step}-${index}`} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {!!result.blocking_reasons.length && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          {result.blocking_reasons[0]}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {result.suggested_actions.map((action, index) => (
          <ActionGuideCommandButton key={`${action.label}-${index}`} action={action} onExecuted={onActionExecuted} />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
        <ArrowRight size={12} />
        Rehber veri değiştirmez; işlem sihirbazında siz onay vermeden kayıt güncellenmez.
      </div>
    </div>
  )
}
