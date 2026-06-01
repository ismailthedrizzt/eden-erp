'use client'

import { Sparkles } from 'lucide-react'

interface CopilotButtonProps {
  onClick?: () => void
}

export function CopilotButton({ onClick }: CopilotButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick || (() => window.dispatchEvent(new CustomEvent('eden:open-action-guide')))}
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50 dark:border-emerald-300/20 dark:bg-slate-950 dark:text-emerald-200 dark:hover:bg-emerald-400/10 lg:bottom-5"
      aria-label="AI rehberine sor"
      title="AI Rehberine Sor"
    >
      <Sparkles size={20} />
    </button>
  )
}
