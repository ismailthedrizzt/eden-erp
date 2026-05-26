'use client'

import { ArrowRight, PlayCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export type SetupActionItem = {
  key: string
  label: string
  description: string
  action_type: 'navigate' | 'open_setup_wizard' | 'run_setup_action' | 'show_help'
  target_page?: string
  disabled?: boolean
  disabled_reason?: string
}

export function SetupActionButton({ action }: { action: SetupActionItem }) {
  const router = useRouter()
  const Icon = action.action_type === 'run_setup_action' ? PlayCircle : ArrowRight
  return (
    <button
      type="button"
      disabled={action.disabled}
      onClick={() => {
        if (action.disabled) return
        if (action.target_page) router.push(action.target_page)
      }}
      title={action.disabled ? action.disabled_reason : action.description}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors',
        action.disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
          : 'border-eden-blue/30 bg-eden-blue/10 text-eden-blue hover:bg-eden-blue/15 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200'
      )}
    >
      {action.label}
      <Icon size={14} />
    </button>
  )
}
