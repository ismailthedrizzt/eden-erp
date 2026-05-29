'use client'

import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { aiCopilotService } from '@/lib/services/ai'

interface CopilotFeedbackProps {
  historyId?: string | null
}

export function CopilotFeedback({ historyId }: CopilotFeedbackProps) {
  const [sent, setSent] = useState(false)

  async function send(rating: 'positive' | 'negative') {
    setSent(true)
    await aiCopilotService.feedback({ history_id: historyId, rating }).catch(() => setSent(false))
  }

  if (sent) return <span className="text-xs text-emerald-600 dark:text-emerald-300">Geri bildirim alindi.</span>

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => void send('positive')}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
        aria-label="AI cevabi faydali"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => void send('negative')}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
        aria-label="AI cevabi faydali degil"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  )
}
