'use client'

import { Send, Sparkles, X } from 'lucide-react'
import type { ActionGuideResult } from '@/lib/ai/actionGuide'
import { ActionGuideResultCard } from './ActionGuideResultCard'

export type ActionGuideChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  result?: ActionGuideResult | null
  error?: string | null
}

interface ActionGuidePanelProps {
  open: boolean
  result: ActionGuideResult | null
  messages?: ActionGuideChatMessage[]
  loading?: boolean
  error?: string | null
  query?: string
  onClose: () => void
  onQueryChange?: (query: string) => void
  onSubmitQuery?: () => void
}

export function ActionGuidePanel({
  open,
  result,
  messages = [],
  loading,
  error,
  query = '',
  onClose,
  onQueryChange,
  onSubmitQuery,
}: ActionGuidePanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 md:inset-x-auto md:bottom-20 md:right-4 md:w-[min(92vw,520px)] md:rounded-xl">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div>
          <div className="text-sm font-semibold text-gray-950 dark:text-white">AI Rehberine Sor</div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">AI Islem Rehberi, yapmak istediginiz isi dogru sayfa ve sihirbaza cevirir.</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-200" aria-label="Rehberi kapat">
          <X size={16} />
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmitQuery?.()
        }}
        className="border-b border-gray-100 px-4 py-3 dark:border-gray-800"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={query}
            onChange={event => onQueryChange?.(event.target.value)}
            placeholder="AI rehberine sorun..."
            rows={2}
            className="max-h-28 min-h-12 flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-eden-navy dark:text-gray-100 dark:focus:border-emerald-700 dark:focus:ring-emerald-950"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="AI rehberine sor"
          >
            <Send size={16} />
          </button>
        </div>
      </form>

      <div className="max-h-[calc(88dvh-9.5rem)] overflow-y-auto p-4 md:max-h-[68vh]">
        {!!messages.length && (
          <div className="space-y-3">
            {messages.map(message => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                {message.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl bg-emerald-600 px-3 py-2 text-sm leading-5 text-white">
                    {message.text}
                  </div>
                ) : message.error ? (
                  <div className="max-w-[92%] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
                    {message.error}
                  </div>
                ) : message.result ? (
                  <div className="max-w-full">
                    <ActionGuideResultCard result={message.result} onActionExecuted={onClose} />
                  </div>
                ) : (
                  <div className="max-w-[92%] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    {message.text}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                  <Sparkles size={15} className="animate-pulse" />
                  Rehber yanit hazirliyor...
                </div>
              </div>
            )}
          </div>
        )}
        {!messages.length && loading && <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">Rehber yanit hazirliyor...</div>}
        {!messages.length && error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">{error}</div>}
        {!messages.length && !loading && !error && result && <ActionGuideResultCard result={result} onActionExecuted={onClose} />}
      </div>
    </div>
  )
}
