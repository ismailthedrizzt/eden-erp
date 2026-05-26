'use client'

import { Info, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { readCachedUiPreferences, syncUiPreferencesPatch } from '@/lib/user-state/client'
import { cn } from '@/lib/utils'

interface OperationHintProps {
  id: string
  title?: string
  message: string
  tone?: 'info' | 'warning' | 'success'
  className?: string
}

export function OperationHint({ id, title, message, tone = 'info', className }: OperationHintProps) {
  const initiallyDismissed = useMemo(() => readCachedUiPreferences().dismissedOperationHints?.includes(id), [id])
  const [dismissed, setDismissed] = useState(initiallyDismissed)

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
        tone === 'info' && 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100',
        className
      )}
    >
      <Info size={17} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        <div className={title ? 'mt-1 leading-5' : 'leading-5'}>{message}</div>
      </div>
      <button type="button" onClick={dismiss} className="rounded-md p-1 opacity-70 transition hover:bg-white/50 hover:opacity-100" aria-label="Bilgiyi kapat">
        <X size={14} />
      </button>
    </div>
  )
}
