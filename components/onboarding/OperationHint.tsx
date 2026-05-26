'use client'

import { ArrowRight, HelpCircle, Info, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { readCachedUiPreferences, syncUiPreferencesPatch } from '@/lib/user-state/client'
import { cn } from '@/lib/utils'

interface OperationHintProps {
  id: string
  title?: string
  message: string
  variant?: 'info' | 'warning' | 'locked' | 'draft' | 'operation'
  tone?: 'info' | 'warning' | 'success'
  actionLabel?: string
  actionKey?: string
  wizardKey?: string
  disabledReason?: string
  onAction?: () => void
  className?: string
}

export function OperationHint({
  id,
  title,
  message,
  variant,
  tone,
  actionLabel,
  actionKey,
  wizardKey,
  disabledReason,
  onAction,
  className,
}: OperationHintProps) {
  const initiallyDismissed = useMemo(() => readCachedUiPreferences().dismissedOperationHints?.includes(id), [id])
  const [dismissed, setDismissed] = useState(initiallyDismissed)
  const resolvedTone = tone || getToneForVariant(variant)

  if (dismissed) return null

  const dismiss = () => {
    const preferences = readCachedUiPreferences()
    const dismissedOperationHints = Array.from(new Set([...(preferences.dismissedOperationHints || []), id]))
    setDismissed(true)
    syncUiPreferencesPatch({ dismissedOperationHints }).catch(() => undefined)
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        resolvedTone === 'info' && 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100',
        resolvedTone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
        resolvedTone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100',
        className
      )}
    >
      {variant === 'locked' ? <HelpCircle size={17} className="mt-0.5 shrink-0" /> : <Info size={17} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        <div className={title ? 'mt-1 leading-5' : 'leading-5'}>{message}</div>
        {disabledReason ? (
          <div className="mt-2 rounded-md border border-current/20 bg-white/45 px-2.5 py-1.5 text-xs leading-5 dark:bg-black/10">
            {disabledReason}
          </div>
        ) : null}
        {(actionLabel || actionKey) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {actionLabel ? (
              <button
                type="button"
                disabled={Boolean(disabledReason)}
                onClick={() => {
                  if (disabledReason) return
                  if (onAction) {
                    onAction()
                    return
                  }
                  openActionGuide(actionKey, wizardKey, actionLabel)
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-current/25 bg-white/55 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55 dark:bg-black/10 dark:hover:bg-black/20"
              >
                {actionLabel}
                <ArrowRight size={13} />
              </button>
            ) : null}
            {actionKey ? (
              <button
                type="button"
                onClick={() => openActionGuide(actionKey, wizardKey, actionLabel)}
                className="text-xs font-semibold underline-offset-2 hover:underline"
              >
                Bu işlem nasıl yapılır?
              </button>
            ) : null}
          </div>
        )}
      </div>
      <button type="button" onClick={dismiss} className="rounded-md p-1 opacity-70 transition hover:bg-white/50 hover:opacity-100" aria-label="Bilgiyi kapat">
        <X size={14} />
      </button>
    </div>
  )
}

function getToneForVariant(variant?: OperationHintProps['variant']): OperationHintProps['tone'] {
  if (variant === 'warning' || variant === 'locked') return 'warning'
  if (variant === 'draft' || variant === 'operation') return 'success'
  return 'info'
}

function openActionGuide(actionKey?: string, wizardKey?: string, label?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('eden:open-action-guide', {
    detail: {
      query: label ? `${label} nasıl yapılır?` : '',
      actionKey,
      wizardKey,
    },
  }))
}
