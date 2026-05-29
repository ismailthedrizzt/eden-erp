'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { aiCopilotService, type SuggestedAction } from '@/lib/services/ai'

interface CopilotActionCardProps {
  action: SuggestedAction
  context?: Record<string, unknown>
}

export function CopilotActionCard({ action, context = {} }: CopilotActionCardProps) {
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function previewAction() {
    setLoading(true)
    setError(null)
    try {
      const payload = await aiCopilotService.actionPreview({
        ...context,
        action_key: action.action_key,
        form_payload: {},
      })
      setPreview(payload)
      if (action.enabled && action.target_page && action.safety_level <= 1) {
        window.location.href = action.target_page
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action preview hazirlanamadi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
          {action.enabled ? <ShieldCheck size={16} /> : <Lock size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{action.label}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {action.enabled
              ? action.requires_confirmation
                ? 'Taslak/preview hazirlar; kayit icin kullanici onayi gerekir.'
                : 'Guvenli yonlendirme aksiyonu.'
              : action.disabled_reason || 'Bu aksiyon kullanilamaz.'}
          </div>
          {preview ? (
            <div className="mt-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              Preview hazir. Mutation: {String(preview.mutates_data ?? false)}
            </div>
          ) : null}
          {error ? <div className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</div> : null}
        </div>
        <button
          type="button"
          onClick={previewAction}
          disabled={loading || !action.enabled}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
          {action.safety_level <= 1 ? 'Ac' : 'Preview'}
        </button>
      </div>
    </div>
  )
}
