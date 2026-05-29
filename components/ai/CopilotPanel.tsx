'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { FileText, Loader2, MessageSquareText, Send, Sparkles, Wand2, X } from 'lucide-react'
import { aiCopilotService, type CopilotMode, type CopilotResponse } from '@/lib/services/ai'
import { useActionGuideContext } from './ActionGuideContext'
import { CopilotButton } from './CopilotButton'
import { CopilotMessage } from './CopilotMessage'

type CopilotEventDetail = {
  query?: string
  mode?: CopilotMode
}

export function CopilotPanel() {
  const pathname = usePathname()
  const { pageContext } = useActionGuideContext()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<CopilotMode>('action_guidance')
  const [response, setResponse] = useState<CopilotResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const context = useMemo(() => ({
    current_page: pageContext.currentPage || pathname,
    module_key: inferModuleKey(pageContext.currentPage || pathname),
    selected_entity_type: pageContext.selectedRecordType,
    selected_entity_id: pageContext.selectedRecordId,
    selected_record_status: pageContext.selectedRecordStatus,
    selected_record_label: typeof pageContext.record?.label === 'string' ? pageContext.record.label : undefined,
    include_audit: false,
    include_documents: true,
    include_action_center: true,
    extra_context: {
      route: pathname,
      ...pageContext.context,
    },
  }), [pageContext, pathname])

  const askCopilot = useCallback(async (nextQuery: string, nextMode = mode) => {
    const trimmed = nextQuery.trim()
    setOpen(true)
    setError(null)
    setLoading(true)
    try {
      const data = await aiCopilotService.query({
        ...context,
        query: trimmed || defaultQuery(nextMode),
        mode: nextMode,
      })
      setResponse(data)
    } catch (err) {
      setResponse(null)
      setError(err instanceof Error ? err.message : 'AI Copilot cevap veremedi.')
    } finally {
      setLoading(false)
    }
  }, [context, mode])

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<CopilotEventDetail>).detail
      const nextMode = detail?.mode || mode
      setMode(nextMode)
      setOpen(true)
      if (detail?.query) {
        setQuery(detail.query)
        void askCopilot(detail.query, nextMode)
      }
    }
    window.addEventListener('eden:open-ai-copilot', onOpen)
    return () => window.removeEventListener('eden:open-ai-copilot', onOpen)
  }, [askCopilot, mode])

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    await askCopilot(query, mode)
  }

  return (
    <>
      <CopilotButton onClick={() => setOpen(true)} />
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 lg:items-stretch lg:justify-end">
          <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950 lg:my-4 lg:mr-4 lg:max-h-[calc(100dvh-2rem)] lg:w-[440px] lg:rounded-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                  <Sparkles size={16} className="text-emerald-600 dark:text-emerald-300" />
                  AI Copilot
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Ozetler, onerir ve taslak hazirlar; resmi veri degistirmez.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                aria-label="AI Copilot kapat"
              >
                <X size={17} />
              </button>
            </header>

            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
              <ModeButton active={mode === 'record_summary'} icon={<MessageSquareText size={14} />} label="Ozet" onClick={() => setMode('record_summary')} />
              <ModeButton active={mode === 'action_guidance'} icon={<Wand2 size={14} />} label="Aksiyon" onClick={() => setMode('action_guidance')} />
              <ModeButton active={mode === 'document_intelligence'} icon={<FileText size={14} />} label="Belge" onClick={() => setMode('document_intelligence')} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <Loader2 size={16} className="animate-spin" />
                  Copilot context ve guvenlik kontrollerini hazirliyor.
                </div>
              ) : null}
              {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100">{error}</div> : null}
              {!loading && !error && response ? <CopilotMessage response={response} context={context} /> : null}
              {!loading && !error && !response ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Bulundugunuz sayfa, secili kayit, yetkiler ve readiness durumuna gore cevap veririm. Kritik islemlerde sadece sihirbaza yonlendiririm.
                </div>
              ) : null}
            </div>

            <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={placeholderForMode(mode)}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-700 dark:focus:ring-emerald-950"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                  aria-label="AI Copilot'a sor"
                >
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'}`}
    >
      {icon}
      {label}
    </button>
  )
}

function inferModuleKey(pathname: string | null | undefined) {
  const path = (pathname || '').toLowerCase()
  if (path.includes('/ik')) return 'hr'
  if (path.includes('/satis-sonrasi')) return 'after_sales'
  if (path.includes('/crm')) return 'crm'
  if (path.includes('/raporlama')) return 'reporting'
  if (path.includes('/muhasebe')) return 'accounting'
  if (path.includes('/belgeler')) return 'documents'
  if (path.includes('/sistem/otomasyon')) return 'automation'
  if (path.includes('/sistem')) return 'settings'
  if (path.includes('/sirket')) return 'companies'
  return undefined
}

function defaultQuery(mode: CopilotMode) {
  if (mode === 'record_summary') return 'Bu kaydi ozetle'
  if (mode === 'document_intelligence') return 'Belgeyi ozetle ve alan oner'
  return 'Bu sayfada ne yapabilirim?'
}

function placeholderForMode(mode: CopilotMode) {
  if (mode === 'record_summary') return 'Bu kaydi ozetle...'
  if (mode === 'document_intelligence') return 'Belge turu ve alanlari oner...'
  return 'Ne yapmak istiyorsunuz?'
}
