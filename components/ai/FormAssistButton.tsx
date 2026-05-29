'use client'

import { Wand2 } from 'lucide-react'
import type { CopilotMode } from '@/lib/services/ai'

interface FormAssistButtonProps {
  query?: string
  mode?: CopilotMode
}

export function FormAssistButton({ query = 'Bu form icin taslak alanlar oner', mode = 'form_assist' }: FormAssistButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('eden:open-ai-copilot', { detail: { query, mode } }))}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-300/20 dark:text-emerald-200 dark:hover:bg-emerald-400/10"
    >
      <Wand2 size={15} />
      AI ile doldur
    </button>
  )
}
