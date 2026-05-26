'use client'

import { useRouter } from 'next/navigation'
import type { ActionGuideAction } from '@/lib/ai/actionGuide'
import { tenantRequestHeaders } from '@/lib/tenancy/client'
import { cn } from '@/lib/utils'

interface ActionGuideCommandButtonProps {
  action: ActionGuideAction
  onExecuted?: () => void
}

export function ActionGuideCommandButton({ action, onExecuted }: ActionGuideCommandButtonProps) {
  const router = useRouter()
  const disabledReason = action.disabled_reason || action.reason

  const execute = async () => {
    if (action.disabled) return

    await fetch('/api/ai/action-guide/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tenantRequestHeaders(),
      },
      body: JSON.stringify(action),
    }).catch(() => undefined)

    if (action.action_type === 'show_help') {
      window.dispatchEvent(new CustomEvent('eden:open-action-guide'))
      onExecuted?.()
      return
    }

    if (action.action_type === 'start_create' || action.action_type === 'open_wizard' || action.action_type === 'focus_record') {
      window.dispatchEvent(new CustomEvent('eden:action-guide-command', { detail: action }))
    }

    if (action.target_page) router.push(action.target_page)
    onExecuted?.()
  }

  return (
    <button
      type="button"
      onClick={execute}
      disabled={Boolean(action.disabled)}
      title={action.disabled ? disabledReason : undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition',
        action.disabled
          ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-900/40'
      )}
    >
      {action.label}
    </button>
  )
}
