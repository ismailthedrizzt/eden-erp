'use client'

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { CopilotResponse } from '@/lib/services/ai'
import { CopilotActionCard } from './CopilotActionCard'
import { CopilotFeedback } from './CopilotFeedback'

interface CopilotMessageProps {
  response: CopilotResponse
  context?: Record<string, unknown>
}

export function CopilotMessage({ response, context }: CopilotMessageProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200">
            <Info size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{response.title}</div>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{response.answer}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Mode: {response.mode}</span>
              <span>Confidence: {Math.round(response.confidence * 100)}%</span>
              <CopilotFeedback historyId={response.history_id} />
            </div>
          </div>
        </div>
      </div>

      {response.warnings.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} />
            Uyarilar
          </div>
          {response.warnings.slice(0, 4).map(item => <div key={item}>{item}</div>)}
        </div>
      ) : null}

      {response.blocking_reasons.length ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100">
          {response.blocking_reasons.slice(0, 4).map(item => <div key={item}>{item}</div>)}
        </div>
      ) : null}

      {response.form_suggestions.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
            <CheckCircle2 size={15} />
            Form onerileri
          </div>
          <div className="grid gap-2">
            {response.form_suggestions.map(item => (
              <div key={item.field} className="rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
                <div className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</div>
                <div className="mt-1 break-words text-slate-600 dark:text-slate-300">{String(item.suggested_value)}</div>
                <div className="mt-1 text-slate-500">{item.reason}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {response.document_findings.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">Belge bulgulari</div>
          <div className="grid gap-2">
            {response.document_findings.map(item => (
              <div key={item.field} className="rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
                <div className="font-semibold text-slate-700 dark:text-slate-200">{item.field}: {String(item.value)}</div>
                {item.warning ? <div className="mt-1 text-amber-700 dark:text-amber-200">{item.warning}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {response.suggested_actions.length ? (
        <div className="space-y-2">
          {response.suggested_actions.map(action => (
            <CopilotActionCard key={action.action_key} action={action} context={context} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
